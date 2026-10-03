<template>
    <el-container v-if="chapter_groups && tasks && quest_items">
        <el-main>
            <el-row justify="space-between" align="middle" :gutter="20" style="row-gap: 16px; margin-bottom: 10px;">
                <el-col :span="24" :md="12">
                    <title-with-icon :title="$t('menu.travel-log')" />
                </el-col>
                <el-col :span="24" :md="12" style="display: flex; justify-content: flex-end;">
                    <el-segmented v-model="view_mode" :options="view_options" />
                </el-col>
            </el-row>

            <el-tabs v-model="selected_type">
                <el-tab-pane v-for="type in type_list" :key="type" :name="type"
                    :label="$t(`travel-log.type.${type}`)" />
            </el-tabs>

            <template v-if="view_mode === 'chapters'">
                <el-row v-if="shown_chapter_groups.length > 0" :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col v-for="group in shown_chapter_groups" :key="group.id" :span="24" :sm="12" :lg="8">
                        <NuxtLink :to="localePath(`/travel-log/chapter/${group.id}`)" class="card-link">
                            <el-card shadow="hover" class="chapter-group-card">
                                <div class="chapter-group-content">
                                    <div v-if="group.chapters[0]?.icon" class="chapter-group-icon round_icon_with_bg">
                                        <el-image :src="group.chapters[0].icon" fit="contain" />
                                    </div>
                                    <div class="chapter-group-text">
                                        <span class="chapter-group-name">{{ group.name }}</span>
                                        <el-text type="info">
                                            {{ $t('travel-log.chapter_count', { count: group.chapters.length }) }}
                                        </el-text>
                                        <el-text v-if="get_task_count(group) > 0" type="info">
                                            {{ $t('travel-log.task_count', { count: get_task_count(group) }) }}
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
                                    <div class="task-card-title" :class="{ 'task-card-title-hidden': !task.name }">
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

            <template v-if="view_mode === 'quest_item'">
                <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col :xs="8" :sm="6" :md="4" :lg="2" v-for="quest_item in quest_items" :key="quest_item.id">
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
import type { ChapterGroup, ChapterGroups, TaskSummary, Tasks, TaskType } from '~/types/travel_log';
import type { QuestItems } from '~/types/quest_item';

const localePath = useLocalePath();
const chapter_groups = ref<ChapterGroups>();
const tasks = ref<Tasks>();
const quest_items = ref<QuestItems>();
const view_mode = ref<'chapters' | 'tasks' | 'quest_item'>('chapters');
const selected_type = ref<TaskType>('archon_quests');
const search_text = ref('');

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
]);

const shown_chapter_groups = computed(() =>
    (chapter_groups.value || []).filter(group => group.type === selected_type.value));

const shown_tasks = computed(() => {
    const keyword = search_text.value.trim().toLocaleLowerCase();
    return (tasks.value || []).filter(task => {
        if (task.type !== selected_type.value) return false;
        if (!keyword) return true;
        return [get_task_title(task), task.description || '', task.chapter || '']
            .some(value => value.toLocaleLowerCase().includes(keyword));
    });
});

function get_task_title(task: TaskSummary) {
    return task.name || $t('travel-log.hidden_task');
}

function get_task_count(group: ChapterGroup) {
    return group.chapters.reduce((count, chapter) => count + chapter.tasks.length, 0);
}

onMounted(async () => {
    [chapter_groups.value, tasks.value, quest_items.value] = await Promise.all([
        get_chapter_groups(),
        get_tasks(),
        get_quest_items(),
    ]);

    const saved_type = localStorage.getItem('travel_log_selected_type') as TaskType | null;
    const saved_view = localStorage.getItem('travel_log_view_mode') as 'chapters' | 'tasks' | 'quest_item' | null;
    if (saved_type && type_list.includes(saved_type)) selected_type.value = saved_type;
    if (saved_view === 'chapters' || saved_view === 'tasks' || saved_view === 'quest_item') view_mode.value = saved_view;
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
