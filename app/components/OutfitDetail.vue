<template>
    <el-container v-loading="loading">
        <el-main class="outfit-detail-main">
            <el-alert v-if="failed" :title="$t('archive.load_failed')" type="error" :closable="false" />
            <template v-if="page">
                <el-page-header @back="navigateTo(localePath({ path: '/outfit', query: { type: page.type } }))">
                    <template #content><inline-text :text="page.name" /></template>
                </el-page-header>
                <entry-media-layout v-for="{ item, images, id } in sections" :key="id" class="outfit-section"
                    :images="images" :size="outfit_gallery_size(item.type, images)" :image-label="() => entry_plain_text(item.name)">
                    <el-card>
                        <el-descriptions :column="1" border>
                            <template #title><inline-text class="outfit-title" :text="item.name" /></template>
                            <el-descriptions-item :label="$t('archive.type')" :min-width="'100px'">{{ $t(`outfit.types.${item.type}`) }}</el-descriptions-item>
                            <el-descriptions-item v-if="item.description" :label="$t('archive.description')"><inline-text :text="item.description" /></el-descriptions-item>
                            <el-descriptions-item v-if="item.character" :label="$t('outfit.character')">
                                <inline-text :text="character_text(item)" />
                            </el-descriptions-item>
                            <el-descriptions-item v-if="item.weapon_type" :label="$t('outfit.weapon_type')">{{ $t(`common.${item.weapon_type}`) }}</el-descriptions-item>
                            <el-descriptions-item v-if="item.is_default" :label="$t('outfit.appearance')">{{ $t('outfit.default') }}</el-descriptions-item>
                            <el-descriptions-item v-if="item.sources.length" :label="$t('outfit.sources')">
                                <div v-for="(source, index) in item.sources" :key="index"><inline-text :text="source" /></div>
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>
                    <el-card v-if="item.story" class="outfit-section">
                        <template #header>{{ $t('outfit.story') }}</template>
                        <normal-text :text="item.story" :border="true" />
                    </el-card>
                </entry-media-layout>
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { OutfitItem, OutfitPage } from '@inteyvat-wiki/wiki-contracts/outfit';
import { inline_link_text } from '@inteyvat-wiki/wiki-contracts/inline_link';
import { outfit_detail_images, outfit_gallery_size } from '~~/shared/outfit';
import { entry_plain_text } from '~~/shared/archive_display';
import { get_page_data } from '~/utils/page';
const route = useRoute(), localePath = useLocalePath();
const { locale } = useI18n();
const page = ref<OutfitPage>();
const items = ref<OutfitItem[]>([]);
const loading = ref(true), failed = ref(false);
const sections = computed(() => {
    const ids = [...new Set([...(page.value?.items || []), ...(page.value?.related_items || [])])];
    return items.value.map((item, index) => ({ item, id: ids[index]!, images: outfit_detail_images(item) }));
});
const name = computed(() => entry_plain_text(page.value?.name || ''));
function character_text(item: OutfitItem) {
    const character = item.character;
    return character?.id ? inline_link_text('character', character.id, 'icon') || character.name : character?.name || '';
}
let request = 0, mounted = false;
async function load() {
    const current = ++request;
    loading.value = true;
    failed.value = false;
    page.value = undefined;
    items.value = [];
    try {
        const id = route.params.id;
        if (typeof id !== 'string') throw new Error('Missing outfit ID');
        const result = await get_page_data(id, get_outfit_pages, get_outfit_item);
        if (current === request) { page.value = result.page; items.value = result.items; }
    } catch { if (current === request) failed.value = true; }
    finally { if (current === request) loading.value = false; }
}
watch([() => route.params.id, locale], () => { if (mounted) void load(); });
onMounted(() => { mounted = true; void load(); });
onBeforeUnmount(() => { mounted = false; ++request; });
useHead({ title: computed(() => name.value || $t('menu.outfit')) });
</script>

<style scoped>
.outfit-detail-main { min-width: 0; width: 100%; box-sizing: border-box; }
.outfit-section { margin-top: 20px; }
.outfit-title { font-weight: bold; font-size: 1.2em; overflow-wrap: anywhere; }
:deep(.el-descriptions__label) { vertical-align: top; }
:deep(.el-descriptions__content) { overflow-wrap: anywhere; }
</style>
