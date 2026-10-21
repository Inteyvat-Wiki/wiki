import type {
    Task, TaskCondition, TaskConditionToken, TaskDialog, TaskDialogNext,
    TaskItemOperation, TaskOperation, TaskStep, TaskTalk,
} from '../types/travel_log';
import { evaluate_task_conditions, type TaskConditionValues } from './task_condition';

export type TaskFlowSelections = Record<string, number | undefined>;
export type TaskFlowItem =
    | { kind: 'dialog', key: number, dialog: TaskDialog }
    | { kind: 'choice', key: string, dialog_key: string, selected_key: number,
        options: { key: number, dialog: TaskDialog }[] }
    | { kind: 'branch', key: string, branch_id: string, branch_type: 'random' | 'result',
        selected_key: number, options: number[] }
    | { kind: 'conditions', key: string, conditions: TaskCondition[] }
    | { kind: 'items', key: string, operation: TaskItemOperation };

export type TaskFlowSegment = {
    talk_key?: number,
    selector_key: string,
    candidate_keys: number[],
    items: TaskFlowItem[],
};

export type TaskFlowState = {
    values: TaskConditionValues,
    assigned: Set<string>,
    completed: Set<number>,
};

export type TaskFlow = {
    segments: TaskFlowSegment[],
    initial_conditions: TaskCondition[],
    optional_talk_keys: number[],
    state: TaskFlowState,
    initial_state: TaskFlowState,
    outcome: 'finished' | 'failed',
};

export function copy_flow_state(state: TaskFlowState): TaskFlowState {
    return { values: { ...state.values }, assigned: new Set(state.assigned), completed: new Set(state.completed) };
}

function get_operands(tokens: TaskConditionToken[] = []): TaskCondition[] {
    return tokens.filter((token): token is TaskCondition => typeof token !== 'string');
}

export function get_trigger_candidates(task: Pick<Task, 'talks'>, keys: number[]): number[] {
    const winners = new Map<string, number>();
    for (const key of keys) {
        const talk = task.talks[key]!;
        const entrances = talk.trigger_ids.length ? talk.trigger_ids : [`talk:${key}`];
        for (const entrance of entrances) {
            const previous = winners.get(entrance);
            if (previous === undefined || talk.priority > task.talks[previous]!.priority) winners.set(entrance, key);
        }
    }
    const selected = new Set(winners.values());
    return keys.filter(key => selected.has(key));
}

export function get_linked_talks(task: Pick<Task, 'talks'>, terminals: number[]): Set<number> {
    const keys = new Set(terminals);
    const predecessors = new Map<number, number[]>();
    for (const [key, talk] of Object.entries(task.talks)) for (const next of talk.next_talks) {
        const previous = predecessors.get(next) || [];
        previous.push(Number(key));
        predecessors.set(next, previous);
    }
    const pending = [...keys];
    for (let index = 0; index < pending.length; index++) for (const key of predecessors.get(pending[index]!) || []) {
        if (!keys.has(key)) { keys.add(key); pending.push(key); }
    }
    return keys;
}

export function build_task_flow(options: {
    task: Pick<Task, 'talks'> & Partial<Pick<Task, 'steps'>>,
    step?: TaskStep,
    current_step: number,
    step_keys: number[],
    state: TaskFlowState,
    selections: TaskFlowSelections,
    input_values: TaskConditionValues,
    initial_talk?: number,
    include_optional?: boolean,
    scope?: string,
}): TaskFlow {
    const { task, step, current_step, step_keys, selections, input_values } = options;
    const segments: TaskFlowSegment[] = [];
    const initial_conditions = new Map<string, TaskCondition>();
    const condition_samples = new Map<string, TaskCondition[]>();
    const talk_keys = Object.keys(task.talks).map(Number);
    const target_talks = get_linked_talks(task, step?.talks || []);
    const required_talks = new Set(Object.values(task.steps || (step ? { current: step } : {}))
        .flatMap(item => [...item.talks, ...[...item.finish_conditions, ...(item.fail_conditions || [])].flatMap(token =>
            typeof token !== 'string' && token.type === 'talk' ? [token.talk] : [])]));
    const optional_memo = new Map<string, boolean>();
    const optional_searching = new Set<string>();
    const scope = options.scope ?? `${current_step}`;
    const memo = new Map<string, boolean>();
    const searching = new Set<string>();
    let search_count = 0;

    for (const talk of Object.values(task.talks)) {
        const tokens = [talk.conditions, ...(talk.initial_dialogs || []).map(next => next.conditions || []),
            ...(talk.operations || []).map(operation => operation.conditions || []),
            ...Object.values(talk.dialogs).flatMap(dialog => [
                ...dialog.next_dialogs.map(next => next.conditions || []),
                ...(dialog.operations || []).map(operation => operation.conditions || []),
            ])];
        for (const condition of tokens.flatMap(get_operands)) {
            const samples = condition_samples.get(condition.id) || [];
            if (!samples.some(sample => JSON.stringify(sample) === JSON.stringify(condition))) samples.push(condition);
            condition_samples.set(condition.id, samples);
        }
    }
    for (const condition of [...(step?.finish_conditions || []), ...(step?.fail_conditions || [])]) {
        if (typeof condition === 'string' || condition.type === 'talk') continue;
        const samples = condition_samples.get(condition.id) || [];
        if (!samples.some(sample => JSON.stringify(sample) === JSON.stringify(condition))) samples.push(condition);
        condition_samples.set(condition.id, samples);
    }

    function evaluate(tokens: TaskConditionToken[] | undefined, state: TaskFlowState, register = false) {
        if (register) for (const condition of get_operands(tokens)) {
            if (!state.assigned.has(condition.id)) initial_conditions.set(JSON.stringify(condition), condition);
        }
        const values = { ...state.values };
        for (const condition of get_operands(tokens)) if (values[condition.id] === undefined) {
            values[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
        }
        return !tokens?.length || evaluate_task_conditions(tokens, current_step, step_keys, values) === true;
    }

    function matches_end_conditions(tokens: TaskStep['finish_conditions'], state: TaskFlowState) {
        const values = { ...state.values };
        const conditions: TaskConditionToken[] = tokens.map(token => {
            if (typeof token === 'string' || token.type !== 'talk') return token;
            const id = `completed-talk:${token.talk}`;
            values[id] = state.completed.has(token.talk);
            return { type: 'boolean', id, title: '', subtitle: '', value: true };
        });
        return evaluate_task_conditions(conditions, current_step, step_keys, values) === true;
    }

    function failed(state: TaskFlowState) {
        return !!step && matches_end_conditions(step.fail_conditions || [], state);
    }

    function finished(state: TaskFlowState) {
        return !!step && !failed(state) && matches_end_conditions(step.finish_conditions, state);
    }

    function candidates(previous: number | undefined, state: TaskFlowState) {
        const available = (keys: number[]) => keys.filter(key => task.talks[key]
            && !state.completed.has(key) && evaluate(task.talks[key]!.conditions, state));
        if (previous !== undefined) {
            const next = available(task.talks[previous]!.next_talks);
            if (next.length) return get_trigger_candidates(task, next);
        }
        const automatic = available(talk_keys.filter(key => task.talks[key]!.begin_way === 'auto'));
        if (automatic.length) return get_trigger_candidates(task, automatic);
        return get_trigger_candidates(task,
            available(talk_keys.filter(key => task.talks[key]!.begin_way === 'manual')))
            .filter(key => !is_optional(key, state));
    }

    function selection_key(talk: number, dialog: number | string) {
        return `${scope}:dialog:${talk}:${dialog}`;
    }

    function get_branch_options(talk_key: number, next: TaskDialogNext[], operations: TaskOperation[],
        values: TaskFlowSelections) {
        const paths = [...next.map(item => item.branches || []), ...operations.map(item => item.branches || [])];
        const branch = paths.flatMap(path => path.filter((item, index) =>
            path.slice(0, index).every(previous => values[previous.id] === previous.option)))
            .find(item => values[item.id] === undefined);
        if (!branch) return undefined;
        const available = [...new Set(paths.flatMap(path => path.filter((item, index) => item.id === branch.id
            && path.slice(0, index).every(previous => values[previous.id] === previous.option))
            .map(item => item.option)))].sort((left, right) => left - right);
        const key = selection_key(talk_key, `branch:${branch.id}`);
        const saved = selections[key];
        return { branch, available, key, saved: available.includes(saved as number) ? saved : undefined };
    }

    function branch_choices(talk_key: number, next: TaskDialogNext[], operations: TaskOperation[],
        branches: TaskFlowSelections, items: TaskFlowItem[], can_finish: (branches: TaskFlowSelections) => boolean) {
        const values = { ...branches };
        while (true) {
            const options = get_branch_options(talk_key, next, operations, values);
            if (!options) break;
            const { branch, available, key, saved } = options;
            values[branch.id] = saved ?? available.find(option => can_finish({ ...values, [branch.id]: option }))
                ?? available[0];
            if (available.length > 1) items.push({ kind: 'branch', key, branch_id: key,
                branch_type: branch.type, selected_key: values[branch.id]!, options: available });
        }
        return values;
    }

    function matches(branches: TaskDialogNext['branches'], values: TaskFlowSelections) {
        return (branches || []).every(branch => values[branch.id] === branch.option);
    }

    function operate(operations: TaskOperation[], state: TaskFlowState, branches: TaskFlowSelections,
        location: string, items?: TaskFlowItem[]) {
        const result = copy_flow_state(state);
        for (const [index, operation] of operations.entries()) {
            if (!matches(operation.branches, branches) || !evaluate(operation.conditions, result, !!items)) continue;
            if (operation.type === 'item') {
                if (items) items.push({ kind: 'items', key: `${location}:item:${index}`, operation });
                continue;
            }
            if (operation.action === 'set') result.values[operation.id] = operation.value ?? 0;
            else {
                const conditions = condition_samples.get(operation.id) || [];
                if (items && conditions.length) items.push({ kind: 'conditions',
                    key: `${location}:input:${index}`, conditions });
                result.values[operation.id] = input_values[operation.id] ?? result.values[operation.id] ?? 0;
            }
            result.assigned.add(operation.id);
        }
        return result;
    }

    function next_dialogs(talk: TaskTalk, next: TaskDialogNext[], state: TaskFlowState,
        branches: TaskFlowSelections, register = false) {
        return next.filter(item => talk.dialogs[item.dialog] && matches(item.branches, branches)
            && evaluate(item.conditions, state, register));
    }

    function initial_dialogs(talk: TaskTalk) {
        if (talk.initial_dialogs?.length) return talk.initial_dialogs;
        const incoming = new Set(Object.values(talk.dialogs).flatMap(dialog => dialog.next_dialogs.map(next => next.dialog)));
        const keys = Object.keys(talk.dialogs).map(Number);
        return keys.filter(key => !incoming.has(key)).map(dialog => ({ dialog }));
    }

    // 可选性检查所有可执行分支，不使用已保存的选项，也不延伸到新的独立触发入口。
    function is_optional(talk_key: number, state: TaskFlowState): boolean {
        let optional_search_count = 0;
        function inspect(location: string, branches: TaskFlowSelections, run: () => boolean): boolean {
            const key = JSON.stringify([location, Object.entries(state.values).sort(), [...state.completed].sort(),
                Object.entries(branches).sort()]);
            if (optional_memo.has(key)) return optional_memo.get(key)!;
            if (optional_searching.has(key) || optional_search_count++ >= 4000) return false;
            optional_searching.add(key);
            const result = run();
            optional_searching.delete(key);
            optional_memo.set(key, result);
            return result;
        }

        function has_effect(operations: TaskOperation[], branches: TaskFlowSelections) {
            return operations.some(operation => {
                if (!matches(operation.branches, branches) || !evaluate(operation.conditions, state)) return false;
                if (operation.type === 'item' || operation.action === 'input') return true;
                const value = operation.value ?? 0;
                return value !== (state.values[operation.id] ?? (typeof value === 'boolean' ? false : 0));
            });
        }

        function inspect_next(key: number, next: TaskDialogNext[], branches: TaskFlowSelections) {
            const talk = task.talks[key]!;
            const available = next.filter(item => matches(item.branches, branches) && evaluate(item.conditions, state));
            if (!available.length || available.some(item => !talk.dialogs[item.dialog])) return false;
            const choices = available.filter(item => talk.dialogs[item.dialog]!.role === 'select');
            return (choices.length ? choices : available.slice(0, 1))
                .every(item => inspect_dialog(key, item.dialog, branches));
        }

        function inspect_after(key: number) {
            if (required_talks.has(key)) return false;
            const next = task.talks[key]!.next_talks;
            if (next.some(target => !task.talks[target])) return false;
            const available = next.filter(target => !state.completed.has(target)
                && evaluate(task.talks[target]!.conditions, state));
            return get_trigger_candidates(task, available).every(target => inspect_talk(target, {}));
        }

        function inspect_dialog(key: number, dialog_key: number, branches: TaskFlowSelections): boolean {
            return inspect(`dialog:${key}:${dialog_key}`, branches, () => {
                const dialog = task.talks[key]!.dialogs[dialog_key]!;
                const operations = dialog.operations || [];
                const options = get_branch_options(key, dialog.next_dialogs, operations, branches);
                if (options) return options.available.every(option => inspect_dialog(key, dialog_key,
                    { ...branches, [options.branch.id]: option }));
                if (has_effect(operations, branches)) return false;
                return dialog.next_dialogs.length
                    ? inspect_next(key, dialog.next_dialogs, branches) : inspect_after(key);
            });
        }

        function inspect_talk(key: number, branches: TaskFlowSelections): boolean {
            return inspect(`talk:${key}`, branches, () => {
                const talk = task.talks[key]!;
                const initial = initial_dialogs(talk);
                const operations = talk.operations || [];
                const options = get_branch_options(key, initial, operations, branches);
                if (options) return options.available.every(option => inspect_talk(key,
                    { ...branches, [options.branch.id]: option }));
                return !has_effect(operations, branches) && (talk.initial_dialogs?.length
                    ? inspect_next(key, initial, branches)
                    : initial.length > 0 && initial.every(next => inspect_dialog(key, next.dialog, branches)));
            });
        }

        return inspect_talk(talk_key, {});
    }

    // 搜索与展示共用候选入口、变量操作和后继筛选；非选项只走首个满足条件的后继。
    function search(location: string, state: TaskFlowState, branches: TaskFlowSelections, run: () => boolean): boolean {
        const key = JSON.stringify([location, Object.entries(state.values).sort(), [...state.completed].sort(),
            Object.entries(branches).sort()]);
        if (memo.has(key)) return memo.get(key)!;
        if (searching.has(key) || search_count++ >= 4000) return false;
        searching.add(key);
        const result = run();
        searching.delete(key);
        memo.set(key, result);
        return result;
    }

    function search_next(talk_key: number, location: number | string, next: TaskDialogNext[],
        state: TaskFlowState, branches: TaskFlowSelections, remaining_roots: number[] = []) {
        const talk = task.talks[talk_key]!;
        const selectable = next.filter(item => talk.dialogs[item.dialog]!.role === 'select');
        const saved = selections[selection_key(talk_key, location)];
        const selected = selectable.find(item => item.dialog === saved);
        const targets = selectable.length ? selected ? [selected] : selectable : next.slice(0, 1);
        return targets.some(item => search_dialog(talk_key, item.dialog, state, branches, remaining_roots));
    }

    function search_after(talk_key: number, state: TaskFlowState) {
        const result = copy_flow_state(state);
        result.completed.add(talk_key);
        if (!step) return true;
        if (failed(result)) return false;
        if (finished(result)) return true;
        const available = candidates(talk_key, result);
        const saved = selections[`${scope}:talk:${talk_key}`];
        return (available.includes(saved as number) ? [saved!] : available).some(key => search_talk(key, result));
    }

    function search_dialog(talk_key: number, dialog_key: number, state: TaskFlowState, branches: TaskFlowSelections,
        remaining_roots: number[] = []): boolean {
        return search(`dialog:${talk_key}:${dialog_key}:${remaining_roots.join(',')}`, state, branches, () => {
            const talk = task.talks[talk_key]!;
            const dialog = talk.dialogs[dialog_key]!;
            const options = get_branch_options(talk_key, dialog.next_dialogs, dialog.operations || [], branches);
            if (options) return (options.saved === undefined ? options.available : [options.saved])
                .some(option => search_dialog(talk_key, dialog_key, state,
                    { ...branches, [options.branch.id]: option }, remaining_roots));
            const next_state = operate(dialog.operations || [], state, branches, 'search');
            if (!dialog.next_dialogs.length) return remaining_roots.length
                ? search_dialog(talk_key, remaining_roots[0]!, next_state, branches, remaining_roots.slice(1))
                : search_after(talk_key, next_state);
            return search_next(talk_key, dialog_key, next_dialogs(talk, dialog.next_dialogs, next_state, branches),
                next_state, branches, remaining_roots);
        });
    }

    function search_talk(talk_key: number, state: TaskFlowState, branches: TaskFlowSelections = {}): boolean {
        return search(`talk:${talk_key}`, state, branches, () => {
            const talk = task.talks[talk_key]!;
            const initial = initial_dialogs(talk);
            const options = get_branch_options(talk_key, initial, talk.operations || [], branches);
            if (options) return (options.saved === undefined ? options.available : [options.saved])
                .some(option => search_talk(talk_key, state, { ...branches, [options.branch.id]: option }));
            const next_state = operate(talk.operations || [], state, branches, 'search');
            const next = next_dialogs(talk, initial, next_state, branches);
            if (!talk.initial_dialogs?.length) return next.length > 0
                && search_dialog(talk_key, next[0]!.dialog, next_state, branches, next.slice(1).map(item => item.dialog));
            return search_next(talk_key, 'initial', next, next_state, branches);
        });
    }

    function choose(keys: number[], key: string, can_finish: (candidate: number) => boolean, fallback = true) {
        const saved = selections[key];
        return keys.includes(saved as number) ? saved : keys.find(can_finish) ?? (fallback ? keys[0] : undefined);
    }

    let state = copy_flow_state(options.state);
    let previous: number | undefined;
    const rendered = new Set<number>();
    while (!finished(state) && !failed(state)) {
        const available = options.initial_talk !== undefined
            ? rendered.size ? [] : [options.initial_talk]
            : candidates(previous, state);
        const selector_key = `${scope}:talk:${previous ?? 'start'}`;
        const ordered = [...available].sort((left, right) => Number(target_talks.has(right)) - Number(target_talks.has(left)));
        const automatic = options.initial_talk !== undefined || available.some(key =>
            task.talks[key]!.begin_way === 'auto' || previous !== undefined && task.talks[previous]!.next_talks.includes(key));
        const talk_key = choose(ordered, selector_key, key => search_talk(key, state), automatic || available.length === 1);
        if (talk_key === undefined) {
            if (available.length) segments.push({ selector_key, candidate_keys: available, items: [] });
            break;
        }
        if (rendered.has(talk_key)) break;
        rendered.add(talk_key);
        const talk = task.talks[talk_key]!;
        const items: TaskFlowItem[] = [];
        segments.push({ talk_key, selector_key, candidate_keys: available, items });
        evaluate(talk.conditions, state, true);
        const initial = initial_dialogs(talk);
        let branches = branch_choices(talk_key, initial, talk.operations || [], {}, items,
            candidate => search_talk(talk_key, state, candidate));
        state = operate(talk.operations || [], state, branches, `${talk_key}:initial`, items);
        let next = next_dialogs(talk, initial, state, branches, true);
        const remaining_roots = talk.initial_dialogs?.length ? [] : next.slice(1);
        if (!talk.initial_dialogs?.length) next = next.slice(0, 1);
        const visited = new Set<string>();
        let complete = false;
        let previous_dialog: number | string = 'initial';
        while (next.length) {
            const choices = next.filter(item => talk.dialogs[item.dialog]!.role === 'select');
            const key = selection_key(talk_key, previous_dialog);
            const dialog_key = choices.length
                ? choose(choices.map(item => item.dialog), key, candidate => search_dialog(talk_key, candidate, state,
                    branches, remaining_roots.map(item => item.dialog)))
                : next[0]!.dialog;
            if (dialog_key === undefined) break;
            const marker = JSON.stringify([dialog_key, Object.entries(state.values).sort(), Object.entries(branches).sort()]);
            if (visited.has(marker) || visited.size >= 4000) break;
            visited.add(marker);
            const dialog = talk.dialogs[dialog_key]!;
            if (choices.length) items.push({ kind: 'choice', key, dialog_key: key, selected_key: dialog_key,
                options: choices.map(item => ({ key: item.dialog, dialog: talk.dialogs[item.dialog]! })) });
            else items.push({ kind: 'dialog', key: dialog_key, dialog });
            branches = branch_choices(talk_key, dialog.next_dialogs, dialog.operations || [], branches, items,
                candidate => search_dialog(talk_key, dialog_key, state, candidate,
                    remaining_roots.map(item => item.dialog)));
            state = operate(dialog.operations || [], state, branches, `${talk_key}:${dialog_key}`, items);
            if (!dialog.next_dialogs.length) {
                const root = remaining_roots.shift();
                if (!root) { complete = true; break; }
                next = [root];
                previous_dialog = 'initial';
                continue;
            }
            next = next_dialogs(talk, dialog.next_dialogs, state, branches, true);
            previous_dialog = dialog_key;
        }
        if (!complete) break;
        state.completed.add(talk_key);
        previous = talk_key;
    }
    const optional_talk_keys = options.include_optional ? get_trigger_candidates(task, talk_keys.filter(key =>
        task.talks[key]!.begin_way === 'manual' && !state.completed.has(key)
        && evaluate(task.talks[key]!.conditions, state))).filter(key => is_optional(key, state)) : [];
    return { segments, initial_conditions: [...initial_conditions.values()], optional_talk_keys, state,
        initial_state: copy_flow_state(options.state), outcome: failed(state) ? 'failed' : 'finished' };
}
