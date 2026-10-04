<template>
    <div class="task-conditions">
        <div v-for="group in groups" :key="group.id" class="task-condition">
            <NuxtLink v-if="is_external_step_condition(group.sample)"
                :to="localePath(get_step_path(group.sample))" class="condition-title step-link">
                <span>{{ group.sample.title }}</span>
                <el-text type="info">{{ group.sample.subtitle }}</el-text>
            </NuxtLink>
            <div v-else class="condition-title">
                <span>{{ group.sample.title }}</span>
                <el-text type="info">{{ group.sample.subtitle }}</el-text>
            </div>

            <el-radio-group v-model="model[group.id]" size="small">
                <template v-if="is_step_condition(group.sample)">
                    <el-radio-button v-for="state in state_options" :key="state" :value="state">
                        {{ $t(`travel-log.state.${state}`) }}
                    </el-radio-button>
                </template>
                <template v-else-if="group.sample.type === 'number'">
                    <el-radio-button v-for="interval in group.intervals" :key="interval.sample"
                        :value="interval.sample">
                        {{ format_interval(interval) }}
                    </el-radio-button>
                </template>
                <template v-else>
                    <el-radio-button :value="true">{{ $t('travel-log.yes') }}</el-radio-button>
                    <el-radio-button :value="false">{{ $t('travel-log.no') }}</el-radio-button>
                </template>
            </el-radio-group>
        </div>
    </div>
</template>

<script setup lang="ts">
import type {
    TaskCondition,
    TaskState,
    TaskStepCondition,
} from '~/types/travel_log';
import {
    is_number_condition,
    is_step_condition,
    create_number_intervals,
    format_number_interval,
    type TaskConditionValues,
    type TaskNumberInterval,
} from '~/utils/task_condition';

const props = defineProps<{
    conditions: TaskCondition[],
}>();
const model = defineModel<TaskConditionValues>({ required: true });
const localePath = useLocalePath();
const state_options: TaskState[] = ['unstarted', 'ongoing', 'finished', 'failed'];

function is_external_step_condition(condition: TaskCondition): condition is TaskStepCondition {
    return is_step_condition(condition) && Boolean(condition.task);
}

const groups = computed(() => {
    const result = new Map<string, {
        id: string,
        sample: TaskCondition,
        conditions: TaskCondition[],
        intervals: TaskNumberInterval[],
    }>();
    for (const condition of props.conditions) {
        let group = result.get(condition.id);
        if (!group) {
            group = { id: condition.id, sample: condition, conditions: [], intervals: [] };
            result.set(condition.id, group);
        }
        group.conditions.push(condition);
    }
    for (const group of result.values()) {
        if (is_number_condition(group.sample)) {
            group.intervals = create_number_intervals(group.conditions.filter(is_number_condition));
        }
    }
    return [...result.values()];
});

watch(groups, current_groups => {
    const values = { ...model.value };
    for (const group of current_groups) {
        if (values[group.id] !== undefined) continue;
        if (is_step_condition(group.sample)) {
            values[group.id] = 'finished';
        } else if (is_number_condition(group.sample)) {
            values[group.id] = group.intervals.find(interval => interval.sample === 0)?.sample
                ?? group.intervals[0]?.sample;
        } else {
            values[group.id] = false;
        }
    }

    const current_keys = Object.keys(model.value);
    const next_keys = Object.keys(values);
    if (current_keys.length === next_keys.length
        && current_keys.every(key => model.value[key] === values[key])) return;
    model.value = values;
}, { immediate: true });

function format_interval(interval: TaskNumberInterval) {
    return format_number_interval(interval, $t('travel-log.other'));
}

function get_step_path(condition: TaskStepCondition) {
    return `/travel-log/task/${condition.task}?step=${condition.step}#step-${condition.step}`;
}
</script>

<style scoped>
.task-conditions,
.task-condition,
.condition-title {
    display: flex;
    flex-direction: column;
}

.task-conditions {
    gap: 12px;
}

.task-condition {
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.task-condition:last-child {
    padding-bottom: 0;
    border-bottom: none;
}

.condition-title {
    align-items: baseline;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2px 8px;
    min-width: 0;
}

.condition-title > span,
.condition-title :deep(.el-text) {
    min-width: 0;
    overflow-wrap: anywhere;
}

.step-link {
    color: var(--el-color-primary);
    text-decoration: none;
}

.task-condition :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
}
</style>
