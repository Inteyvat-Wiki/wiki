<template>
    <el-container v-loading="loading">
        <el-main>
            <el-alert v-if="failed" :title="$t('archive.load_failed')" type="error" :closable="false" />
            <template v-if="item">
                <el-page-header @back="navigateTo(localePath(`/${category}`))">
                    <template #content><inline-text :text="item.name || $t('archive.unnamed')" /></template>
                    <template #extra><el-button :icon="ElIconDocumentCopy" @click="copy_all">{{ $t('archive.copy_all') }}</el-button></template>
                </el-page-header>
                <entry-media-layout class="archive-section" :images="images" :size="gallery_size(category, item.type)">
                    <div class="archive-main">
                        <el-card>
                            <el-descriptions :column="1" border class="archive-fields">
                                <template #title>
                                    <div class="archive-heading">
                                        <div v-if="title_image && !title_image_failed" class="round_icon archive-title-avatar">
                                            <el-image :src="title_image.url" :preview-src-list="[title_image.url]" alt="" fit="cover"
                                                preview-teleported hide-on-click-modal @error="title_image_failed = true" />
                                        </div>
                                        <inline-text class="archive-title" :text="item.name || $t('archive.unnamed')" />
                                    </div>
                                </template>
                                <el-descriptions-item :label="$t('archive.type')" :min-width="'100px'">{{ $t(`archive.types.${item.type}`) }}</el-descriptions-item>
                                <el-descriptions-item v-if="category === 'tcg' && item.card_type" :label="$t('archive.card_type')" :min-width="'100px'">
                                    <inline-text :text="item.card_type.name" />
                                </el-descriptions-item>
                                <el-descriptions-item v-if="category === 'tcg' && visible_tags.length" :label="$t('archive.card_tags')" :min-width="'100px'">
                                    <el-space wrap class="relation-tags"><el-tag v-for="tag in visible_tags" :key="tag.id" effect="plain"><inline-text :text="tag.name" /></el-tag></el-space>
                                </el-descriptions-item>
                                <el-descriptions-item v-for="(section, index) in content.fields" :key="index" :min-width="'100px'">
                                    <template #label><inline-text v-if="section.title" :text="section.title" /><span v-else>{{ section_label(section.kind) }}</span></template>
                                    <inline-text :text="section.text" />
                                </el-descriptions-item>
                                <el-descriptions-item v-for="(relations, role) in relation_groups" :key="`relation:${role}`" :label="relation_label(String(role))" :min-width="'100px'">
                                    <el-space wrap class="relation-links">
                                        <template v-for="relation in relations" :key="`${relation.category}:${relation.id}:${relation.role}`">
                                            <span><inline-text :text="inline_link_text(relation.category, relation.id, 'icon') || relation.name || $t('archive.unnamed')" /><span v-if="relation.count && relation.count > 1"> × {{ relation.count }}</span></span>
                                        </template>
                                    </el-space>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-card>
                        <entry-text-blocks :blocks="content.blocks" :section-label="section_label" />
                    </div>
                </entry-media-layout>
                <archive-dialogues v-if="Object.keys(item.talks).length" :item="item" class="archive-section" />
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { ArchiveCategory, ArchiveItem, ArchiveRelation } from '~/types/archive';
import { archive_detail_images, archive_title_image } from '~~/shared/archive';
import { inline_link_text } from '@inteyvat-wiki/wiki-contracts/inline_link';
import { entry_plain_text, entry_detail_content } from '~~/shared/archive_display';
import { entry_copy_text } from '~~/shared/entry_copy';
import { archive_sorted_tags } from '~~/shared/archive_tags';
import { copy_dialog_text, format_dialog } from '~/utils/dialog_copy';
import { get_entry_page } from '~/utils/entry_page';
import { gallery_size } from '~~/shared/gallery_layout';

const props = defineProps<{ category: ArchiveCategory }>();
const { t, te } = useI18n();
const localePath = useLocalePath(), route = useRoute();
const item = ref<ArchiveItem>();
const loading = ref(true), failed = ref(false);
const images = computed(() => archive_detail_images(props.category, item.value?.type || '', item.value?.images || []));
const title_image = computed(() => archive_title_image(props.category, item.value?.type || '', item.value?.images || []));
const title_image_failed = ref(false);
watch(() => title_image.value?.url, () => { title_image_failed.value = false; });
const content = computed(() => item.value ? entry_detail_content(item.value) : { fields: [], blocks: [] });
const visible_tags = computed(() => archive_sorted_tags(item.value?.tags || []));
const relation_groups = computed(() => {
    const groups: Record<string, ArchiveRelation[]> = Object.create(null);
    for (const relation of item.value?.relations || []) (groups[relation.role] ||= []).push(relation);
    return groups;
});
function section_label(kind?: string) {
    const key = `archive.sections.${kind}`;
    return kind && te(key) ? t(key) : t('archive.description');
}
function relation_label(role: string) {
    const key = `archive.roles.${role}`;
    if (te(key)) return t(key);
    if (te(`archive.${role}`)) return t(`archive.${role}`);
    return role;
}
async function copy_all() {
    if (!item.value) return;
    const value = item.value;
    const text = entry_copy_text(value, { fallback_name: t('archive.unnamed'), relation_label,
        metadata: value.card_type ? [value.card_type.name, ...visible_tags.value.map(tag => tag.name)] : [],
        dialogues: Object.values(value.talks).flatMap(talk => Object.values(talk.dialogs).map(format_dialog)),
    });
    await copy_dialog_text(text, key => $t(key));
}
onMounted(async () => {
    try { item.value = await get_entry_page(String(route.params.name), () => get_archive_pages(props.category), id => get_archive_item(props.category, id), props.category); }
    catch { failed.value = true; }
    finally { loading.value = false; }
});
useHead({ title: computed(() => entry_plain_text(item.value?.name || '') || $t(`menu.${props.category}`)) });
</script>

<style scoped>
.archive-section { margin-top: 20px; row-gap: 20px; }
.archive-main { min-width: 0; }
.archive-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
.archive-title-avatar { width: 50px; height: 50px; flex: 0 0 50px; }
.archive-title-avatar .el-image { width: 100%; height: 100%; cursor: zoom-in; }
.archive-title { font-weight: bold; font-size: 1.2em; overflow-wrap: anywhere; }
.archive-fields :deep(.el-descriptions__label) { vertical-align: top; }
.relation-tags { max-width: 100%; }
.relation-links { max-width: 100%; overflow-wrap: anywhere; }
.relation-tags :deep(.el-tag) { height: auto; max-width: 100%; padding: 6px 10px; white-space: normal; line-height: 1.5; }
</style>
