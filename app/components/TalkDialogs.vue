<template>
    <dialog-path ref="path" :items="segment?.items || local_flow.segments[0]?.items || []"
        :mode="mode" :input_values="active_input_values" @select="select"
        @update:input_values="update_input_values" />
</template>

<script setup lang="ts">
import type { TalkDisplayMode, TaskCondition, TaskTalk } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import { build_task_flow, type TaskFlowSegment, type TaskFlowSelections } from '~/utils/task_flow';
import DialogPath from '~/components/DialogPath.vue';

const props = defineProps<{
    talk: TaskTalk,
    mode?: TalkDisplayMode,
    condition_values: TaskConditionValues,
    current_step: number,
    step_keys: number[],
    segment?: TaskFlowSegment,
    input_values?: TaskConditionValues,
}>();
const emit = defineEmits<{
    initial_conditions: [conditions: TaskCondition[]],
    select: [key: string, value: number],
    'update:input_values': [value: TaskConditionValues],
}>();
const selections = ref<TaskFlowSelections>({});
const local_input_values = ref<TaskConditionValues>({});
const active_input_values = computed(() => props.input_values ?? local_input_values.value);
const local_flow = computed(() => build_task_flow({
    task: { talks: { 1: props.talk } },
    initial_talk: 1,
    current_step: props.current_step,
    step_keys: props.step_keys,
    state: { values: { ...props.condition_values }, assigned: new Set(), completed: new Set() },
    selections: selections.value,
    input_values: active_input_values.value,
}));
watch(() => props.segment ? [] : local_flow.value.initial_conditions,
    conditions => { if (!props.segment) emit('initial_conditions', conditions); }, { immediate: true });

function select(key: string, value: number) {
    if (props.segment) emit('select', key, value);
    else selections.value = { ...selections.value, [key]: value };
}

function update_input_values(value: TaskConditionValues) {
    if (props.segment) emit('update:input_values', value);
    else local_input_values.value = value;
}

const path = ref<InstanceType<typeof DialogPath>>();
function get_dialog_text() {
    return path.value?.get_dialog_text() || '';
}
defineExpose({ get_dialog_text });
</script>
