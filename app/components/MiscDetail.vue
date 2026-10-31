<template>
    <el-container v-loading="loading">
        <el-main class="misc-detail-main">
            <el-alert v-if="failed" :title="$t('archive.load_failed')" type="error" :closable="false" />
            <template v-if="item">
                <el-page-header @back="navigateTo(localePath('/misc'))">
                    <template #content><inline-text v-if="has_name" :text="item.name" /><span v-else>{{ fallback_name }}</span></template>
                    <template #extra><el-button :icon="ElIconDocumentCopy" @click="copy_all">{{ $t('archive.copy_all') }}</el-button></template>
                </el-page-header>
                <entry-media-layout class="misc-section" :images="images" :size="gallery_size('misc', item.type)" :image-label="image_label">
                    <div class="misc-main">
                        <el-card>
                            <el-descriptions :column="1" border class="misc-fields">
                                <template #title>
                                    <inline-text v-if="has_name" class="misc-title" :text="item.name" />
                                    <span v-else class="misc-title">{{ fallback_name }}<el-text type="info" size="small" class="missing-name">{{ $t('misc.missing_name') }}</el-text></span>
                                </template>
                                <el-descriptions-item :label="$t('archive.type')" :min-width="'100px'">{{ $t(`misc.types.${item.type}`) }}</el-descriptions-item>
                                <el-descriptions-item v-if="item.tutorial_category" :label="$t('misc.tutorial_category')">{{ $t(`misc.tutorial_categories.${item.tutorial_category}`) }}</el-descriptions-item>
                                <el-descriptions-item v-for="(section, index) in content.fields" :key="index" :min-width="'100px'">
                                    <template #label><inline-text v-if="section.title" :text="section.title" /><span v-else>{{ section_label(section.kind) }}</span></template>
                                    <inline-text :text="section.text" />
                                </el-descriptions-item>
                                <el-descriptions-item v-for="(relations, role) in relation_groups" :key="`relation:${role}`" :label="relation_label(String(role))" :min-width="'100px'">
                                    <el-space wrap class="relation-links">
                                        <template v-for="(relation, index) in relations" :key="index">
                                            <inline-text :text="(misc_relation_path(relation) && inline_link_text(relation.category, relation.id, 'icon')) || relation.name || relation.id" />
                                        </template>
                                    </el-space>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-card>
                        <entry-text-blocks :blocks="content.blocks" :section-label="section_label" />
                    </div>
                </entry-media-layout>
                <misc-messages v-if="item.message_thread" :thread="item.message_thread" class="misc-section" />
                <el-card v-if="item.loading_situations?.length" class="misc-section">
                    <template #header>{{ $t('misc.loading.title') }}</template>
                    <misc-loading-situations :situations="item.loading_situations" />
                </el-card>
                <misc-achievements v-if="item.type === 'achievement_group'" :item="item" class="misc-section" />
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { MiscItem, MiscRelation, MiscImage } from '~/types/misc';
import { display_images, entry_plain_text, entry_detail_content } from '~~/shared/archive_display';
import { misc_copy_text, misc_relation_path, misc_image_label_key, misc_relation_label_key, misc_section_label_key, misc_placeholder_name, is_misc_collection_member } from '~/utils/misc';
import { copy_dialog_text } from '~/utils/dialog_copy';
import { inline_link_text } from '~~/shared/inline_link';
import { get_entry_page } from '~/utils/entry_page';
import { gallery_size } from '~~/shared/gallery_layout';

const { t, te } = useI18n();
const localePath = useLocalePath(), route = useRoute();
const item = ref<MiscItem>();
const loading = ref(true), failed = ref(false);
const has_name = computed(() => !!entry_plain_text(item.value?.name || ''));
const fallback_name = computed(() => item.value ? misc_placeholder_name(t(`misc.types.${item.value.type}`), `${item.value.type}-${item.value.source.id}`) : '');
const images = computed(() => display_images((item.value?.images || []).filter(image =>
    item.value?.type !== 'graeae_message' && (item.value?.type !== 'loading_tip' || image.kind !== 'loading_background'))));
const content = computed(() => item.value ? entry_detail_content(item.value) : { fields: [], blocks: [] });
const image_label = (image: MiscImage, index: number) => {
    const key = misc_image_label_key(item.value!.type, image);
    return key === 'archive.image_alt' ? '' : t(key, { index: index + 1 });
};
const relation_groups = computed(() => {
    const groups: Record<string, MiscRelation[]> = Object.create(null);
    for (const relation of item.value?.relations || []) {
        if (item.value && is_misc_collection_member(item.value, relation)) continue;
        (groups[relation.role] ||= []).push(relation);
    }
    return groups;
});
function section_label(kind?: string) {
    if (!kind) return t('archive.description');
    const key = misc_section_label_key(kind);
    return key ? t(key) : te(`archive.sections.${kind}`) ? t(`archive.sections.${kind}`) : t('archive.description');
}
function relation_label(role: string) {
    const key = misc_relation_label_key(role);
    return key ? t(key) : te(`archive.roles.${role}`) ? t(`archive.roles.${role}`) : t('archive.roles.related');
}
async function copy_all() {
    if (item.value) await copy_dialog_text(misc_copy_text(item.value, '', relation_label, fallback_name.value, (key, values) => t(key, values || {})), key => t(key));
}
let request = 0;
onMounted(() => watch(() => route.params.name, async name => {
    const current = ++request;
    item.value = undefined;
    loading.value = true;
    failed.value = false;
    try {
        const result = await get_entry_page(String(name), get_misc_pages, get_misc_item, 'misc');
        if (current === request) item.value = result;
    }
    catch { if (current === request) failed.value = true; }
    finally { if (current === request) loading.value = false; }
}, { immediate: true }));
useHead({ title: computed(() => item.value ? entry_plain_text(item.value.name) || fallback_name.value : t('menu.misc')) });
</script>

<style scoped>
.misc-detail-main { min-width: 0; width: 100%; box-sizing: border-box; }
.misc-section { margin-top: 20px; }
.misc-main { min-width: 0; }
.misc-title { font-weight: bold; font-size: 1.2em; overflow-wrap: anywhere; }
.missing-name { display: block; font-weight: normal; margin-top: 8px; }
.misc-fields :deep(.el-descriptions__label) { vertical-align: top; }
.relation-links { max-width: 100%; overflow-wrap: anywhere; }
</style>
