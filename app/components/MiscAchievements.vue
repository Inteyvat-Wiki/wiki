<template>
    <el-card class="collection-members">
        <template #header>{{ $t('misc.members') }}</template>
        <el-alert v-if="failed" :title="$t('misc.members_failed')" type="warning" :closable="false" class="members-note">
            <el-button size="small" @click="load">{{ $t('misc.retry') }}</el-button>
        </el-alert>
        <el-input v-model="search" :placeholder="$t('misc.search')" :aria-label="$t('misc.search')" clearable class="members-search" />
        <el-text type="info">{{ $t('archive.count', { count: filtered.length }) }}</el-text>
        <div v-loading="loading" class="members-list">
            <NuxtLink v-for="member in visible" :key="member.id" :to="localePath(`/misc/${member.id}`)" class="member-row">
                <h3><inline-text :text="member.name || $t('archive.unnamed')" /></h3>
                <div v-if="member.description" class="member-description"><inline-text :text="member.description" /></div>
            </NuxtLink>
        </div>
        <el-empty v-if="!filtered.length && !loading" :description="$t('archive.no_results')" />
        <el-pagination v-if="filtered.length > page_size" v-model:current-page="page" :page-size="page_size"
            :total="filtered.length" layout="prev, pager, next" class="members-pagination" />
    </el-card>
</template>

<script setup lang="ts">
import type { MiscItem, MiscPageData } from '~/types/misc';
import { misc_collection_members } from '~/utils/misc';
import { entry_plain_text } from '~~/shared/archive_display';
import { archive_page_number } from '~/utils/archive_list';

const props = defineProps<{ item: MiscItem }>();
const localePath = useLocalePath();
const pages = ref<MiscPageData[]>([]);
const loading = ref(false), failed = ref(false), search = ref('');
const page = ref(1), page_size = 40;
const members = computed(() => misc_collection_members(props.item, pages.value));
const filtered = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return members.value.filter(member => !query || entry_plain_text(`${member.id} ${member.source_id} ${member.name} ${member.description}`).toLocaleLowerCase().includes(query));
});
const visible = computed(() => {
    const current = archive_page_number(String(page.value), filtered.value.length, page_size);
    return filtered.value.slice((current - 1) * page_size, current * page_size);
});
watch([search, () => props.item], () => { page.value = 1; });
async function load() {
    loading.value = true; failed.value = false;
    try { pages.value = await get_misc_pages(); }
    catch { failed.value = true; }
    finally { loading.value = false; }
}
onMounted(load);
</script>

<style scoped>
.collection-members { min-width: 0; }
.members-note { margin-bottom: 12px; }
.members-search { display: block; max-width: 600px; margin-bottom: 12px; }
.members-list { margin-top: 12px; }
.member-row { display: grid; grid-template-columns: minmax(160px, 25%) minmax(0, 1fr); gap: 16px;
    padding: 12px 4px; border-bottom: 1px solid var(--el-border-color-lighter); color: inherit; text-decoration: none; }
.member-row:hover, .member-row:focus-visible { background: var(--el-fill-color-light); }
.member-row h3 { margin: 0; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.member-description { min-width: 0; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; color: var(--el-text-color-regular); }
.members-pagination { justify-content: center; margin-top: 16px; }
@media (max-width: 767px) { .member-row { grid-template-columns: minmax(0, 1fr); gap: 4px; } }
</style>
