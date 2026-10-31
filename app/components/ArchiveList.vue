<template>
    <el-container v-loading="loading">
        <el-main class="archive-list-main">
            <h2>{{ $t(`menu.${category}`) }}</h2>
            <el-alert v-if="failed" :title="$t('archive.load_failed')" type="error" :closable="false" />
            <template v-else>
                <el-input v-model="search" :placeholder="$t(category === 'misc' ? 'misc.search' : 'archive.search')" clearable class="archive-search" />
                <el-tabs v-model="selected_type">
                    <el-tab-pane v-for="type in types" :key="type" :name="type" :label="$t(`${namespace}.types.${type}`)" />
                </el-tabs>
                <div v-if="tutorial_mode" class="archive-classifications">
                    <label class="classification-field"><span>{{ $t('misc.tutorial_category') }}</span>
                        <el-select v-model="tutorial_category" :aria-label="$t('misc.tutorial_category')">
                            <el-option :label="$t('archive.all')" value="all" />
                            <el-option v-for="category in TUTORIAL_CATEGORIES" :key="category" :value="category" :label="$t(`misc.tutorial_categories.${category}`)" />
                        </el-select>
                    </label>
                </div>
                <div v-if="classification_mode" class="archive-classifications">
                    <label class="classification-field">
                        <span>{{ $t(classification_group_label) }}</span>
                        <el-select v-model="classification_group" :aria-label="$t(classification_group_label)">
                            <el-option :label="$t('archive.all')" value="all" />
                            <el-option v-for="group in classification_groups" :key="group.id" :label="classification_label(group)" :value="group.id" />
                            <el-option v-if="unclassified_count" :label="$t('archive.unclassified')" value="unclassified" />
                        </el-select>
                    </label>
                    <label class="classification-field">
                        <span>{{ $t(classification_child_label) }}</span>
                        <el-select v-model="classification_child" :disabled="classification_group === 'all' || classification_group === 'unclassified'"
                            :aria-label="$t(classification_child_label)">
                            <el-option :label="$t('archive.all')" value="all" />
                            <el-option v-for="child in classification_children" :key="child.id" :label="classification_label(child)" :value="child.id" />
                        </el-select>
                    </label>
                </div>
                <div v-if="card_mode" class="archive-classifications">
                    <label class="classification-field">
                        <span>{{ $t('archive.card_type') }}</span>
                        <el-select v-model="card_type" :aria-label="$t('archive.card_type')">
                            <el-option :label="$t('archive.all')" value="all" />
                            <el-option v-for="option in card_types" :key="option.id" :label="option.name" :value="option.id" />
                        </el-select>
                    </label>
                    <label class="classification-field card-tags-field">
                        <span :title="$t('archive.card_tags_hint')">{{ $t('archive.card_tags') }}</span>
                        <el-cascader v-model="card_tags" :options="tag_groups" :props="archive_tag_cascader_props"
                            clearable filterable :show-all-levels="false" popper-class="tcg-tag-cascader"
                            :aria-label="$t('archive.card_tags')" :placeholder="$t('archive.all')" />
                    </label>
                </div>
                <el-text type="info">{{ $t('archive.count', { count: filtered.length }) }}</el-text>
                <el-empty v-if="!loading && !filtered.length" :description="$t('archive.no_results')" />
                <archive-pagination :page="page" :size="page_size" :total="filtered.length" @change="change_page" />
                <div ref="grid" class="archive-grid" :class="{ 'companion-grid': category === 'serenitea' && selected_type === 'companion' }">
                    <archive-list-entry v-for="item in visible" :key="item.id" :category="category" :item="item" :show-type="false" />
                </div>
                <archive-pagination :page="page" :size="page_size" :total="filtered.length" @change="change_page" />
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { ArchiveCategory, ArchivePage } from '~/types/archive';
import { filter_archive_pages, archive_classification_groups, archive_classification_children,
    filter_archive_classifications, archive_card_options, archive_card_tag_groups, archive_tag_cascader_props,
    filter_archive_cards, archive_selected_type, type ArchiveClassificationOption } from '~/utils/archive_list';
import { list_page_size, list_page_anchor, list_anchor_page, list_grid_columns } from '~~/shared/list_pagination';
import { TUTORIAL_CATEGORIES, filter_tutorial_category } from '~~/shared/misc';

const props = defineProps<{ category: ArchiveCategory | 'misc'; typeOrder?: readonly string[] }>();
const namespace = computed(() => props.category === 'misc' ? 'misc' : 'archive');
const route = useRoute();
const router = useRouter();
const items = ref<ArchivePage[]>([]);
const page_size = ref(48);
const grid = ref<HTMLElement>();
const loading = ref(true), failed = ref(false);
const types = computed(() => props.typeOrder || [...new Set(items.value.map(item => item.type))]);
const query_string = (key: string) => typeof route.query[key] === 'string' ? route.query[key] as string : '';
const search = ref(query_string('search'));
function update_query(values: Record<string, string | string[] | undefined>) {
    return router.replace({ query: { ...route.query, search: search.value || undefined,
        ...(Object.hasOwn(values, 'page') && values.page === undefined ? { size: undefined } : {}), ...values } });
}
// Keep typing local while navigation is pending; a route round-trip must not
// replace a partially entered search term with the previous URL's value.
let search_request = 0, search_pending = false, syncing_search = false;
function sync_search() {
    syncing_search = true;
    search.value = query_string('search');
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
    get: () => archive_selected_type(types.value, route.query.type),
    set: (value: string) => {
        // Tabs also emit while their async options initialize; this isn't a user filter change.
        if (!types.value.includes(value) || value === archive_selected_type(types.value, route.query.type)) return;
        return update_query({ type: value,
            group: undefined, subcategory: undefined, card_type: undefined, tags: undefined, tutorial_category: undefined, page: undefined });
    },
});
const card_mode = computed(() => props.category === 'tcg' && selected_type.value === 'card');
const tutorial_mode = computed(() => props.category === 'misc' && selected_type.value === 'tutorial');
const tutorial_category = computed({
    get: () => TUTORIAL_CATEGORIES.some(category => category === query_string('tutorial_category')) ? query_string('tutorial_category') : 'all',
    set: (value: string) => update_query({ tutorial_category: value === 'all' ? undefined : value, page: undefined }),
});
const card_types = computed(() => archive_card_options(items.value, 'card_type'));
const tag_options = computed(() => archive_card_options(items.value, 'tags'));
const tag_groups = computed(() => archive_card_tag_groups(items.value, key => $t(`archive.tag_groups.${key}`)));
const card_type = computed({
    get: () => card_types.value.some(option => option.id === query_string('card_type')) ? query_string('card_type') : 'all',
    set: (value: string) => update_query({ card_type: value === 'all' ? undefined : value, page: undefined }),
});
const card_tags = computed({
    get: () => {
        const value = route.query.tags;
        const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
        return [...new Set(values.filter((id): id is string => typeof id === 'string' && tag_options.value.some(option => option.id === id)))];
    },
    set: (value: unknown) => {
        const values = Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && tag_options.value.some(option => option.id === id)) : [];
        return update_query({ tags: values.length ? [...new Set(values)] : undefined, page: undefined });
    },
});
const classification_mode = computed(() => props.category === 'serenitea' && selected_type.value === 'furniture'
    || props.category === 'miliastra' && selected_type.value === 'costume');
const classification_group_label = computed(() => props.category === 'miliastra'
    ? 'archive.costume_classification_group' : 'archive.classification_group');
const classification_child_label = computed(() => props.category === 'miliastra'
    ? 'archive.costume_classification_child' : 'archive.classification_child');
const classification_items = computed(() => items.value.filter(item => item.type === selected_type.value));
const classification_groups = computed(() => archive_classification_groups(classification_items.value));
const unclassified_count = computed(() => filter_archive_classifications(classification_items.value.filter(item => item.show), 'unclassified').length);
const classification_group = computed({
    get: () => classification_mode.value && (query_string('group') === 'unclassified'
        || classification_groups.value.some(value => value.id === query_string('group'))) ? query_string('group') : 'all',
    set: (value: string) => update_query({ group: value === 'all' ? undefined : value, subcategory: undefined, page: undefined }),
});
const classification_children = computed(() => archive_classification_children(classification_items.value, classification_group.value));
const classification_child = computed({
    get: () => classification_children.value.some(value => value.id === query_string('subcategory')) ? query_string('subcategory') : 'all',
    set: (value: string) => update_query({ subcategory: value === 'all' ? undefined : value, page: undefined }),
});
const classification_label = (value: ArchiveClassificationOption) => value.name && !value.duplicate_name
    ? value.name : `${value.name || $t('archive.unnamed')} · ${value.id}`;
const filtered = computed(() => {
    const pages = filter_archive_pages(items.value, search.value, selected_type.value);
    if (tutorial_mode.value) return filter_tutorial_category(pages, tutorial_category.value);
    if (card_mode.value) return filter_archive_cards(pages, card_type.value, card_tags.value);
    return classification_mode.value ? filter_archive_classifications(pages, classification_group.value, classification_child.value) : pages;
});
// The URL stores the capacity used when navigating. Resize keeps that anchor
// visible rather than treating an old page number as a different batch of entries.
const page = computed(() => list_anchor_page(list_page_anchor(route.query.page, route.query.size, filtered.value.length), page_size.value));
const visible = computed(() => filtered.value.slice((page.value - 1) * page_size.value, page.value * page_size.value));
async function change_page(value: number) {
    await update_query({ page: value === 1 ? undefined : String(value), size: String(page_size.value) });
    await nextTick();
    const top = grid.value?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) grid.value?.scrollIntoView({ block: 'start' });
}
function measure_capacity() {
    const element = grid.value;
    if (!element?.clientWidth || !element.children.length) return;
    const tracks = getComputedStyle(element).gridTemplateColumns.split(/\s+/).length;
    const entries = [...element.children] as HTMLElement[];
    const placements = entries.map(entry => {
        const style = getComputedStyle(entry);
        return { start: style.gridColumnStart, end: style.gridColumnEnd };
    });
    const columns = list_grid_columns(tracks, placements);
    const layout = ['gallery', 'portrait', 'landscape', 'media', 'compact', 'index', 'text']
        .find(value => entries[0]?.classList.contains(`layout-${value}`)) || 'compact';
    page_size.value = list_page_size(columns, layout);
}
let resize_observer: ResizeObserver | undefined;
watch([grid, selected_type, filtered], async () => {
    await nextTick();
    if (grid.value) resize_observer?.observe(grid.value);
    measure_capacity();
}, { flush: 'post' });
onMounted(async () => {
    let width = 0;
    resize_observer = new ResizeObserver(entries => {
        const current = entries[0]?.contentRect.width || 0;
        // Page changes and delayed images can change height, not capacity.
        if (current !== width) { width = current; measure_capacity(); }
    });
    window.addEventListener('resize', measure_capacity);
    try {
        items.value = props.category === 'misc' ? await get_misc_pages() : await get_archive_pages(props.category);
    } catch { failed.value = true; }
    finally { loading.value = false; }
});
onBeforeUnmount(() => { resize_observer?.disconnect(); window.removeEventListener('resize', measure_capacity); });
useHead({ title: computed(() => $t(`menu.${props.category}`)) });
</script>

<style scoped>
.archive-list-main { min-width: 0; width: 100%; box-sizing: border-box; }
.archive-search { max-width: 600px; margin-bottom: 20px; }
.archive-classifications { display: flex; flex-wrap: wrap; gap: 16px; margin: 0 0 20px; }
.classification-field { display: flex; flex-direction: column; gap: 8px; width: 240px; max-width: 100%; }
.classification-field > span { color: var(--el-text-color-regular); font-size: 14px; }
.card-tags-field { width: 480px; }
.card-tags-field :deep(.el-cascader) { width: 100%; }
/* Group rows only expand: no disabled checkbox or whole-group selection. */
:global(.tcg-tag-cascader .el-cascader-node[aria-haspopup="true"] > .el-checkbox) { display: none; }
.archive-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; margin-top: 14px; align-items: start; container: archive-grid / inline-size; }
.archive-grid.companion-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr)); }
.archive-grid { scroll-margin-top: 24px; }
</style>
