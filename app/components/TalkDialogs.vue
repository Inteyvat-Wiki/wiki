<template>
    <div class="talk-dialogs">
        <template v-for="item in displayed_items" :key="item.key">
            <div v-if="item.kind === 'conditions'" class="dialog-conditions">
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
import type {
    TalkDisplayMode,
    TaskCondition,
    TaskConditionToken,
    TaskDialogNext,
    TaskTalk,
} from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import { evaluate_task_conditions } from '~/utils/task_condition';

const props = defineProps<{
    talk: TaskTalk,
    mode?: TalkDisplayMode,
    condition_values: TaskConditionValues,
    current_step: number,
    step_keys: number[],
}>();
const emit = defineEmits<{
    initial_conditions: [conditions: TaskCondition[]],
}>();

const selected_choices = ref<Record<number, number | undefined>>({});
const selected_branches = ref<Record<string, number | undefined>>({});
const inline_condition_values = ref<TaskConditionValues>({});

type DialogDisplayItem = {
    kind: 'dialog',
    key: number,
    dialog: TaskTalk['dialogs'][string],
};

type ChoiceDisplayItem = {
    kind: 'choice',
    key: string,
    dialog_key: number,
    options: { key: number, dialog: TaskTalk['dialogs'][string] }[],
};

type ConditionDisplayItem = {
    kind: 'conditions',
    key: string,
    conditions: TaskCondition[],
};

type BranchDisplayItem = {
    kind: 'branch',
    key: string,
    branch_id: string,
    branch_type: 'random' | 'result',
    options: number[],
};

type DisplayItem = DialogDisplayItem | ChoiceDisplayItem | ConditionDisplayItem | BranchDisplayItem;

type PathState = {
    values: TaskConditionValues,
    assigned: Set<string>,
};

function get_condition_operands(tokens: TaskConditionToken[] = []): TaskCondition[] {
    const result = new Map<string, TaskCondition>();
    for (const token of tokens) {
        if (typeof token !== 'string') result.set(JSON.stringify(token), token);
    }
    return [...result.values()];
}

const condition_samples = computed(() => {
    const result = new Map<string, TaskCondition[]>();
    for (const dialog of Object.values(props.talk.dialogs)) {
        for (const next of dialog.next_dialogs) {
            for (const condition of get_condition_operands(next.conditions)) {
                const values = result.get(condition.id) || [];
                if (!values.some(value => JSON.stringify(value) === JSON.stringify(condition))) values.push(condition);
                result.set(condition.id, values);
            }
        }
        for (const operation of dialog.operations || []) {
            for (const condition of get_condition_operands(operation.conditions)) {
                const values = result.get(condition.id) || [];
                if (!values.some(value => JSON.stringify(value) === JSON.stringify(condition))) values.push(condition);
                result.set(condition.id, values);
            }
        }
    }
    return result;
});

function evaluate_conditions(tokens: TaskConditionToken[] | undefined, state: PathState) {
    if (!tokens || tokens.length === 0) return true;
    return evaluate_task_conditions(tokens, props.current_step, props.step_keys, state.values);
}

function copy_state(state: PathState): PathState {
    return { values: { ...state.values }, assigned: new Set(state.assigned) };
}

function get_next_dialog(next: TaskDialogNext) {
    return props.talk.dialogs[next.dialog];
}

function is_selectable_dialog(dialog: TaskTalk['dialogs'][string]) {
    return dialog.role === 'select';
}

const display_state = computed(() => {
    const entries = Object.entries(props.talk.dialogs);
    const indegree = new Map(entries.map(([key]) => [Number(key), 0]));
    for (const [, dialog] of entries) {
        for (const next of dialog.next_dialogs) {
            if (indegree.has(next.dialog)) indegree.set(next.dialog, indegree.get(next.dialog)! + 1);
        }
    }

    const roots = entries.map(([key]) => Number(key)).filter(key => indegree.get(key) === 0);
    const items: DisplayItem[] = [];
    const visited = new Set<number>();
    const initial_conditions = new Map<string, TaskCondition>();
    const default_choices = new Map<number, number>();
    const default_branches = new Map<string, number>();
    const branch_values = new Map<string, number>();
    const handled_branches = new Set<string>();

    function get_branch_value(id: string): number | undefined {
        return selected_branches.value[id] ?? branch_values.get(id);
    }

    function matches_branches(branches: TaskDialogNext['branches'] = []) {
        return branches.every(branch => get_branch_value(branch.id) === branch.option);
    }

    function append_branch_controls(
        next_dialogs: TaskDialogNext[],
        operations: TaskTalk['dialogs'][string]['operations'] = [],
        location: string,
    ) {
        const paths = [
            ...next_dialogs.map(item => item.branches || []),
            ...operations.map(item => item.branches || []),
        ];
        while (true) {
            const branch = paths.flatMap(path => path.filter((item, index) =>
                path.slice(0, index).every(previous => get_branch_value(previous.id) === previous.option)))
                .find(item => !handled_branches.has(item.id));
            if (!branch) return;

            const options = [...new Set(paths.flatMap(path => path
                .filter((item, index) => item.id === branch.id
                    && path.slice(0, index).every(previous => get_branch_value(previous.id) === previous.option))
                .map(item => item.option)))].sort((left, right) => left - right);
            if (options.length === 0) return;
            const selected = selected_branches.value[branch.id];
            const value = options.includes(selected as number) ? selected! : options[0]!;
            branch_values.set(branch.id, value);
            handled_branches.add(branch.id);
            if (selected === undefined) default_branches.set(branch.id, value);
            if (options.length > 1) {
                items.push({
                    kind: 'branch',
                    key: `branch-${location}-${branch.id}`,
                    branch_id: branch.id,
                    branch_type: branch.type,
                    options,
                });
            }
        }
    }

    function register_initial_conditions(tokens: TaskConditionToken[] | undefined, state: PathState) {
        for (const condition of get_condition_operands(tokens)) {
            if (!state.assigned.has(condition.id)) initial_conditions.set(JSON.stringify(condition), condition);
        }
    }

    function apply_operations(key: number, state: PathState, render = true): PathState {
        const next_state = copy_state(state);
        const dialog = props.talk.dialogs[key];
        if (!dialog) return next_state;

        for (const operation of dialog.operations || []) {
            if (!matches_branches(operation.branches)) continue;
            if (render) register_initial_conditions(operation.conditions, next_state);
            if (evaluate_conditions(operation.conditions, next_state) !== true) continue;

            if (operation.type === 'set') {
                next_state.values[operation.id] = operation.value;
                next_state.assigned.add(operation.id);
                continue;
            }

            const conditions = condition_samples.value.get(operation.id) || [];
            if (render && conditions.length > 0) {
                items.push({ kind: 'conditions', key: `conditions-${key}-${operation.id}`, conditions });
            }
            const value = inline_condition_values.value[operation.id];
            if (value !== undefined) next_state.values[operation.id] = value;
            next_state.assigned.add(operation.id);
        }
        return next_state;
    }

    function get_satisfied_next(dialog_key: number, state: PathState, register = true): TaskDialogNext[] {
        const dialog = props.talk.dialogs[dialog_key];
        if (!dialog) return [];

        const result: TaskDialogNext[] = [];
        for (const next of dialog.next_dialogs) {
            if (!get_next_dialog(next)) continue;
            if (!matches_branches(next.branches)) continue;
            if (register) register_initial_conditions(next.conditions, state);
            if (evaluate_conditions(next.conditions, state) === true) result.push(next);
        }
        return result;
    }

    function can_reach_dialog_end(key: number, state: PathState, path = new Set<number>()): boolean {
        if (path.has(key)) return false;
        const next_state = apply_operations(key, state, false);
        const next = get_satisfied_next(key, next_state, false);
        if (next.length === 0) return true;
        const next_path = new Set(path).add(key);
        return next.some(item => can_reach_dialog_end(item.dialog, next_state, next_path));
    }

    function append_choice(dialog_key: number, choices: TaskDialogNext[], state: PathState, path: Set<number>) {
        const options = choices
            .map(next => ({ key: next.dialog, dialog: get_next_dialog(next)! }))
            .filter(option => option.dialog !== undefined);
        if (options.length === 0) return;

        items.push({ kind: 'choice', key: `choice-${dialog_key}`, dialog_key, options });
        const selected = selected_choices.value[dialog_key];
        const selected_option = options.find(option => option.key === selected);
        const selected_key = selected_option?.key
            ?? options.find(option => can_reach_dialog_end(option.key, state))?.key
            ?? options[0]?.key;
        if (selected_key === undefined || path.has(selected_key) || visited.has(selected_key)) return;
        if (selected_option === undefined) default_choices.set(dialog_key, selected_key);

        visited.add(selected_key);
        const selected_dialog = props.talk.dialogs[selected_key];
        append_branch_controls(
            selected_dialog?.next_dialogs || [],
            selected_dialog?.operations,
            String(selected_key),
        );
        const selected_state = apply_operations(selected_key, state);
        const next = get_satisfied_next(selected_key, selected_state)[0];
        if (next) append_path(next.dialog, selected_state, new Set(path).add(selected_key));
    }

    function append_path(key: number, state: PathState, path: Set<number>) {
        if (path.has(key) || visited.has(key)) return;
        const dialog = props.talk.dialogs[key];
        if (!dialog) return;

        if (is_selectable_dialog(dialog)) {
            append_choice(key, [{ dialog: key }], state, path);
            return;
        }

        visited.add(key);
        items.push({ kind: 'dialog', key, dialog });
        append_branch_controls(dialog.next_dialogs, dialog.operations, String(key));
        const next_state = apply_operations(key, state);
        const next = get_satisfied_next(key, next_state);
        const choices = next.filter(item => is_selectable_dialog(get_next_dialog(item)!));
        if (choices.length > 0) {
            append_choice(key, choices, next_state, path);
            return;
        }

        const first = next[0];
        if (first) append_path(first.dialog, next_state, new Set(path).add(key));
    }

    const initial_state: PathState = {
        values: { ...props.condition_values, ...inline_condition_values.value },
        assigned: new Set(),
    };
    if (props.talk.initial_dialogs?.length) {
        append_branch_controls(props.talk.initial_dialogs, [], 'initial');
        const initial = props.talk.initial_dialogs.filter(next => {
            if (!get_next_dialog(next) || !matches_branches(next.branches)) return false;
            register_initial_conditions(next.conditions, initial_state);
            return evaluate_conditions(next.conditions, initial_state) === true;
        });
        const choices = initial.filter(item => is_selectable_dialog(get_next_dialog(item)!));
        if (choices.length > 0) append_choice(0, choices, initial_state, new Set());
        else if (initial[0]) append_path(initial[0].dialog, initial_state, new Set());
    }
    else {
        for (const key of roots) append_path(key, initial_state, new Set());
    }
    return {
        items,
        initial_conditions: [...initial_conditions.values()],
        default_choices,
        default_branches,
    };
});

const displayed_items = computed(() => display_state.value.items);
watch(() => display_state.value.initial_conditions, conditions => emit('initial_conditions', conditions), {
    immediate: true,
});

const display_mode = computed<TalkDisplayMode>(() => props.mode ?? 'both');
const show_bubbles = computed(() => display_mode.value !== 'options_only');
const show_options = computed(() => display_mode.value !== 'bubbles_only');

function get_selected_choice(item: ChoiceDisplayItem) {
    const selected_key = selected_choices.value[item.dialog_key];
    if (item.options.some(option => option.key === selected_key)) return selected_key;
    return display_state.value.default_choices.get(item.dialog_key) ?? item.options[0]?.key;
}

function set_selected_choice(dialog_key: number, value: number | undefined) {
    if (value === undefined) return;
    selected_choices.value = {
        ...selected_choices.value,
        [dialog_key]: value,
    };
}

function get_selected_branch(item: BranchDisplayItem) {
    const selected = selected_branches.value[item.branch_id];
    if (item.options.includes(selected as number)) return selected;
    return display_state.value.default_branches.get(item.branch_id) ?? item.options[0];
}

function set_selected_branch(branch_id: string, value: string | number | boolean | undefined) {
    if (typeof value !== 'number') return;
    selected_branches.value = {
        ...selected_branches.value,
        [branch_id]: value,
    };
}

function get_selected_option(item: ChoiceDisplayItem) {
    const selected_key = get_selected_choice(item);
    return item.options.find(option => option.key === selected_key);
}

function get_choice_bubble(item: ChoiceDisplayItem): DialogDisplayItem | undefined {
    const option = get_selected_option(item);
    return option ? { kind: 'dialog', key: option.key, dialog: option.dialog } : undefined;
}

const popover_visible_map = reactive<Record<number, boolean>>({});
watch(selected_choices, () => {
    for (const key of Object.keys(popover_visible_map)) popover_visible_map[Number(key)] = false;
}, { deep: true });
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
