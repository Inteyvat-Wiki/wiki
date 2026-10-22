import assert from 'node:assert/strict';
import { build_task_flow, get_trigger_candidates } from '../app/utils/task_flow';
import { build_npc_flow } from '../app/utils/npc_flow';
import type { TaskConditionToken, TaskStep, TaskTalk } from '../app/types/travel_log';
import type { Npc } from '../app/types/npc';

function boolean(id: string, value = true): TaskConditionToken {
    return { type: 'boolean', id, value, title: '', subtitle: '' };
}

function talk(priority: number, extra: Partial<TaskTalk> = {}): TaskTalk {
    return { priority, begin_way: 'manual', next_talks: [], trigger_ids: ['npc:1'], conditions: [],
        objects: [], trigger_points: [], dialogs: { 1: { role: 'npc', content: '', next_dialogs: [] } }, ...extra };
}

function step(talks: number[], finish_conditions: TaskConditionToken[] = []): TaskStep {
    return { hidden: false, description: '', talks, finish_conditions, fail_conditions: [] };
}

function run(talks: Record<number, TaskTalk>, current: TaskStep, selections = {}, values = {}) {
    return build_task_flow({ task: { talks, steps: { 1: current } }, step: current,
        current_step: 1, step_keys: [1], selections, input_values: {}, include_optional: true,
        state: { values, assigned: new Set(), completed: new Set() } });
}

const entrances = { talks: {
    1: talk(5), 2: talk(5), 3: talk(1),
    4: talk(1, { trigger_ids: ['npc:2'] }), 5: talk(0, { trigger_ids: [] }),
} };
assert.deepEqual(get_trigger_candidates(entrances, [1, 2, 3, 4, 5]), [1, 2, 4, 5]);
assert.deepEqual(get_trigger_candidates(entrances, [3, 2, 1]), [2, 1]);

// Menus retain lower-priority successors; default search can choose them to finish the step.
const menu: Record<number, TaskTalk> = {
    1: talk(10, { next_talks: [2, 3], operations: [{ type: 'variable', action: 'set', id: 'open', value: true }] }),
    2: talk(9, { conditions: [boolean('open')], operations: [{ type: 'variable', action: 'set', id: 'open', value: false }] }),
    3: talk(1, { conditions: [boolean('open')] }),
};
const finish = step([1, 2, 3], [{ type: 'talk', talk: 3 }]);
const initial = run(menu, finish);
assert.equal(initial.segments[0]!.talk_key, 1);
assert.equal(initial.segments[0]!.selector_type, 'entrance');
assert.deepEqual(initial.segments[1]!.candidate_keys, [2, 3]);
assert.equal(initial.segments[1]!.selector_type, 'successor');
assert.equal(initial.segments[1]!.talk_key, 3);
assert.equal(run(menu, finish, { '1:talk:1': 2 }).segments[1]!.talk_key, 2);

// A menu can be tagged AUTO, and its first line can be NPC instead of player.
for (const begin_way of ['manual', 'auto'] as const) {
    const branches = { ...menu, 2: { ...menu[2]!, begin_way }, 3: { ...menu[3]!, begin_way, priority: 9 } };
    const result = run(branches, finish);
    assert.deepEqual(result.segments[1]!.candidate_keys, [2, 3]);
    assert.equal(result.segments[1]!.talk_key, 3);
}

// Successor conditions see operations performed by the preceding dialogue.
const guarded = { ...menu, 2: { ...menu[2]!, conditions: [boolean('open', false)] } };
assert.deepEqual(run(guarded, finish).segments[1]!.candidate_keys, [3]);

// Re-triggering after unavailable successors is an entrance choice, not a menu.
const retrigger = run({
    ...menu,
    1: { ...menu[1]!, next_talks: [2] },
    2: { ...menu[2]!, conditions: [boolean('unavailable')] },
}, finish);
assert.equal(retrigger.segments[1]!.talk_key, 3);
assert.equal(retrigger.segments[1]!.selector_type, 'entrance');

// Optionality must inspect every explicit successor, including a lower-priority effect.
const effect = { type: 'number' as const, id: 'result', title: '', subtitle: '', comparison: 'equal' as const, value: 1 };
const optional = run({
    1: talk(10, { next_talks: [2, 3] }),
    2: talk(9),
    3: talk(1, { operations: [{ type: 'variable', action: 'set', id: 'result', value: 1 }] }),
}, step([], [effect]));
assert.equal(optional.segments[0]!.talk_key, 1);
assert.deepEqual(optional.segments[1]!.candidate_keys, [2, 3]);
assert.equal(optional.state.values.result, 1);

// Independent entrances retain their own winners, and equal-priority roots stay selectable.
const roots = run({ 1: talk(5), 2: talk(5), 3: talk(1) }, step([1, 2, 3], [{ type: 'talk', talk: 2 }]));
assert.deepEqual(roots.segments[0]!.candidate_keys, [1, 2]);
assert.equal(roots.segments[0]!.selector_type, 'entrance');
assert.equal(roots.segments[0]!.talk_key, 1);
assert.equal(run({ 1: talk(5), 2: talk(5) }, step([1, 2], [{ type: 'talk', talk: 2 }]),
    { '1:talk:start': 2 }).segments[0]!.talk_key, 2);

// Ancient Terminal: all eight combinations have exactly one winning entrance.
const terminal: Record<number, TaskTalk> = {
    1: talk(10, { conditions: [boolean('finished'), boolean('friendship'), 'and'] }),
    2: talk(9, { conditions: [boolean('finished', false), boolean('friendship'), 'and'] }),
    3: talk(8, { conditions: [boolean('finished'), boolean('item'), 'and'] }),
    4: talk(7, { conditions: [boolean('finished')] }),
    5: talk(6, { conditions: [boolean('item')] }),
    6: talk(5),
};
const terminal_step = step([1, 2, 3, 4, 5, 6], [boolean('unused')]);
for (const finished of [false, true]) for (const friendship of [false, true]) for (const item of [false, true]) {
    const expected = friendship ? finished ? 1 : 2 : finished ? item ? 3 : 4 : item ? 5 : 6;
    const result = run(terminal, terminal_step, {}, { finished, friendship, item });
    assert.deepEqual(result.segments[0]!.candidate_keys, [expected]);
    assert.equal(result.segments[0]!.talk_key, expected);
}

// NPC startup also removes lower priorities, but leaves its topic menu untouched.
const npc_talk = (value: TaskTalk, source_id: number) => ({ ...value, source_id,
    title: '', task: null, active_mode: '', source: '' });
const npc: Npc = { name: '', npc_id: 1, birth_points: [], diagnostics: [], entry_talks: [1, 2, 3], talks: {
    1: npc_talk(talk(5, { next_talks: [4, 5] }), 1),
    2: npc_talk(talk(5), 2), 3: npc_talk(talk(1), 3),
    4: npc_talk(talk(9), 4), 5: npc_talk(talk(1), 5),
} };
const npc_flow = build_npc_flow(npc, {}, {});
assert.deepEqual(npc_flow.entry_keys, [1, 2]);
assert.deepEqual(npc_flow.segments[1]!.candidate_keys, [4, 5]);
assert.equal(npc_flow.segments[1]!.selector_type, 'successor');
assert.equal(build_npc_flow(npc, {}, { entry: 3 }).entry_key, 1);
assert.equal(build_npc_flow(npc, {}, { entry: 2 }).entry_key, 2);
const automatic_npc: Npc = { ...npc, talks: { ...npc.talks, 3: { ...npc.talks[3]!, begin_way: 'auto' } } };
assert.deepEqual(build_npc_flow(automatic_npc, {}, {}).entry_keys, [3]);
console.log('Task priority checks passed: entrances, menus, state changes, default search, optionality and terminal variants');
