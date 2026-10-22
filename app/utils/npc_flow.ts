import type { Npc } from '../types/npc';
import type { TaskCondition } from '../types/travel_log';
import { evaluate_task_conditions, type TaskConditionValues } from './task_condition';
import { build_task_flow, get_trigger_candidates, type TaskFlowSelections, type TaskFlowState } from './task_flow';

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
    const state: TaskFlowState = { values: { ...input_values }, assigned: new Set(), completed: new Set() };
    const available = (keys: number[]) => keys.filter(key => {
        const talk = npc.talks[key];
        return talk && (!talk.conditions.length
            || evaluate_task_conditions(talk.conditions, 0, [], state.values) === true);
    });
    const available_entries = available(npc.entry_talks);
    const automatic = available_entries.filter(key => npc.talks[key]!.begin_way === 'auto');
    const entry_keys = get_trigger_candidates(npc, automatic.length ? automatic : available_entries);
    const preferred = entry_keys[0];
    const entry_key = entry_keys.includes(selections.entry!) ? selections.entry : preferred;
    // NPC 没有任务步骤；固定本轮入口后，仅沿显式 nextTalks 复用完整对话流程。
    if (entry_key === undefined) return { entry_keys, entry_key, segments: [], state };
    const flow = build_task_flow({
        task: npc, current_step: 0, step_keys: [], scope: 'npc',
        state, selections, input_values, initial_talk: entry_key,
        follow_successors: true, condition_defaults: false,
    });
    const entrance = flow.segments[0];
    if (entrance) {
        entrance.selector_key = 'entry';
        entrance.candidate_keys = entry_keys;
    }
    return { ...flow, entry_keys, entry_key };
}
