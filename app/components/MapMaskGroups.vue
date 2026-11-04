<template><span hidden></span></template>

<script setup lang="ts">
import type { Map as LeafletMap, LayerGroup, Marker } from 'leaflet';
import type { MapMaskGroup } from '@inteyvat-wiki/wiki-contracts/map';
const props = defineProps<{ map: LeafletMap; groups: MapMaskGroup[]; selected: string }>();
const emit = defineEmits<{ (event: 'select', id: string): void }>();
let leaflet: typeof import('leaflet') | undefined, layer: LayerGroup | undefined, disposed = false;
const drawn = new Map<string, { marker: Marker; button: HTMLButtonElement }>();
function paint() {
    if (!leaflet || !layer || disposed) return;
    const present = new Set(props.groups.map(group => group.id));
    for (const [id, entry] of drawn) if (!present.has(id)) { layer.removeLayer(entry.marker); drawn.delete(id); }
    for (const group of props.groups) {
        let entry = drawn.get(group.id);
        if (!entry) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'map-mask-group-marker';
            button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
            leaflet.DomEvent.disableClickPropagation(button);
            button.addEventListener('click', event => { event.stopPropagation(); emit('select', group.id); });
            const marker = leaflet.marker([group.position.x, -group.position.y], {
                pane: 'map-mask-groups-pane', keyboard: false, bubblingMouseEvents: false,
                icon: leaflet.divIcon({ html: button, className: 'map-mask-group-icon', iconSize: [32, 32], iconAnchor: [16, 16] }),
            }).addTo(layer);
            entry = { marker, button }; drawn.set(group.id, entry);
        }
        entry.marker.setLatLng([group.position.x, -group.position.y]);
        entry.button.title = group.label; entry.button.setAttribute('aria-label', group.label);
        entry.button.setAttribute('aria-pressed', String(group.id === props.selected));
    }
}
onMounted(async () => {
    leaflet = await import('leaflet/dist/leaflet-src.esm'); if (disposed) return;
    const pane = props.map.getPane('map-mask-groups-pane') || props.map.createPane('map-mask-groups-pane');
    pane.style.zIndex = '660';
    layer = leaflet.layerGroup().addTo(props.map); paint();
});
watch(() => [props.groups, props.selected], paint);
onBeforeUnmount(() => { disposed = true; layer?.remove(); drawn.clear(); });
</script>

<style>
.map-mask-group-icon { pointer-events:none !important; }
.map-mask-group-marker { display:flex; align-items:center; justify-content:center; width:32px; height:32px; padding:0; border:2px solid #e7d8ae; border-radius:50%; background:#403d52; color:#f8e8bd; box-shadow:0 2px 6px #0008; cursor:pointer; pointer-events:auto; }
.map-mask-group-marker:hover, .map-mask-group-marker[aria-pressed="true"] { background:#715985; border-color:#fff0c5; transform:scale(1.12); }
.map-mask-group-marker:focus-visible { outline:3px solid #d8bcff; outline-offset:3px; }
</style>
