import assert from 'node:assert/strict';
import { build_task_flow, get_trigger_candidates } from '../app/utils/task_flow';
import type { TaskDialog, TaskTalk, TaskStep, TaskCondition } from '../app/types/travel_log';
import type { TaskConditionValues } from '../app/utils/task_condition';

function dialog(next: number[] = [], role: TaskDialog['role'] = 'npc'): TaskDialog {
    return { content: '', role, next_dialogs: next.map(dialog => ({ dialog })) };
}

function talk(id: number, overrides: Partial<TaskTalk> = {}): TaskTalk {
    return { priority: 0, begin_way: 'manual', next_talks: [], trigger_ids: [`npc:${id}`],
        conditions: [], objects: [], trigger_points: [], dialogs: { 1: dialog() }, ...overrides };
}

function step(goal: number): TaskStep {
    return { hidden: false, description: '', talks: [goal], finish_conditions: [{ type: 'talk', talk: goal }] };
}

function run(talks: Record<string, TaskTalk>, goal: TaskStep = step(1), selections = {}) {
    return build_task_flow({ task: { talks }, step: goal, current_step: 1, step_keys: [1, 2],
        state: { values: {}, assigned: new Set(), completed: new Set() }, selections, input_values: {} });
}

const competing = { talks: { 1: talk(1, { priority: 1 }), 2: talk(1, { priority: 2 }),
    3: talk(2, { priority: 0 }), 4: talk(1, { priority: 2 }) } };
assert.deepEqual(get_trigger_candidates(competing, [1, 2, 3, 4]), [2, 3]);

const chain = run({ 1: talk(1, { next_talks: [3] }), 2: talk(2),
    3: talk(3, { begin_way: null }), 4: talk(4, { begin_way: 'auto', conditions: [{
        type: 'boolean', id: 'disabled', title: '', subtitle: '', value: true,
    }] }) }, step(3));
assert.deepEqual(chain.segments.map(segment => segment.talk_key), [1, 3]);
assert.deepEqual([...chain.state.completed], [1, 3]);
assert.deepEqual(chain.segments[0]?.candidate_keys, [1]);

const automatic = run({ 1: talk(1), 2: talk(2, { begin_way: 'auto' }) }, step(2));
assert.equal(automatic.segments[0]?.talk_key, 2);

const number_condition: TaskCondition = { type: 'number', id: 'var', title: '', subtitle: '',
    value: 1, comparison: 'equal' };
const variable_talk = talk(1, { dialogs: {
    1: dialog([2, 3]),
    2: { ...dialog([4], 'select'), operations: [{ type: 'variable', action: 'set', id: 'var', value: 0 }] },
    3: { ...dialog([4], 'select'), operations: [{ type: 'variable', action: 'set', id: 'var', value: 1 }] },
    4: { ...dialog(), next_dialogs: [{ dialog: 5, conditions: [number_condition] }] },
    5: dialog(),
} });
const variable = run({ 1: variable_talk });
assert.equal(variable.segments[0]?.items.find(item => item.kind === 'choice')?.selected_key, 3);
assert.equal(variable.state.values.var, 1);
assert(variable.state.completed.has(1));

const blocked = run({ 1: variable_talk }, step(1), { '1:dialog:1:1': 2 });
assert(!blocked.state.completed.has(1));

const loop = run({ 1: talk(1, { dialogs: { 1: dialog([2, 3]), 2: dialog([1], 'select'),
    3: dialog([4], 'select'), 4: dialog() } }) });
assert.equal(loop.segments[0]?.items.find(item => item.kind === 'choice')?.selected_key, 3);

const linear = run({ 1: talk(1, { dialogs: { 1: dialog([2, 3]), 2: dialog([2]), 3: dialog() } }) });
assert(!linear.state.completed.has(1));

const different_goal = run({ 1: variable_talk }, { ...step(1), finish_conditions: [number_condition] });
assert.equal(different_goal.state.values.var, 1);
assert(!different_goal.state.completed.has(1));

const carried = build_task_flow({ task: { talks: { 2: talk(2, { conditions: [number_condition] }) } },
    step: step(2), current_step: 2, step_keys: [1, 2], state: variable.state,
    selections: {}, input_values: {} });
assert.equal(carried.segments[0]?.talk_key, 2);

const result_branch = run({ 1: talk(1, { dialogs: {
    1: { ...dialog(), next_dialogs: [
        { dialog: 2, branches: [{ id: 'challenge', type: 'result', option: 0 }] },
        { dialog: 3, branches: [{ id: 'challenge', type: 'result', option: 1 }] },
    ] },
    2: { ...dialog(), next_dialogs: [{ dialog: 2 }] },
    3: dialog(),
} }) });
assert.equal(result_branch.segments[0]?.items.find(item => item.kind === 'branch')?.selected_key, 1);
assert(result_branch.state.completed.has(1));

function optional(talks: Record<string, TaskTalk>, values: TaskConditionValues = {},
    dependencies: Record<string, TaskStep> = {}, selections = {}) {
    const goal = { ...step(999), finish_conditions: [{ type: 'boolean' as const, id: 'done',
        title: '', subtitle: '', value: true }] };
    return build_task_flow({ task: { talks, steps: dependencies }, step: goal, current_step: 1, step_keys: [1, 2],
        state: { values: { done: true, ...values }, assigned: new Set(), completed: new Set() },
        selections, input_values: {}, include_optional: true }).optional_talk_keys;
}

assert.deepEqual(optional({ 1: talk(1), 2: talk(2) }), [1, 2]);
const unlisted_step: TaskCondition = { type: 'number', id: JSON.stringify(['step_state', '99902']),
    title: '99902', subtitle: 'QUEST_COND_STATE_EQUAL', value: 3, comparison: 'equal' };
assert.deepEqual(optional({ 1: talk(1, { conditions: [unlisted_step] }) }), []);
assert.deepEqual(optional({ 1: talk(1, { conditions: [unlisted_step] }) }, { [unlisted_step.id]: 3 }), [1]);
assert.deepEqual(optional({ 1: talk(1, { conditions: [unlisted_step, 'not'] }) }), [1]);
assert.deepEqual(optional({ 1: talk(1) }, {}, { 2: step(1) }), []);
assert.deepEqual(optional({ 1: talk(1) }, {}, { 2: { ...step(1), talks: [] } }), []);

const effect = talk(2, { begin_way: null, operations: [{ type: 'variable', action: 'set', id: 'var', value: 1 }] });
assert.deepEqual(optional({ 1: talk(1, { next_talks: [2] }), 2: effect }), []);
assert.deepEqual(optional({ 1: talk(1, { next_talks: [2] }), 2: { ...effect, conditions: [number_condition] } }), [1]);
assert.deepEqual(optional({ 1: talk(1), 2: { ...effect, begin_way: 'auto' } }), [1]);

const conditional_operation = talk(1, { operations: [
    { type: 'variable', action: 'set', id: 'other', value: 1, conditions: [number_condition] },
] });
assert.deepEqual(optional({ 1: conditional_operation }), [1]);
assert.deepEqual(optional({ 1: conditional_operation }, { var: 1 }), []);
assert.deepEqual(optional({ 1: talk(1, { operations: [
    { type: 'variable', action: 'set', id: 'var', value: 0 },
] }) }), [1]);
assert.deepEqual(optional({ 1: talk(1, { operations: [
    { type: 'variable', action: 'set', id: 'var', value: 1 },
    { type: 'variable', action: 'set', id: 'var', value: 0 },
] }) }), []);
assert.deepEqual(optional({ 1: talk(1, { operations: [
    { type: 'variable', action: 'input', id: 'var' },
] }) }), []);

for (const action of ['obtain', 'give', 'remove'] as const) assert.deepEqual(optional({ 1: talk(1, {
    operations: [{ type: 'item', action, items: [{ id: 1, count: 1 }] }],
}) }), []);

const optional_branch = talk(1, { dialogs: {
    1: dialog([2, 3]),
    2: dialog([], 'select'),
    3: { ...dialog([], 'select'), operations: [{ type: 'variable', action: 'set', id: 'var', value: 1 }] },
} });
assert.deepEqual(optional({ 1: optional_branch }, {}, {}, { '1:dialog:1:1': 2 }), []);
assert.deepEqual(optional({ 1: { ...optional_branch, dialogs: { ...optional_branch.dialogs,
    1: { ...dialog(), next_dialogs: [{ dialog: 2 }, { dialog: 3, conditions: [number_condition] }] },
} } }), [1]);
assert.deepEqual(optional({ 1: { ...optional_branch, dialogs: { ...optional_branch.dialogs,
    1: { ...dialog(), next_dialogs: [
        { dialog: 2, branches: [{ id: 'result', type: 'result', option: 0 }] },
        { dialog: 3, branches: [{ id: 'result', type: 'result', option: 1 }] },
    ] },
} } }, {}, {}, { '1:dialog:1:branch:result': 0 }), []);

assert.deepEqual(optional({ 1: talk(1, { dialogs: { 1: dialog([2, 3]), 2: dialog(),
    3: { ...dialog(), operations: [{ type: 'variable', action: 'set', id: 'var', value: 1 }] } } }) }), [1]);
assert.deepEqual(optional({ 1: talk(1, { dialogs: { 1: dialog([2]) } }) }), []);
assert.deepEqual(optional({ 1: talk(1, { next_talks: [2] }) }), []);
assert.deepEqual(optional({ 1: talk(1, { dialogs: { 1: dialog([1]) } }) }), []);

assert.deepEqual(optional({ 1: talk(1, { next_talks: [2] }), 2: talk(2, { begin_way: null }) }, {}, { 2: step(2) }), []);
assert.deepEqual(optional({ 1: talk(1, { priority: 1 }), 2: talk(1, { priority: 2,
    operations: [{ type: 'variable', action: 'set', id: 'var', value: 1 }] }) }), []);

const pure_only = run({ 1: talk(1), 2: talk(2) }, step(999));
assert.deepEqual(pure_only.segments, []);

console.log('task flow tests passed');
