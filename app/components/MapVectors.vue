<template><span hidden></span></template>

<script setup lang="ts">
import type { Map as LeafletMap, LayerGroup, Layer, Path } from 'leaflet';
import type { MapArea, MapMarker, MapRegion, MapScene } from '@inteyvat-wiki/wiki-contracts/map';
import { map_layer_label } from '~~/shared/map_display';

const props = defineProps<{ map: LeafletMap; markers: MapMarker[]; regions: MapRegion[]; areas: MapArea[];
    layer: string; layerMarkerIcons?: MapScene['layerMarkerIcons'];
    states: Record<string, string>; zoom: number; recordLabel: string; excludedLabel: string; probeMode?:boolean }>();
const emit = defineEmits<{ (event: 'record', id: string): void }>();
let leaflet: typeof import('leaflet') | undefined, group: LayerGroup | undefined, disposed = false;
const drawn = new Map<string, { signature: string; layer: Layer }>();
const colors: Record<MapMarker['kind'], string> = { teleport: '#6bc4dc', statue: '#f2e4a6', domain: '#90a6ef', point: '#8bd2d6',
    viewpoint: '#a8dfaa', place: '#f6e2b8', npc: '#efa6c5', label: '#fff' };
function text(value: string) { const element = document.createElement('span'); element.textContent = value; return element; }
function record_popup(label: string, description: string, recordId?: string) {
    const popup = document.createElement('div');
    if (label) { const title = document.createElement('strong'); title.textContent = label; title.className = 'map-popup-title'; popup.append(title); }
    if (description) { const paragraph = document.createElement('p'); paragraph.textContent = description; paragraph.className = 'marker-description'; popup.append(paragraph); }
    if (recordId) { const button = document.createElement('button'); button.textContent = props.recordLabel; button.className = 'record-link';
        button.addEventListener('click', () => emit('record', recordId)); popup.append(button); }
    return popup;
}
const popup_options = { minWidth: 240, maxWidth: 300, maxHeight: 280,
    autoPanPaddingTopLeft: [20, 150] as [number, number], autoPanPaddingBottomRight: [20, 30] as [number, number] };
function marker_layer(marker: MapMarker, label: string, color: string, badge?: string) {
    const position: [number, number] = [marker.position.x, -marker.position.y];
    const radius = marker.kind === 'place' ? 2 : props.zoom < -3 ? 2 : 5;
    if (!marker.icon && !badge) return leaflet!.circleMarker(position, { radius, color, fillColor: color,
        fillOpacity: 0.9, weight: 1.5, pane: 'map-vector-pane', interactive:!props.probeMode });
    // These are exported image URLs. No game icon key or point-type lookup belongs here.
    const content = document.createElement('span'), fallback = document.createElement('span'), image = document.createElement('img');
    content.className = 'map-marker-image'; content.setAttribute('aria-hidden', 'true');
    Object.assign(content.style, { position: 'relative', display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' });
    Object.assign(fallback.style, { width: `${radius * 2}px`, height: `${radius * 2}px`, border: `1.5px solid ${color}`, borderRadius: '50%', backgroundColor: color, opacity: '0.9' });
    image.alt = ''; image.draggable = false;
    Object.assign(image.style, { position: 'absolute', width: '100%', height: '100%', objectFit: 'contain', visibility: 'hidden' });
    image.addEventListener('load', () => { image.style.visibility = 'visible'; fallback.style.visibility = 'hidden'; }, { once: true });
    image.addEventListener('error', () => { image.style.visibility = 'hidden'; fallback.style.visibility = 'visible'; }, { once: true });
    content.append(fallback);
    if (marker.icon) { content.append(image); image.src = marker.icon; }
    if (badge) {
        const badgeImage = document.createElement('img');
        badgeImage.className = 'map-marker-layer-badge'; badgeImage.alt = ''; badgeImage.draggable = false;
        Object.assign(badgeImage.style, { position: 'absolute', width: '12px', height: '12px', right: '0', bottom: '0', pointerEvents: 'none' });
        badgeImage.addEventListener('error', () => badgeImage.remove(), { once: true });
        badgeImage.src = badge; content.append(badgeImage);
    }
    return leaflet!.marker(position, { pane: 'map-vector-pane', title: label, interactive:!props.probeMode,
        icon: leaflet!.divIcon({ html: content, className: 'map-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] }) });
}
function paint() {
    if (!leaflet || !group || disposed) return;
    const present = new Set<string>();
    const keep = (id: string, signature: string, create: () => Layer) => {
        present.add(id); const previous = drawn.get(id);
        if (previous?.signature === signature) return previous.layer;
        if (previous) group!.removeLayer(previous.layer);
        const layer = create(); layer.addTo(group!); drawn.set(id, { signature, layer });
        return layer;
    };
    const area_paths: Path[] = [];
    for (const area of [...props.areas].sort((a, b) => a.level - b.level)) {
        const style = { color: area.level === 1 ? '#e4b85c' : '#70cbd4', weight: area.level === 1 ? 2.5 : 1.25,
            fillOpacity: area.level === 1 ? 0.025 : 0.045, pane: 'map-vector-pane', interactive:!props.probeMode };
        // Each part is filled separately; treating them as one polygon would turn overlapping parts into holes.
        area.polygons.forEach((polygon, index) => area_paths.push(keep(`area:${area.id}:${index}`,
            JSON.stringify([polygon.points, style, area.label, area.description, area.recordId, props.recordLabel]), () => {
                const layer = leaflet!.polygon(polygon.points.map(point => [point.x, -point.y]), style);
                if (area.label) layer.bindTooltip(text(area.label));
                layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.13 }));
                layer.on('mouseout', () => layer.setStyle({ fillOpacity: style.fillOpacity }));
                return layer.bindPopup(record_popup(area.label, area.description, area.recordId), popup_options);
            }) as Path));
    }
    for (const region of props.regions) {
        const color = region.kind === 'playable-boundary' ? '#d95b65' : region.kind === 'layer-extent' ? '#7eb9eb' : '#dfbf78';
        const label = [region.label, region.extent === 'outside' ? props.excludedLabel : '', region.description].filter(Boolean).join(' · ');
        const boundary = region.kind === 'playable-boundary';
        const style = { color, weight: 1.5, fill: !boundary, fillOpacity: 0.04, pane: 'map-vector-pane', interactive:!boundary && !props.probeMode };
        region.rings.forEach((ring, index) => keep(`region:${region.id}:${index}`, JSON.stringify([ring, style, label]),
            () => {
                const layer = leaflet!.polygon(ring.map(point => [point.x, -point.y]), style);
                return label && !boundary ? layer.bindTooltip(text(label)) : layer;
            }));
        (region.circles || []).forEach((circle, index) => keep(`circle:${region.id}:${index}`, JSON.stringify([circle, style, label]),
            () => leaflet!.circle([circle.center.x, -circle.center.y], { ...style, radius: circle.radius }).bindTooltip(text(label))));
    }
    for (const marker of props.markers) {
        const label = map_layer_label(marker, props.states), color = colors[marker.kind];
        if (marker.kind === 'label') {
            if (label) keep(`marker:${marker.id}`, JSON.stringify([marker, label]), () => leaflet!.tooltip({
                permanent: true, direction: 'center', className: 'map-place-label', interactive: false,
            }).setLatLng([marker.position.x, -marker.position.y]).setContent(text(label)));
            continue;
        }
        const badge = marker.layerId ? props.layerMarkerIcons?.[marker.layerId === props.layer ? 'active' : 'normal'] : undefined;
        const persistent = marker.labelMinZoom !== undefined && props.zoom >= marker.labelMinZoom;
        keep(`marker:${marker.id}`, JSON.stringify([marker, label, badge, props.zoom < -3, persistent, props.recordLabel, props.probeMode]), () => {
        const layer = marker_layer(marker, label, color, badge);
        if (label) layer.bindTooltip(text(label), { permanent: persistent,
            direction: marker.kind === 'place' ? 'top' : 'auto', ...(marker.icon ? { offset: [0, -14] as [number, number] } : {}),
            className: marker.kind === 'place' ? 'map-place-label' : '' });
        return layer.bindPopup(record_popup(label, marker.description, marker.recordId), popup_options);
        });
    }
    for (const [id, value] of drawn) if (!present.has(id)) { group.removeLayer(value.layer); drawn.delete(id); }
    // Share one Canvas for hit testing: a separate transparent Canvas would intercept
    // pointer events intended for lower panes. Keep secondary areas above primary areas,
    // and both below markers, even when a cached layer is reused after a toggle.
    for (let i = area_paths.length - 1; i >= 0; i--) area_paths[i]!.bringToBack();
}
onMounted(async () => {
    // Use the same ESM instance as Vue Leaflet; mixing its Bounds classes with
    // the package's CommonJS entry breaks Canvas intersection checks.
    leaflet = await import('leaflet/dist/leaflet-src.esm');
    if (disposed) return;
    const pane = props.map.getPane('map-vector-pane') || props.map.createPane('map-vector-pane'); pane.style.zIndex = '600';
    group = leaflet.layerGroup().addTo(props.map); paint();
});
watch(() => [props.markers, props.regions, props.areas, props.states, props.zoom, props.recordLabel, props.excludedLabel, props.probeMode, props.layer, props.layerMarkerIcons], paint, { flush: 'post' });
onBeforeUnmount(() => { disposed = true; group?.remove(); group = undefined; drawn.clear(); });
</script>
