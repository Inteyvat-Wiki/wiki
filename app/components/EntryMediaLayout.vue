<template>
    <div class="entry-media-layout" :class="{ 'with-gallery': images.length }" :style="{ '--gallery-width': `${width}px` }">
        <div class="entry-media-main"><slot /></div>
        <archive-gallery v-if="images.length" :images="images" :image-label="imageLabel" :size="size" @width="width = $event" />
    </div>
</template>

<script setup lang="ts">
import type { ArchiveImage } from '~/types/archive';
import type { GallerySize } from '~~/shared/gallery_layout';
const props = defineProps<{ images: ArchiveImage[]; size: GallerySize; imageLabel?: (image: ArchiveImage, index: number) => string }>();
const width = ref(props.size.width);
watch(() => `${props.size.width}:${props.images.map(image => image.url).join('\n')}`, () => { width.value = props.size.width; });
</script>

<style scoped>
.entry-media-layout { display: grid; gap: 20px; align-items: start; min-width: 0; }
.entry-media-layout.with-gallery { grid-template-columns: minmax(0, 1fr) min(45%, var(--gallery-width)); }
.entry-media-main { min-width: 0; }
.archive-gallery { position: sticky; top: 20px; min-width: 0; width: 100%; box-sizing: border-box; }
@media (max-width: 1199px) {
    .entry-media-layout.with-gallery { grid-template-columns: minmax(0, 1fr); }
    .archive-gallery { position: static; grid-row: 1; width: min(100%, var(--gallery-width)); justify-self: center; }
}
</style>
