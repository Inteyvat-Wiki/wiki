import type { Npc } from '../types/npc';
import type { TaskCondition } from '../types/travel_log';
import { evaluate_task_conditions, type TaskConditionValues } from './task_condition';
import { build_task_flow, type TaskFlowSelections, type TaskFlowState, type TaskFlowSegment } from './task_flow';

export function get_npc_conditions(npc: Npc): TaskCondition[] {
    return Object.values(npc.talks).flatMap(talk => [
        ...talk.conditions,
        ...(talk.initial_dialogs || []).flatMap(next => next.conditions || []),
        ...(talk.operations || []).flatMap(operation => operation.conditions || []),
        ...Object.values(talk.dialogs).flatMap(dialog => [
            ...dialog.next_dialogs.flatMap(next => next.conditions || []),
            ...(dialog.operations || []).flatMap(operation => operation.conditions || []),
        ]),
    ]).filter((condition): condition is TaskCondition => typeof condition !== 'string');
}

export function build_npc_flow(npc: Npc, input_values: TaskConditionValues, selections: TaskFlowSelections) {
    let state: TaskFlowState = { values: { ...input_values }, assigned: new Set(), completed: new Set() };
    const available = (keys: number[]) => keys.filter(key => {
        const talk = npc.talks[key];
        return talk && (!talk.conditions.length
            || evaluate_task_conditions(talk.conditions, 0, [], state.values) === true);
    });
    const entry_keys = available(npc.entry_talks);
    const manual_keys = entry_keys.filter(key => npc.talks[key]!.begin_way === 'manual');
    const preferred = (manual_keys.length ? manual_keys : entry_keys)
        .reduce<number | undefined>((previous, key) => previous === undefined
            || npc.talks[key]!.priority > npc.talks[previous]!.priority ? key : previous, undefined);
    const entry_key = entry_keys.includes(selections.entry!) ? selections.entry : preferred;
    const segments: { talk_key: number, segment: TaskFlowSegment, menu_keys: number[], menu_selector_key: string }[] = [];
    const visited = new Set<number>();
    let key = entry_key;
    while (key !== undefined && !visited.has(key)) {
        visited.add(key);
        const talk = npc.talks[key]!;
        // NPC 没有任务步骤；这里只复用单段对话内部的分支和状态处理。
        const scope = `npc:${segments.length}:${key}`;
        const flow = build_task_flow({
            task: { talks: { [key]: { ...talk, next_talks: [] } } },
            current_step: 0, step_keys: [], scope,
            state: { ...state, completed: new Set() }, selections, input_values, initial_talk: key,
        });
        state = flow.state;
        const segment = flow.segments[0];
        if (!segment) break;
        const menu_keys = state.completed.has(key) ? available(talk.next_talks) : [];
        const menu_selector_key = `${scope}:menu`;
        segments.push({ talk_key: key, segment, menu_keys, menu_selector_key });
        const selected = selections[menu_selector_key];
        key = selected !== undefined && menu_keys.includes(selected) ? selected : undefined;
    }
    return { entry_keys, entry_key, segments, state };
}
