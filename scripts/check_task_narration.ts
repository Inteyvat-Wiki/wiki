import assert from 'node:assert/strict';
import { build_task_flow } from '../app/utils/task_flow';
import { get_step_narrations } from '../app/utils/task_narration';
import type { TaskStep, TaskTalk, TaskNarration, TaskNumberCondition } from '../app/types/travel_log';

const condition: TaskNumberCondition = {
    type: 'number', id: 'variable', title: '', subtitle: '', comparison: 'equal', value: 1,
};
const step: TaskStep = {
    hidden: false, description: '', talks: [1],
    finish_conditions: [condition], fail_conditions: [{ ...condition, value: -1 }],
};
const talk: TaskTalk = {
    priority: 0, begin_way: 'manual', next_talks: [], trigger_ids: [], conditions: [], objects: [], trigger_points: [],
    dialogs: {
        1: { role: 'npc', content: '', next_dialogs: [{ dialog: 2 }, { dialog: 3 }] },
        2: { role: 'select', content: 'success', next_dialogs: [],
            operations: [{ type: 'variable', action: 'set', id: 'variable', value: 1 }] },
        3: { role: 'select', content: 'failure', next_dialogs: [],
            operations: [{ type: 'variable', action: 'set', id: 'variable', value: -1 }] },
    },
};
function flow(selections = {}, current = step) {
    return build_task_flow({ task: { talks: { 1: talk }, steps: { 1: current } }, step: current,
        current_step: 1, step_keys: [1], state: { values: { variable: 0 }, assigned: new Set(), completed: new Set() },
        selections, input_values: {} });
}
const success = flow();
assert.equal(success.outcome, 'finished');
assert.equal(success.state.values.variable, 1);
assert.equal(success.initial_state.values.variable, 0);
const failure = flow({ '1:dialog:1:1': 3 });
assert.equal(failure.outcome, 'failed');
assert.equal(failure.state.values.variable, -1);
const unresolved = flow({}, { ...step, finish_conditions: [{ ...condition, value: 99 }], fail_conditions: [] });
assert.equal(unresolved.outcome, 'finished');

function narration(event: TaskNarration['event']): TaskNarration {
    return { type: 'narration', step: 1, event, source: '', conditions: [], dialogs: {} };
}
const narrations = {
    start: { ...narration('start'), conditions: [{ ...condition, value: 0 }] },
    finish: { ...narration('finish'), conditions: [condition] },
    failed: { ...narration('failed'), conditions: [{ ...condition, value: -1 }] },
    callback: { ...narration('finish'), after: 'failed' },
};
const shown = (result: ReturnType<typeof flow>) => get_step_narrations(narrations,
    new Map([[1, result]]), [1], {}, 1, ['start', 'finish', 'failed']).map(item => item.key);
assert.deepEqual(shown(success), ['start', 'finish']);
assert.deepEqual(shown(failure), ['start', 'failed']);
assert.deepEqual(shown(unresolved), ['start', 'finish']);
assert.deepEqual(shown(flow({}, { ...step, fail_conditions: [{ ...condition, value: 1 }] })), ['start']);
console.log('Task outcome and narration checks passed');
