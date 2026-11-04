<template><span hidden></span></template>
<script setup lang="ts">
import type { Map as LeafletMap, Marker } from 'leaflet';
import type { MapCoordinate } from '@inteyvat-wiki/wiki-contracts/map';
const props = defineProps<{ map: LeafletMap; point: MapCoordinate; label: string }>();
let leaflet: typeof import('leaflet') | undefined, marker: Marker | undefined, disposed = false;
function paint() {
    if (!leaflet || disposed) return;
    marker?.remove();
    const label = `${props.label} · x: ${props.point.x}, z: ${props.point.y}`;
    const tooltip = document.createElement('span'); tooltip.textContent = label;
    marker = leaflet.marker([props.point.x, -props.point.y], {
        pane: 'map-location-pane', title: label, alt: label,
        icon: leaflet.divIcon({ className: 'map-location-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).bindTooltip(tooltip).addTo(props.map);
}
onMounted(async () => {
    leaflet = await import('leaflet/dist/leaflet-src.esm'); if (disposed) return;
    const pane = props.map.getPane('map-location-pane') || props.map.createPane('map-location-pane');
    pane.style.zIndex = '660'; paint();
});
watch(() => [props.point, props.label], paint);
onBeforeUnmount(() => { disposed = true; marker?.remove(); });
</script>
<style>
.map-location-pin { display: grid; place-items: center; }
.map-location-pin span { width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; background: #da8b22; box-shadow: 0 0 0 2px #302819, 0 0 0 7px #f7c35a55; }
</style>
