<template>
    <el-card class="archive-gallery">
        <el-image v-if="selected" :key="selected.url" :src="selected.url" :alt="image_label(selected_index)"
            :preview-src-list="image_urls" :initial-index="selected_index" :title="$t('archive.image_zoom')"
            preview-teleported hide-on-click-modal fit="contain" class="gallery-main" :style="image_style" @load="image_loaded">
            <template #placeholder><el-text type="info">{{ $t('normal.loading') }}</el-text></template>
            <template #error><el-text type="info">{{ $t('archive.image_failed') }}</el-text></template>
        </el-image>
        <el-text v-if="images.length > 1 && selected_label" class="gallery-label">{{ selected_label }}</el-text>
        <div v-if="images.length > 1" class="gallery-thumbnails" :aria-label="$t('archive.images')">
            <button v-for="(image, index) in images" :key="image.url" type="button" class="gallery-thumbnail"
                :class="{ active: index === selected_index }" :aria-pressed="index === selected_index"
                :aria-label="$t('archive.select_image', { index: index + 1 })" @click="selected_index = index">
                <el-image :src="image.url" :alt="image_label(index)" fit="contain" loading="lazy" @load="image_loaded">
                    <template #error><span>{{ index + 1 }}</span></template>
                </el-image>
            </button>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import type { ArchiveImage } from '~/types/archive';
import { archive_images } from '~~/shared/archive';
import { gallery_size, gallery_panel_width, gallery_image_style, type GallerySize, type ImageDimensions } from '~~/shared/gallery_layout';

const props = defineProps<{ images: ArchiveImage[]; imageLabel?: (image: ArchiveImage, index: number) => string; size?: GallerySize }>();
const emit = defineEmits<{ width: [value: number] }>();
const size = computed(() => props.size || gallery_size('', ''));
const dimensions = ref<Record<string, ImageDimensions>>({});
const images = computed(() => archive_images(props.images));
const image_urls = computed(() => images.value.map(image => image.url));
const selected_index = ref(0);
const selected = computed(() => images.value[selected_index.value]);
const image_style = computed(() => gallery_image_style(size.value, selected.value ? dimensions.value[selected.value.url] : undefined));
const panel_width = computed(() => gallery_panel_width(size.value, Object.values(dimensions.value)));
watch(panel_width, value => emit('width', value), { immediate: true });
function image_loaded(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.naturalWidth || !target.naturalHeight) return;
    const source = images.value.find(image => new URL(image.url, document.baseURI).href === (target.currentSrc || target.src));
    if (source) dimensions.value[source.url] = { width: target.naturalWidth, height: target.naturalHeight };
}
const selected_label = computed(() => selected.value && props.imageLabel?.(selected.value, selected_index.value));
const image_label = (index: number) => (images.value[index] && props.imageLabel?.(images.value[index]!, index))
    || $t('archive.image_alt', { index: index + 1 });
watch(() => image_urls.value.join('\n'), () => { selected_index.value = 0; dimensions.value = {}; });
</script>

<style scoped>
.gallery-main { display: flex; width: min(100%, var(--gallery-image-width)); height: auto;
    aspect-ratio: var(--gallery-image-ratio); max-height: min(55vh, var(--gallery-image-height)); margin: 0 auto;
    align-items: center; justify-content: center; border-radius: 4px; background: var(--el-fill-color-extra-light); cursor: zoom-in; }
.gallery-main :deep(.el-image__inner) { width: 100%; height: 100%; object-fit: contain; }
.gallery-thumbnails { display: grid; grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); gap: 8px;
    max-height: 168px; overflow-y: auto; padding: 2px; margin-top: 12px; }
.gallery-thumbnail { padding: 4px; border: 1px solid var(--el-border-color); border-radius: 4px;
    background: var(--el-fill-color-extra-light); cursor: pointer; min-width: 0; height: 72px; }
.gallery-thumbnail.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.gallery-thumbnail:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 1px; }
.gallery-thumbnail .el-image { width: 100%; height: 100%; }
.gallery-label { display: block; margin-top: 12px; overflow-wrap: anywhere; }
</style>
