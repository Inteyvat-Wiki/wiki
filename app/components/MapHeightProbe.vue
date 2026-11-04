<template><span hidden></span></template>
<script setup lang="ts">
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import type { MapAreaPolygon, MapCoordinate } from '@inteyvat-wiki/wiki-contracts/map';
const props = defineProps<{ map:LeafletMap; point:MapCoordinate; radius:number; polygon?:MapAreaPolygon }>();
let leaflet: typeof import('leaflet') | undefined, group:LayerGroup | undefined, disposed = false;
function paint() {
    if (!leaflet || !group || disposed) return;
    group.clearLayers();
    const style = { pane:'map-height-pane', interactive:false, color:'#e6a6ff', weight:2, fillOpacity:0.08 };
    if (props.polygon) leaflet.polygon(props.polygon.points.map(point => [point.x, -point.y]), {...style, fillOpacity:0.2}).addTo(group);
    leaflet.circle([props.point.x, -props.point.y], {...style, radius:props.radius, dashArray:'6 4'}).addTo(group);
    leaflet.circleMarker([props.point.x, -props.point.y], {...style, radius:4, fillOpacity:1}).addTo(group);
}
onMounted(async () => {
    leaflet = await import('leaflet/dist/leaflet-src.esm'); if (disposed) return;
    const pane = props.map.getPane('map-height-pane') || props.map.createPane('map-height-pane');
    pane.style.zIndex = '650'; pane.style.pointerEvents = 'none';
    group = leaflet.layerGroup().addTo(props.map); paint();
});
watch(() => [props.point, props.radius, props.polygon], paint);
onBeforeUnmount(() => { disposed = true; group?.remove(); });
</script>
