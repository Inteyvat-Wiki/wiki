<template>
    <NuxtLink :to="localePath(`/${category}/${item.id}`)" class="archive-entry" :class="[`layout-${layout}`, `entry-${category}-${item.type}`, { 'has-image': icon, 'avatar-entry': avatar }]">
        <el-card shadow="hover">
            <el-image v-if="icon && !title_avatar" :src="icon" :alt="name" fit="contain" loading="lazy" class="entry-image" @error="image_failed = true" />
            <div class="entry-content">
                <h3 :title="name">
                    <el-image v-if="title_avatar && icon" :src="icon" alt="" fit="cover" loading="lazy"
                        class="round_icon entry-title-avatar" @error="image_failed = true" />
                    <span class="entry-title-text"><inline-text v-if="has_name" :text="item.name" /><span v-else>{{ name }}</span></span>
                </h3>
                <el-text v-if="category === 'misc' && !has_name" size="small" type="info">{{ $t('misc.missing_name') }}</el-text>
                <div v-if="showType" class="entry-type"><el-tag size="small" effect="plain">{{ $t(`${namespace}.types.${item.type}`) }}</el-tag></div>
                <div v-if="layout !== 'index' && summary" class="entry-summary"><inline-text :text="item.description" /></div>
            </div>
        </el-card>
    </NuxtLink>
</template>

<script setup lang="ts">
import type { DirectoryPage } from '~/types/archive';
import { archive_list_icon, archive_list_layout } from '~/utils/archive_list_layout';
import { archive_has_title_avatar } from '~~/shared/archive';
import { entry_plain_text } from '~~/shared/archive_display';
import { misc_placeholder_name } from '~/utils/misc';

const props = defineProps<{ category: string; item: DirectoryPage; showType: boolean }>();
const localePath = useLocalePath();
const namespace = computed(() => props.category === 'misc' ? 'misc' : 'archive');
const has_name = computed(() => !!entry_plain_text(props.item.name));
const name = computed(() => entry_plain_text(props.item.name) || (props.category === 'misc'
    ? misc_placeholder_name($t(`misc.types.${props.item.type}`), props.item.id) : $t('archive.unnamed')));
const image_failed = ref(false);
watch(() => props.item.icon, () => { image_failed.value = false; });
const icon = computed(() => archive_list_icon(props.category, props.item, image_failed.value));
const layout = computed(() => archive_list_layout(props.category, props.item.type, !!icon.value));
const title_avatar = computed(() => archive_has_title_avatar(props.category, props.item.type));
const avatar = computed(() => props.category === 'misc' && ['profile_picture', 'profile_frame'].includes(props.item.type));
const summary = computed(() => {
    const text = entry_plain_text(props.item.description);
    return text && text !== entry_plain_text(props.item.name) ? text : '';
});
</script>

<style scoped>
.archive-entry { grid-column: span 4; min-width: 0; color: inherit; text-decoration: none; }
.archive-entry :deep(.el-card) { height: 100%; box-sizing: border-box; }
.archive-entry :deep(.el-card__body) { display: flex; align-items: start; gap: 12px; padding: 14px; }
.entry-content { min-width: 0; flex: 1; }
h3 { margin: 0; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
.entry-tcg-player h3, .entry-tcg-stage h3, .entry-serenitea-companion h3 { display: flex; align-items: center; gap: 10px; }
.entry-title-text { min-width: 0; }
.entry-title-avatar { width: 32px; height: 32px; flex: 0 0 32px; }
.entry-type { margin-top: 6px; }
.entry-summary { margin-top: 6px; color: var(--el-text-color-regular); font-size: 14px; line-height: 1.6;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.entry-image { width: 72px; height: 80px; flex: 0 0 72px; }
.archive-entry:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 4px; border-radius: var(--el-border-radius-base); }
.layout-gallery { grid-column: span 2; }
.layout-gallery :deep(.el-card__body) { display: flex; flex-direction: column; gap: 12px; padding: 18px 16px 16px; }
.layout-gallery .entry-image { display: block; width: 100%; height: auto; aspect-ratio: 1; flex: none; }
.layout-gallery .entry-content { width: 100%; text-align: center; }
.layout-gallery h3 { min-height: 3em; font-size: 14px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.layout-gallery .entry-summary { text-align: start; font-size: 13px; }
.entry-serenitea-furniture.layout-gallery .entry-image { width: 80%; max-width: 120px; align-self: center; }
.layout-index { grid-column: span 3; }
.layout-index :deep(.el-card__body) { padding: 12px 16px; }
.entry-serenitea-companion.layout-index { grid-column: auto; width: 100%; max-width: 240px; }
.entry-serenitea-companion.layout-index :deep(.el-card__body) { min-height: 80px; box-sizing: border-box; padding: 16px; }
.entry-serenitea-companion h3 { gap: 12px; font-size: 16px; }
.entry-serenitea-companion .entry-title-avatar { width: 48px; height: 48px; flex-basis: 48px; }
.layout-compact { grid-column: span 6; }
.layout-compact .entry-image { width: 40px; height: 40px; flex-basis: 40px; }
.layout-portrait { grid-column: span 2; }
.layout-portrait :deep(.el-card__body), .layout-landscape :deep(.el-card__body) { display: block; }
.layout-portrait .entry-image { display: block; width: 100%; height: 150px; margin-bottom: 8px; }
.layout-portrait h3 { font-size: 14px; }
.avatar-entry .entry-image { height: 80px; }
.layout-landscape { grid-column: span 6; }
.layout-landscape .entry-image { display: block; width: 100%; height: 110px; margin-bottom: 10px; }
.entry-serenitea-realm.layout-landscape .entry-image,
.entry-serenitea-suite.layout-landscape .entry-image { height: clamp(150px, 14vw, 190px); }
.entry-misc-namecard.layout-landscape { grid-column: span 4; }
.entry-misc-namecard .entry-image { height: 85px; }
.entry-misc-expedition.layout-media .entry-image { width: 160px; height: 72px; flex-basis: 160px; }
.entry-miliastra-suit.layout-media { grid-column: span 6; }
.entry-miliastra-suit .entry-image { width: 96px; height: 112px; flex-basis: 96px; }
.entry-miliastra-suit .entry-summary { -webkit-line-clamp: 3; }
.entry-miliastra-suit.layout-media .entry-image { width: 120px; height: 144px; flex-basis: 120px; }
.entry-miliastra-costume.layout-gallery .entry-image,
.entry-miliastra-catalog.layout-gallery .entry-image { width: 80%; max-width: 120px; align-self: center; }
.entry-miliastra-hall.layout-landscape .entry-image { height: clamp(150px, 14vw, 190px); }
.layout-text { grid-column: span 12; }
.layout-text .entry-content { display: grid; grid-template-columns: minmax(160px, 24%) minmax(0, 1fr); column-gap: 20px; align-items: start; }
.layout-text h3 { grid-column: 1; grid-row: 1 / span 2; }
.layout-text .entry-type { grid-column: 2; margin: 0 0 4px; }
.layout-text .entry-summary { grid-column: 2; margin-top: 0; }
.layout-text .entry-image { width: 80px; height: 56px; flex-basis: 80px; }
.entry-misc-loading_tip.layout-text .entry-content { display: block; }
.entry-misc-loading_tip .entry-summary { margin-top: 6px; -webkit-line-clamp: 3; }
.entry-misc-loading_tip .entry-type { margin-top: 6px; }
@media (max-width: 1199px) {
    .layout-media { grid-column: span 6; }
    .layout-gallery { grid-column: span 3; }
    .layout-portrait { grid-column: span 3; }
    .entry-misc-namecard.layout-landscape { grid-column: span 6; }
}
@media (max-width: 767px) {
    .archive-entry { grid-column: span 12; }
    .entry-misc-namecard.layout-landscape, .entry-miliastra-suit.layout-media { grid-column: span 12; }
    .layout-index { grid-column: span 6; }
    .layout-gallery { grid-column: span 4; }
    .layout-gallery :deep(.el-card__body) { gap: 10px; padding: 14px 12px; }
    .layout-portrait { grid-column: span 4; }
    .layout-portrait .entry-image { height: 120px; }
    .avatar-entry .entry-image { height: 64px; }
    .layout-text .entry-content { display: block; }
    .layout-text .entry-type, .layout-text .entry-summary { margin-top: 5px; }
}
@media (max-width: 419px) { .layout-portrait, .layout-gallery { grid-column: span 6; } }
/* Use content width rather than viewport width: the shared sidebar also takes space. */
@container archive-grid (min-width: 960px) { .entry-misc-loading_tip.layout-text { grid-column: span 6; } }
@container archive-grid (max-width: 1079px) { .layout-gallery { grid-column: span 3; } }
@container archive-grid (max-width: 719px) { .layout-gallery { grid-column: span 4; } }
@container archive-grid (max-width: 479px) { .layout-gallery { grid-column: span 6; } }
@container archive-grid (max-width: 239px) { .layout-gallery { grid-column: span 12; } }
@container archive-grid (max-width: 479px) {
    .entry-misc-expedition.layout-media .entry-image { width: 120px; height: 56px; flex-basis: 120px; }
    .entry-miliastra-suit :deep(.el-card__body) { display: block; }
    .entry-miliastra-suit.layout-media .entry-image { display: block; width: min(100%, 120px); height: auto; aspect-ratio: 5 / 6; margin: 0 auto 12px; }
}
@container archive-grid (max-width: 239px) {
    .entry-misc-expedition :deep(.el-card__body) { flex-direction: column; }
    .entry-misc-expedition.layout-media .entry-image { flex: none; width: 100%; height: auto; aspect-ratio: 64 / 25; }
}
</style>
