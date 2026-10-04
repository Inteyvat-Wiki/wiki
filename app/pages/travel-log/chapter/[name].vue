<template>
    <el-container v-if="chapter_group">
        <el-main>
            <div id="basic-info">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <div class="basic-info-header">
                                <title-with-icon :title="chapter_group.name" :icon="group_icon"
                                    need_background />
                                <el-tag>{{ $t(`travel-log.type.${chapter_group.type}`) }}</el-tag>
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
            </div>

            <div v-for="chapter in chapter_group.chapters" :id="chapter.id" :key="chapter.id"
                style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <template #header>
                                <div class="chapter-card-header">
                                    <div v-if="chapter.icon" class="chapter-icon round_icon_with_bg">
                                        <el-image :src="chapter.icon" fit="contain" />
                                    </div>
                                    <div class="chapter-card-info">
                                        <span class="chapter-card-name">{{ chapter.name }}</span>
                                        <el-text type="info" size="small">
                                            {{ $t('travel-log.task_count', { count: chapter.tasks.length }) }}
                                        </el-text>
                                    </div>
                                </div>
                            </template>
                            <div v-if="chapter.tasks.length > 0" class="task-grid">
                                <NuxtLink v-for="task_name in chapter.tasks" :key="task_name"
                                    :to="localePath(`/travel-log/task/${task_name}`)" class="card-link">
                                    <el-card shadow="hover" class="task-card">
                                        <div class="task-card-content">
                                            <div class="task-card-title"
                                                :class="{ 'task-card-title-hidden': task_map[task_name]?.hidden }">
                                                {{ get_task_title(task_map[task_name], task_name) }}
                                            </div>
                                            <el-text v-if="task_map[task_name]?.description" type="info" line-clamp="2">
                                                <span v-html="task_map[task_name]?.description"></span>
                                            </el-text>
                                        </div>
                                    </el-card>
                                </NuxtLink>
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
            </div>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { ChapterGroup, TaskPage, TaskPages } from '~/types/travel_log';

const localePath = useLocalePath();
const chapter_group = ref<ChapterGroup>();
const tasks = ref<TaskPages>([]);
const task_map = computed<Record<string, TaskPage>>(() =>
    Object.fromEntries(tasks.value.map(task => [task.id, task])));

const group_icon = computed(() => chapter_group.value?.chapters[0]?.icon || null);

function get_task_title(task: TaskPage | undefined, fallback: string) {
    return task?.name || (task ? $t('travel-log.hidden_task') : fallback);
}

onMounted(async () => {
    [chapter_group.value, tasks.value] = await Promise.all([
        get_page_data(useRoute().params.name as string, get_chapter_groups, get_chapter_group)
            .then(({ items }) => items[0]),
        get_tasks(),
    ]);
});

useHead({
    title: computed(() => chapter_group.value ? chapter_group.value.name : $t('normal.loading')),
});
</script>

<style scoped>
.basic-info-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.chapter-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.chapter-icon {
    width: 50px;
    height: 50px;
    flex: 0 0 50px;
}

.chapter-card-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.chapter-card-name {
    font-weight: bold;
    font-size: 1.1em;
    line-height: 1.4;
}

.task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

.card-link {
    display: block;
    height: 100%;
    color: inherit;
    text-decoration: none;
}

.task-card {
    height: 100%;
}

.task-card-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.task-card-title {
    font-weight: bold;
    line-height: 1.4;
}

.task-card-title-hidden {
    color: var(--el-text-color-placeholder);
}
</style>
