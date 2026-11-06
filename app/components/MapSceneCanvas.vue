<template>
    <client-only>
        <LMap :key="scene.id" :use-global-leaflet="false" crs="Simple" :center="center" :zoom="-3" :min-zoom="-8" :max-zoom="3"
            :options="{ attributionControl: false, preferCanvas: true, zoomAnimation: false }" class="scene-canvas" @ready="ready">
            <template v-if="map">
                <MapImageLayer v-for="overlay in overlays" :key="overlay.id" :map="map" :overlay="overlay" :focused="focus_active && overlay.kind === 'layer' && overlay.layerId === layer" />
                <MapFocusShade v-if="focus_active" :map="map" />
                <template v-for="region in regions" :key="region.id"><MapMeshLayer v-if="region.mesh" :map="map" :mesh="region.mesh" /></template>
                <MapVectors :map="map" :markers="markers" :regions="regions" :areas="areas" :states="states" :zoom="zoom"
                    :layer="layer" :layer-marker-icons="scene.layerMarkerIcons"
                    :probe-mode="inspectHeight" :record-label="$t('map.open_record')" :excluded-label="$t('map.excluded_extent')" @record="emit('record', $event)" />
                <MapHeightProbe v-if="inspectHeight && heightPoint" :map="map" :point="heightPoint" :radius="heightRadius ?? 100" :polygon="heightPolygon" />
                <MapMaskGroups v-if="inspectMasks" :map="map" :groups="scene.maskGroups || []" :selected="selectedMask || ''" @select="emit('mask', $event)" />
                <MapLocationPin v-if="locationPoint" :map="map" :point="locationPoint" :label="$t('map.location')" />
            </template>
        </LMap>
    </client-only>
</template>

<script setup lang="ts">
import type { Map as LeafletMap, LeafletMouseEvent } from 'leaflet';
import type { MapAreaPolygon, MapCoordinate, MapMarker, MapScene } from '@inteyvat-wiki/wiki-contracts/map';
import { map_visible, map_layer_context } from '~~/shared/map_display';

const props = defineProps<{ scene: MapScene; states: Record<string, string>; layer: string; markerKinds: string[];
    showRegions: boolean; areaLevels: number[]; showBoundaries: boolean; showLayerExtents: boolean; showUnknown: boolean; allLevels: boolean; target?: { x: number; y: number } | null; targetBounds?: MapScene['bounds'] | null;
    inspectHeight?:boolean; heightPoint?:MapCoordinate | null; heightRadius?:number; heightPolygon?:MapAreaPolygon; inspectMasks?:boolean; selectedMask?:string; locationPoint?:MapCoordinate | null }>();
const emit = defineEmits<{ (event: 'record', value: string): void; (event: 'center', value: MapCoordinate): void; (event:'probe', value:MapCoordinate):void; (event:'mask', value:string):void }>();
const map = shallowRef<LeafletMap>();
const zoom = ref(-3);
const viewport = ref<{ minX: number; maxX: number; minY: number; maxY: number }>();
const center = computed<[number, number]>(() => [(props.scene.bounds[0].x + props.scene.bounds[1].x) / 2, -(props.scene.bounds[0].y + props.scene.bounds[1].y) / 2]);
const visible = (condition: MapMarker['condition']) => map_visible(condition, props.states, props.showUnknown);
const overlaps = (bounds: MapScene['bounds']) => !viewport.value || (Math.max(bounds[0].x, bounds[1].x) >= viewport.value.minX
    && Math.min(bounds[0].x, bounds[1].x) <= viewport.value.maxX && Math.max(bounds[0].y, bounds[1].y) >= viewport.value.minY
    && Math.min(bounds[0].y, bounds[1].y) <= viewport.value.maxY);
const context_layers = computed(() => map_layer_context(props.scene.layers, props.layer, props.states, props.showUnknown));
const context_ids = computed(() => new Set(context_layers.value.map(layer => layer.id)));
const scene_overlays = computed(() => props.scene.overlays.filter(overlay => visible(overlay.condition)
    && (overlay.kind !== 'boundary' || props.showBoundaries)
    && (overlay.kind !== 'layer' || !!overlay.layerId && context_ids.value.has(overlay.layerId))));
const focus_active = computed(() => scene_overlays.value.some(overlay => overlay.kind === 'layer' && overlay.layerId === props.layer));
const overlays = computed(() => scene_overlays.value.filter(overlay => overlaps(overlay.bounds)));
const markers = computed(() => props.scene.markers.filter(marker => props.markerKinds.includes(marker.kind) && visible(marker.condition)
    && (marker.minZoom === undefined || zoom.value >= marker.minZoom)
    && (marker.kind === 'label' ? zoom.value >= (marker.labelMinZoom ?? -2) : zoom.value >= -3 || marker.kind === 'statue')
    && (props.allLevels || !marker.layerId || marker.layerId === props.layer) && overlaps([marker.position, marker.position])));
const regions = computed(() => props.scene.regions.filter(region => visible(region.condition)
    && (region.kind === 'region' ? props.showRegions : region.kind === 'layer-extent' ? props.showLayerExtents : props.showBoundaries)
    && (region.kind !== 'layer-extent' || props.allLevels || region.layerId === props.layer)));
// Area footprints are independent of floor selection, player state and height.
const areas = computed(() => props.showRegions ? (props.scene.areas || []).filter(area => props.areaLevels.includes(area.level)) : []);
function update_viewport() {
    if (!map.value) return;
    zoom.value = map.value.getZoom();
    const bounds = map.value.getBounds().pad(0.15);
    viewport.value = { minX: bounds.getSouth(), maxX: bounds.getNorth(), minY: -bounds.getEast(), maxY: -bounds.getWest() };
    const center = map.value.getCenter();
    emit('center', { x: center.lat, y: -center.lng });
}
function ready(value: LeafletMap) {
    // Keep all context artwork below the same shade, with the selected floor above it.
    for (const [name, zIndex] of [['map-dim-pane', '405'], ['map-focus-pane', '410']] as const) {
        const pane = value.getPane(name) || value.createPane(name);
        pane.style.zIndex = zIndex; pane.style.pointerEvents = 'none';
    }
    map.value = value;
    if (props.targetBounds) value.fitBounds(process_coordinates(props.targetBounds), { padding: [50, 50], maxZoom: 0 });
    else if (props.target) value.setView([props.target.x, -props.target.y], -1);
    else value.fitBounds(process_coordinates(props.scene.bounds), { padding: [24, 24], maxZoom: -1 });
    value.on('moveend zoomend', update_viewport);
    value.on('click', probe);
    update_viewport();
}
function probe(event:LeafletMouseEvent) {
    if (props.inspectHeight) emit('probe', {x:event.latlng.lat, y:-event.latlng.lng});
}
watch(() => [props.target, props.targetBounds] as const, ([target, bounds], [previousTarget, previousBounds]) => {
    if (!map.value) return;
    // A search location takes priority when it also changes the selected floor.
    if (bounds && bounds !== previousBounds) { map.value.fitBounds(process_coordinates(bounds), { padding: [50, 50], maxZoom: 0 }); return; }
    if (target && target !== previousTarget) { map.value.setView([target.x, -target.y], Math.max(map.value.getZoom(), -1)); return; }
    // The floor picker follows the camera, so selecting a floor must not move it.
});
watch(() => props.inspectHeight, enabled => { if (enabled) map.value?.closePopup(); });
onBeforeUnmount(() => { map.value?.off('moveend zoomend', update_viewport); map.value?.off('click', probe); });
</script>

<style scoped>
.scene-canvas { height: 100%; width: 100%; background: #24282b; }
:deep(.marker-description) { white-space: pre-wrap; max-width: 320px; }
:deep(.map-popup-title) { display: block; margin-bottom: 6px; }
:deep(.record-link) { border: 0; background: none; padding: 0; color: #23819b; cursor: pointer; }
:deep(.map-place-label) { background: transparent; border: 0; box-shadow: none; color: #fff; font-weight: 600; text-shadow: 0 1px 3px #191919, 0 0 3px #191919; }
:deep(.map-place-label::before) { display: none; }
</style>
