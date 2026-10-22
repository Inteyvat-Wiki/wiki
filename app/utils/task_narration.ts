import type { TaskBubble, TaskBubbleSubtitle, TaskNarration } from '../types/travel_log';
import { evaluate_task_conditions, type TaskConditionValues } from './task_condition';
import type { TaskFlow } from './task_flow';

export function get_step_narrations<T extends TaskNarration | TaskBubbleSubtitle>(
    narrations: Record<string, T>,
    flows: Map<number, Pick<TaskFlow, 'state' | 'initial_state' | 'outcome'>>,
    step_keys: number[],
    initial_values: TaskConditionValues,
    step: number,
    events: TaskNarration['event'][],
    parents: Record<string, TaskNarration | TaskBubbleSubtitle> = narrations,
) {
    const entries = Object.entries(narrations);
    const by_key = new Map(Object.entries(parents)), memo = new Map<string, boolean>(), pending = new Set<string>();
    function available(key: string): boolean {
        if (memo.has(key)) return memo.get(key)!;
        const narration = by_key.get(key);
        if (!narration || pending.has(key)) return false;
        pending.add(key);
        const result = available_entry(narration);
        pending.delete(key);
        memo.set(key, result);
        return result;
    }
    function available_entry(narration: TaskNarration | TaskBubbleSubtitle): boolean {
        const flow = flows.get(narration.step);
        const event = flow?.outcome === 'failed' ? 'failed' : 'finish';
        const values = narration.event === 'start' ? flow?.initial_state.values : flow?.state.values;
        return (narration.conditions.length === 0
            || evaluate_task_conditions(narration.conditions, narration.step, step_keys,
                values || initial_values) === true)
            && (narration.event === 'start' || narration.event === event)
            && (!narration.after || available(narration.after));
    }
    return entries.filter(([key, narration]) => narration.step === step && events.includes(narration.event)
        && available_entry(narration)).map(([key, narration]) => ({ key, narration }));
}

export function get_step_bubbles(
    bubbles: Record<string, TaskBubble>, narrations: Record<string, TaskNarration>,
    flows: Map<number, Pick<TaskFlow, 'state' | 'initial_state' | 'outcome'>>,
    step_keys: number[], initial_values: TaskConditionValues, step: number, events: TaskNarration['event'][],
) {
    const subtitles: Record<string, TaskBubbleSubtitle> = {};
    for (const [key, bubble] of Object.entries(bubbles)) {
        if (bubble.action !== 'create' && bubble.action !== 'trigger') continue;
        subtitles[key] = { type: 'speech_bubble', step: bubble.step, event: bubble.event, source: bubble.source,
            conditions: bubble.conditions, delay: bubble.delay, delay_unknown: bubble.delay_unknown,
            after: bubble.after, dialogs: { 1: bubble.dialog } };
    }
    return get_step_narrations(subtitles, flows, step_keys, initial_values, step, events, narrations)
        .map(({ key, narration }) => ({ key, bubble: narration }));
}
