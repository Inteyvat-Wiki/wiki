<template>
    <el-container v-if="chapter_groups && tasks && quest_items && npcs">
        <el-main>
            <el-row justify="space-between" align="middle" :gutter="20" style="row-gap: 16px; margin-bottom: 10px;">
                <el-col :span="24" :md="12">
                    <title-with-icon :title="$t('menu.travel-log')" />
                </el-col>
                <el-col :span="24" :md="12" style="display: flex; justify-content: flex-end;">
                    <el-segmented v-model="view_mode" :options="view_options" />
                </el-col>
            </el-row>

            <el-tabs v-if="view_mode !== 'npcs'" v-model="selected_type">
                <el-tab-pane v-for="type in type_list" :key="type" :name="type"
                    :label="$t(`travel-log.type.${type}`)" />
            </el-tabs>

            <template v-if="view_mode === 'chapters'">
                <el-row v-if="shown_chapter_groups.length > 0" :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col v-for="group in shown_chapter_groups" :key="group.id" :span="24" :sm="12" :lg="8">
                        <NuxtLink :to="localePath(`/travel-log/chapter/${group.id}`)" class="card-link">
                            <el-card shadow="hover" class="chapter-group-card">
                                <div class="chapter-group-content">
                                    <div v-if="group.icon" class="chapter-group-icon round_icon_with_bg">
                                        <el-image :src="group.icon" fit="contain" />
                                    </div>
                                    <div class="chapter-group-text">
                                        <span class="chapter-group-name">{{ group.name }}</span>
                                        <el-text type="info">
                                            {{ $t('travel-log.chapter_count', { count: group.chapter_count }) }}
                                        </el-text>
                                        <el-text v-if="group.task_count > 0" type="info">
                                            {{ $t('travel-log.task_count', { count: group.task_count }) }}
                                        </el-text>
                                    </div>
                                </div>
                            </el-card>
                        </NuxtLink>
                    </el-col>
                </el-row>
            </template>

            <template v-if="view_mode === 'tasks'">
                <el-input v-model="search_text" :placeholder="$t('travel-log.search_tasks')" :prefix-icon="Search"
                    clearable style="max-width: 420px; margin-bottom: 20px;" />
                <el-row v-if="shown_tasks.length > 0" :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col v-for="task in shown_tasks" :key="task.id" :span="24" :md="12" :lg="8">
                        <NuxtLink :to="localePath(`/travel-log/task/${task.id}`)" class="card-link">
                            <el-card shadow="hover" class="task-card">
                                <div class="task-card-content">
                                    <div class="task-card-title" :class="{ 'task-card-title-hidden': task.hidden }">
                                        {{ get_task_title(task) }}
                                    </div>
                                    <el-text v-if="task.chapter" type="info">{{ task.chapter }}</el-text>
                                    <el-text v-if="task.description" line-clamp="2">
                                        <span v-html="task.description"></span>
                                    </el-text>
                                </div>
                            </el-card>
                        </NuxtLink>
                    </el-col>
                </el-row>
            </template>

            <template v-if="view_mode === 'npcs'">
                <el-input v-model="search_text" :placeholder="$t('travel-log.search_npcs')" :prefix-icon="Search"
                    clearable style="max-width: 420px; margin-bottom: 20px;" />
                <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col v-for="npc in paged_npcs" :key="npc.id" :span="24" :sm="12" :lg="8">
                        <NuxtLink :to="localePath(`/travel-log/npc/${npc.id}`)" class="card-link">
                            <el-card shadow="hover" class="task-card">
                                <div class="task-card-content">
                                    <span class="task-card-title">{{ npc.name }}</span>
                                    <el-text type="info">{{ $t('travel-log.npc_talk_count', { count: npc.talk_count }) }}</el-text>
                                </div>
                            </el-card>
                        </NuxtLink>
                    </el-col>
                </el-row>
                <el-pagination v-model:current-page="npc_page" :page-size="60" :total="shown_npcs.length"
                    layout="prev, pager, next" hide-on-single-page style="margin-top: 20px;" />
            </template>

            <template v-if="view_mode === 'quest_item'">
                <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col :xs="8" :sm="6" :md="4" :lg="2" v-for="quest_item in shown_quest_items" :key="quest_item.id">
                        <NuxtLink :to="localePath(`/travel-log/quest-item/${quest_item.id}`)"
                            style="text-decoration: none;">
                            <avatar-display-card :title="quest_item.name" :icon="quest_item.icon"
                                :border_star="quest_item.star || undefined" font_size="1.0em">
                            </avatar-display-card>
                        </NuxtLink>
                    </el-col>
                    <el-col :xs="8" :sm="6" :md="4" :lg="2" v-for="i in 24" :key="i" style="height: 0px;">
                    </el-col>
                </el-row>
            </template>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import type { ChapterGroupPages, TaskPage, TaskPages, TaskType } from '~/types/travel_log';
import type { QuestItemPages } from '~/types/quest_item';
import type { NpcPages } from '~/types/npc';

const localePath = useLocalePath();
const chapter_groups = ref<ChapterGroupPages>();
const tasks = ref<TaskPages>();
const quest_items = ref<QuestItemPages>();
const npcs = ref<NpcPages>();
type ViewMode = 'chapters' | 'tasks' | 'quest_item' | 'npcs';
const view_mode = ref<ViewMode>('chapters');
const selected_type = ref<TaskType>('archon_quests');
const search_text = ref('');
const npc_page = ref(1);

const type_list: TaskType[] = [
    'archon_quests',
    'story_quests',
    'hangout_quests',
    'event_quests',
    'world_quests',
    'commission_quests',
];

const view_options = computed(() => [
    { label: $t('travel-log.chapters'), value: 'chapters' },
    { label: $t('travel-log.tasks'), value: 'tasks' },
    { label: $t('travel-log.quest_item'), value: 'quest_item' },
    { label: $t('travel-log.npcs'), value: 'npcs' },
]);

const shown_quest_items = computed(() => (quest_items.value || []).filter(page => page.show));
const shown_npcs = computed(() => (npcs.value || []).filter(page => page.show
    && page.name.toLocaleLowerCase().includes(search_text.value.trim().toLocaleLowerCase())));
const paged_npcs = computed(() => shown_npcs.value.slice((npc_page.value - 1) * 60, npc_page.value * 60));
watch(search_text, () => { npc_page.value = 1; });

const shown_chapter_groups = computed(() =>
    (chapter_groups.value || []).filter(group => group.show && group.type === selected_type.value));

const shown_tasks = computed(() => {
    const keyword = search_text.value.trim().toLocaleLowerCase();
    return (tasks.value || []).filter(task => {
        if (!task.show) return false;
        if (task.type !== selected_type.value) return false;
        if (!keyword) return true;
        return [get_task_title(task), task.description || '', task.chapter || '']
            .some(value => value.toLocaleLowerCase().includes(keyword));
    });
});

function get_task_title(task: TaskPage) {
    return task.name || $t('travel-log.hidden_task');
}

onMounted(async () => {
    [chapter_groups.value, tasks.value, quest_items.value, npcs.value] = await Promise.all([
        get_chapter_groups(),
        get_tasks(),
        get_quest_items(),
        get_npcs(),
    ]);

    const saved_type = localStorage.getItem('travel_log_selected_type') as TaskType | null;
    const saved_view = localStorage.getItem('travel_log_view_mode') as ViewMode | null;
    if (saved_type && type_list.includes(saved_type)) selected_type.value = saved_type;
    if (saved_view && ['chapters', 'tasks', 'quest_item', 'npcs'].includes(saved_view)) view_mode.value = saved_view;
});

watch(selected_type, value => localStorage.setItem('travel_log_selected_type', value));
watch(view_mode, value => localStorage.setItem('travel_log_view_mode', value));

useHead({
    title: $t('menu.travel-log'),
});
</script>

<style scoped>
.card-link {
    display: block;
    height: 100%;
    color: inherit;
    text-decoration: none;
}

.chapter-group-card,
.task-card {
    height: 100%;
}

.chapter-group-content {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 82px;
}

.chapter-group-icon {
    width: 72px;
    height: 72px;
    flex: 0 0 72px;
}

.chapter-group-text,
.task-card-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.task-card-content {
    align-items: flex-start;
}

.chapter-group-text {
    align-items: flex-start;
    text-align: left;
}

.chapter-group-name,
.task-card-title {
    font-weight: bold;
    line-height: 1.4;
}

.task-card-title-hidden {
    color: var(--el-text-color-placeholder);
}

@media (max-width: 767px) {
    .chapter-group-icon {
        width: 58px;
        height: 58px;
        flex-basis: 58px;
    }
}
</style>
