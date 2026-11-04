<template><span hidden></span></template>

<script setup lang="ts">
import type { Map as LeafletMap } from 'leaflet';
import type { MapOverlay } from '@inteyvat-wiki/wiki-contracts/map';
import { image_affine, map_edge_mask, map_image_corners } from '~~/shared/map_display';

const props = defineProps<{ map: LeafletMap; overlay: MapOverlay; focused?: boolean }>();
let element: HTMLImageElement | undefined;
function paint() {
    if (!element) return;
    const pane = props.focused ? props.map.getPane('map-focus-pane')! : props.map.getPanes().overlayPane;
    if (element.parentElement !== pane) pane.appendChild(element);
    // No independent corner rounding: preserve the affine quadrilateral at every zoom.
    const project = map_image_corners(props.overlay).map(point => {
        const p = props.map.project([point.x, -point.y], props.map.getZoom());
        const origin = props.map.getPixelOrigin(); return { x: p.x - origin.x, y: p.y - origin.y };
    });
    element.style.transform = image_affine(project);
    element.style.zIndex = String(props.overlay.zIndex);
    element.style.opacity = String(props.overlay.opacity ?? 1);
    element.style.mixBlendMode = props.overlay.blend === 'additive' ? 'plus-lighter' : 'normal';
    element.style.maskImage = map_edge_mask(props.overlay.edgeFade);
    element.style.maskComposite = 'intersect';
}
onMounted(() => {
    element = document.createElement('img');
    element.alt = props.overlay.label;
    element.draggable = false;
    element.dataset.mapOverlayId = props.overlay.id;
    if (props.overlay.layerId) element.dataset.mapFloorId = props.overlay.layerId;
    Object.assign(element.style, { position: 'absolute', width: '1000px', height: '1000px', maxWidth: 'none', maxHeight: 'none',
        transformOrigin: '0 0', pointerEvents: 'none', userSelect: 'none' });
    element.src = props.overlay.image;
    props.map.getPanes().overlayPane.appendChild(element);
    props.map.on('zoom viewreset', paint);
    paint();
});
watch(() => [props.overlay, props.focused], () => { if (element) { element.src = props.overlay.image; paint(); } });
onBeforeUnmount(() => { props.map.off('zoom viewreset', paint); element?.remove(); element = undefined; });
</script>
