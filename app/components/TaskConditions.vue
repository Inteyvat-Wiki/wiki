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
                    <el-radio-button v-for="interval in group.intervals" :key="format_interval(interval)"
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
    TaskNumberCondition,
    TaskState,
    TaskStepCondition,
} from '~/types/travel_log';
import {
    is_number_condition,
    is_step_condition,
    matches_number_condition,
    type TaskConditionValues,
} from '~/utils/task_condition';

const props = defineProps<{
    conditions: TaskCondition[],
}>();
const model = defineModel<TaskConditionValues>({ required: true });
const localePath = useLocalePath();
const state_options: TaskState[] = ['unstarted', 'ongoing', 'finished', 'failed'];

type NumberInterval = {
    lower: number | null,
    lower_closed: boolean,
    upper: number | null,
    upper_closed: boolean,
    sample: number,
};

function is_external_step_condition(condition: TaskCondition): condition is TaskStepCondition {
    return is_step_condition(condition) && Boolean(condition.task);
}

const groups = computed(() => {
    const result = new Map<string, {
        id: string,
        sample: TaskCondition,
        conditions: TaskCondition[],
        intervals: NumberInterval[],
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
            values[group.id] = group.intervals.find(interval => contains_number(interval, 0))?.sample
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

function create_number_intervals(conditions: TaskNumberCondition[]): NumberInterval[] {
    const thresholds = [...new Set(conditions.map(condition => condition.value))]
        .sort((left, right) => left - right);
    if (thresholds.length === 0) return [];

    const atoms: NumberInterval[] = [{
        lower: null,
        lower_closed: false,
        upper: thresholds[0]!,
        upper_closed: false,
        sample: thresholds[0]! - 1,
    }];
    for (let index = 0; index < thresholds.length; index++) {
        const threshold = thresholds[index]!;
        atoms.push({
            lower: threshold,
            lower_closed: true,
            upper: threshold,
            upper_closed: true,
            sample: threshold,
        });
        const next = thresholds[index + 1];
        if (next !== undefined) {
            atoms.push({
                lower: threshold,
                lower_closed: false,
                upper: next,
                upper_closed: false,
                sample: (threshold + next) / 2,
            });
        }
    }
    atoms.push({
        lower: thresholds.at(-1)!,
        lower_closed: false,
        upper: null,
        upper_closed: false,
        sample: thresholds.at(-1)! + 1,
    });

    const result: (NumberInterval & { signature: string })[] = [];
    for (const atom of atoms) {
        const signature = conditions
            .map(condition => matches_number_condition(condition, atom.sample) ? '1' : '0')
            .join('');
        const previous = result.at(-1);
        if (previous?.signature === signature) {
            previous.upper = atom.upper;
            previous.upper_closed = atom.upper_closed;
        } else {
            result.push({ ...atom, signature });
        }
    }
    return result.map(({ signature: _, ...interval }) => interval);
}

function contains_number(interval: NumberInterval, value: number) {
    const above_lower = interval.lower === null
        || value > interval.lower
        || interval.lower_closed && value === interval.lower;
    const below_upper = interval.upper === null
        || value < interval.upper
        || interval.upper_closed && value === interval.upper;
    return above_lower && below_upper;
}

function format_interval(interval: NumberInterval) {
    const left = interval.lower_closed ? '[' : '(';
    const right = interval.upper_closed ? ']' : ')';
    return `${left}${interval.lower ?? '-∞'}, ${interval.upper ?? '+∞'}${right}`;
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
