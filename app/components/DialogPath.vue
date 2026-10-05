<template>
    <div class="talk-dialogs">
        <template v-for="item in displayed_items" :key="item.key">
            <task-item-operations v-if="item.kind === 'items'" :operations="[item.operation]" />
            <div v-else-if="item.kind === 'conditions'" class="dialog-conditions">
                <task-conditions v-model="inline_condition_values" :conditions="item.conditions" />
            </div>
            <div v-else-if="item.kind === 'branch'" class="dialog-branch">
                <el-text>{{ $t(`travel-log.branch.${item.branch_type}`) }}</el-text>
                <el-radio-group :model-value="get_selected_branch(item)"
                    class="dialog-branch-options"
                    @update:model-value="set_selected_branch(item.branch_id, $event)">
                    <el-radio v-for="option in item.options" :key="option" :value="option" border>
                        {{ $t('travel-log.branch.option', { index: option + 1 }) }}
                    </el-radio>
                </el-radio-group>
            </div>
            <template v-else-if="item.kind === 'choice'">
                <talk-choice-options v-if="show_options" :options="item.options"
                    :model-value="get_selected_choice(item)"
                    @update:model-value="set_selected_choice(item.dialog_key, $event)" />
                <template v-if="show_bubbles">
                    <el-popover v-if="!show_options && get_choice_bubble(item)"
                        placement="top" width="320" trigger="click"
                        v-model:visible="popover_visible_map[item.dialog_key]">
                        <template #reference>
                            <talk-bubble :item="get_choice_bubble(item)!" clickable hide_title />
                        </template>
                        <talk-choice-options :options="item.options"
                            :model-value="get_selected_choice(item)"
                            @update:model-value="set_selected_choice(item.dialog_key, $event)" />
                    </el-popover>
                    <talk-bubble v-else-if="get_choice_bubble(item)"
                        :item="get_choice_bubble(item)!" hide_title />
                </template>
            </template>
            <talk-bubble v-else :item="item" />
        </template>
    </div>
</template>

<script setup lang="ts">
import type { TalkDisplayMode } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import type { TaskFlowItem } from '~/utils/task_flow';
import { format_dialog } from '~/utils/dialog_copy';

const props = defineProps<{
    items: TaskFlowItem[],
    mode?: TalkDisplayMode,
    input_values: TaskConditionValues,
}>();
const emit = defineEmits<{
    select: [key: string, value: number],
    'update:input_values': [value: TaskConditionValues],
}>();
const displayed_items = computed(() => props.items);
const inline_condition_values = computed({
    get: () => props.input_values,
    set: value => emit('update:input_values', value),
});
const show_bubbles = computed(() => props.mode !== 'options_only');
const show_options = computed(() => props.mode !== 'bubbles_only');
const popover_visible_map = reactive<Record<string, boolean>>({});

function get_selected_choice(item: Extract<TaskFlowItem, { kind: 'choice' }>) {
    return item.selected_key;
}

function set_selected_choice(key: string, value: number | undefined) {
    if (value !== undefined) emit('select', key, value);
    popover_visible_map[key] = false;
}

function get_selected_branch(item: Extract<TaskFlowItem, { kind: 'branch' }>) {
    return item.selected_key;
}

function set_selected_branch(key: string, value: string | number | boolean | undefined) {
    if (typeof value === 'number') emit('select', key, value);
}

function get_choice_bubble(item: Extract<TaskFlowItem, { kind: 'choice' }>) {
    const option = item.options.find(option => option.key === item.selected_key);
    return option ? { kind: 'dialog' as const, key: option.key, dialog: option.dialog } : undefined;
}

function get_dialog_text() {
    return props.items.flatMap(item => {
        const dialog = item.kind === 'dialog' ? item.dialog
            : item.kind === 'choice' ? get_choice_bubble(item)?.dialog : undefined;
        return dialog ? [format_dialog(dialog)] : [];
    }).filter(Boolean).join('\n');
}

defineExpose({ get_dialog_text });
</script>

<style scoped>
.talk-dialogs {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: var(--el-font-size-base);
}

.dialog-conditions {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-lighter);
}

.dialog-branch {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-lighter);
}

.dialog-branch-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.dialog-branch-options :deep(.el-radio) {
    height: auto;
    min-height: 30px;
    margin-right: 0;
    white-space: normal;
}
</style>


