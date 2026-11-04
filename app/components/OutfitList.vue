<template>
    <el-container v-loading="loading">
        <el-main class="outfit-list-main">
            <h2>{{ $t('menu.outfit') }}</h2>
            <el-alert v-if="failed" :title="$t('archive.load_failed')" type="error" :closable="false" />
            <template v-else>
                <el-input v-model="search" :placeholder="$t('archive.search')" :aria-label="$t('archive.search')" clearable class="outfit-search" />
                <el-tabs v-model="selected_type">
                    <el-tab-pane v-for="type in OUTFIT_TYPES" :key="type" :name="type" :label="$t(`outfit.types.${type}`)" />
                </el-tabs>
                <el-text type="info">{{ $t('archive.count', { count: filtered.length }) }}</el-text>
                <el-empty v-if="!loading && !filtered.length" :description="$t('archive.no_results')" />
                <archive-pagination :page="page" :size="page_size" :total="filtered.length" @change="change_page" />
                <div ref="grid" class="outfit-grid" :style="{ '--entry-width': `${layout.minWidth}px` }">
                    <outfit-list-entry v-for="item in visible" :key="item.id" :item="item" />
                </div>
                <archive-pagination :page="page" :size="page_size" :total="filtered.length" @change="change_page" />
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { OUTFIT_TYPES, type OutfitPage } from '@inteyvat-wiki/wiki-contracts/outfit';
import { filter_outfit_pages, outfit_selected_type, OUTFIT_LIST_LAYOUT } from '~~/shared/outfit';
import { list_page_size, list_page_anchor, list_anchor_page, list_grid_columns } from '~~/shared/list_pagination';

const route = useRoute(), router = useRouter();
const { locale } = useI18n();
const items = ref<OutfitPage[]>([]);
const grid = ref<HTMLElement>();
const page_size = ref(48);
const loading = ref(true), failed = ref(false);
const query_search = () => typeof route.query.search === 'string' ? route.query.search : '';
const search = ref(query_search());
function update_query(values: Record<string, string | undefined>) {
    return router.replace({ query: { ...route.query, search: search.value || undefined,
        ...(Object.hasOwn(values, 'page') && values.page === undefined ? { size: undefined } : {}), ...values } });
}
// Preserve text while an earlier route update is still in flight.
let search_request = 0, search_pending = false, syncing_search = false;
function sync_search() {
    syncing_search = true;
    search.value = query_search();
    syncing_search = false;
}
watch(search, value => {
    if (syncing_search) return;
    const current = ++search_request;
    search_pending = true;
    void update_query({ search: value || undefined, page: undefined }).finally(() => {
        if (current === search_request) { search_pending = false; sync_search(); }
    });
}, { flush: 'sync' });
watch(() => route.query.search, () => { if (!search_pending) sync_search(); }, { flush: 'sync' });
const selected_type = computed({
    get: () => outfit_selected_type(route.query.type),
    set: (value: string) => {
        const type = outfit_selected_type(value);
        if (type !== selected_type.value) void update_query({ type, page: undefined });
    },
});
const layout = computed(() => OUTFIT_LIST_LAYOUT[selected_type.value]);
const filtered = computed(() => filter_outfit_pages(items.value, selected_type.value, search.value));
const page = computed(() => list_anchor_page(list_page_anchor(route.query.page, route.query.size, filtered.value.length), page_size.value));
const visible = computed(() => filtered.value.slice((page.value - 1) * page_size.value, page.value * page_size.value));
async function change_page(value: number) {
    await update_query({ page: value === 1 ? undefined : String(value), size: String(page_size.value) });
    await nextTick();
    if ((grid.value?.getBoundingClientRect().top ?? 0) < 0) grid.value?.scrollIntoView({ block: 'start' });
}
function measure_capacity() {
    if (!grid.value?.clientWidth) return;
    const tracks = getComputedStyle(grid.value).gridTemplateColumns.trim().split(/\s+/).length;
    page_size.value = list_page_size(list_grid_columns(tracks, []), layout.value.layout);
}
let resize_observer: ResizeObserver | undefined;
watch([grid, selected_type, filtered], async () => {
    await nextTick();
    resize_observer?.disconnect();
    if (grid.value) resize_observer?.observe(grid.value);
    measure_capacity();
}, { flush: 'post' });
let request = 0, mounted = false;
async function load() {
    const current = ++request;
    loading.value = true;
    failed.value = false;
    items.value = [];
    try {
        const result = await get_outfit_pages();
        if (current === request) items.value = result;
    } catch { if (current === request) failed.value = true; }
    finally { if (current === request) loading.value = false; }
}
watch(locale, () => { if (mounted) void load(); });
onMounted(() => {
    mounted = true;
    let width = 0;
    resize_observer = new ResizeObserver(entries => {
        const current = entries[0]?.contentRect.width || 0;
        if (current !== width) { width = current; measure_capacity(); }
    });
    window.addEventListener('resize', measure_capacity);
    void load();
});
onBeforeUnmount(() => { mounted = false; ++request; resize_observer?.disconnect(); window.removeEventListener('resize', measure_capacity); });
useHead({ title: computed(() => $t('menu.outfit')) });
</script>

<style scoped>
.outfit-list-main { min-width: 0; width: 100%; box-sizing: border-box; }
.outfit-search { max-width: 600px; margin-bottom: 20px; }
.outfit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--entry-width)), 1fr));
    gap: 16px; margin-top: 14px; align-items: stretch; scroll-margin-top: 24px; }
</style>
