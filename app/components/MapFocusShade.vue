<template><span hidden></span></template>

<script setup lang="ts">
import type { Map as LeafletMap } from 'leaflet';

const props = defineProps<{ map: LeafletMap }>();
let element: HTMLDivElement | undefined;
function paint() {
    if (!element) return;
    const origin = props.map.containerPointToLayerPoint([0, 0]), size = props.map.getSize();
    element.style.transform = `translate(${origin.x}px,${origin.y}px)`;
    element.style.width = `${size.x}px`; element.style.height = `${size.y}px`;
}
onMounted(() => {
    element = document.createElement('div'); element.setAttribute('aria-hidden', 'true');
    Object.assign(element.style, { position: 'absolute', left: '0', top: '0', backgroundColor: '#000', opacity: '0.5', pointerEvents: 'none' });
    props.map.getPane('map-dim-pane')!.appendChild(element);
    props.map.on('move zoom viewreset resize', paint); paint();
});
onBeforeUnmount(() => { props.map.off('move zoom viewreset resize', paint); element?.remove(); element = undefined; });
</script>
