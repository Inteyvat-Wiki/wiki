import type { TaskNarration } from '../types/travel_log';
import { evaluate_task_conditions, type TaskConditionValues } from './task_condition';
import type { TaskFlow } from './task_flow';

export function get_step_narrations(
    narrations: Record<string, TaskNarration>,
    flows: Map<number, Pick<TaskFlow, 'state' | 'initial_state' | 'outcome'>>,
    step_keys: number[],
    initial_values: TaskConditionValues,
    step: number,
    events: TaskNarration['event'][],
) {
    const entries = Object.entries(narrations);
    const by_key = new Map(entries), memo = new Map<string, boolean>(), pending = new Set<string>();
    function available(key: string): boolean {
        if (memo.has(key)) return memo.get(key)!;
        const narration = by_key.get(key);
        if (!narration || pending.has(key)) return false;
        pending.add(key);
        const flow = flows.get(narration.step);
        const event = flow?.outcome === 'failed' ? 'failed' : 'finish';
        const values = narration.event === 'start' ? flow?.initial_state.values : flow?.state.values;
        const result = (narration.conditions.length === 0
            || evaluate_task_conditions(narration.conditions, narration.step, step_keys,
                values || initial_values) === true)
            && (narration.event === 'start' || narration.event === event)
            && (!narration.after || available(narration.after));
        pending.delete(key);
        memo.set(key, result);
        return result;
    }
    return entries.filter(([key, narration]) => narration.step === step && events.includes(narration.event)
        && available(key)).map(([key, narration]) => ({ key, narration }));
}
