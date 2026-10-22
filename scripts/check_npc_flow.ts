import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build_npc_flow, get_npc_conditions } from '../app/utils/npc_flow';
import { build_task_flow } from '../app/utils/task_flow';
import type { Npc } from '../app/types/npc';
import type { TaskConditionValues } from '../app/utils/task_condition';

const timmie: Npc = JSON.parse(fs.readFileSync('data/zh_hans/npc/items/timmie.json', 'utf8'));
const values: TaskConditionValues = {};
for (const condition of get_npc_conditions(timmie)) {
    values[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
}
const flow = build_npc_flow(timmie, values, {});
assert.equal(timmie.talks[flow.entry_key!]!.source_id, 6156701);
assert.equal(flow.segments[0]!.selector_key, 'entry');
const menu = flow.segments[1]!;
assert.equal(menu.selector_type, 'successor');
assert(menu.candidate_keys.length >= 3, 'topics for the same NPC must coexist');
assert.deepEqual(menu.candidate_keys.map(key => timmie.talks[key]!.source_id).filter(id => id >= 6156702 && id <= 6156704),
    [6156702, 6156703, 6156704]);
const key = menu.candidate_keys.find(key => timmie.talks[key]!.source_id === 6156702)!;
const selected = build_npc_flow(timmie, values, { [menu.selector_key]: key });
assert.equal(selected.segments[1]!.talk_key, key);
assert(selected.segments[1]!.items.length > 1);
assert.equal(build_npc_flow(timmie, values, { [menu.selector_key]: -1 }).segments[1]!.talk_key, menu.talk_key);

const fixture: Npc = {
    ...timmie, entry_talks: [1], talks: {
        1: { ...timmie.talks[key]!, conditions: [], next_talks: [2, 3], initial_dialogs: [{ dialog: 7 }], dialogs: {
            1: { role: 'npc', content: 'unreachable', next_dialogs: [] },
            7: { role: 'npc', content: 'explicit initial', next_dialogs: [],
                operations: [{ type: 'variable', action: 'set', id: 'flag', value: true }] },
        } },
        2: { ...timmie.talks[key]!, conditions: [{ type: 'boolean', id: 'flag', value: true, title: '', subtitle: '' }],
            next_talks: [1], initial_dialogs: [{ dialog: 1 }], dialogs: {
                1: { role: 'npc', content: 'flag set', next_dialogs: [] },
            } },
        3: { ...timmie.talks[key]!, conditions: [{ type: 'boolean', id: 'unknown', value: true, title: '', subtitle: '' }] },
    },
};
const initial = build_npc_flow(fixture, {}, {});
assert.deepEqual(initial.segments[1]!.candidate_keys, [2]);
assert.equal(initial.segments[0]!.items.some(item => item.kind === 'dialog' && item.dialog.content === 'unreachable'), false);
const next = build_npc_flow(fixture, {}, { [initial.segments[1]!.selector_key]: 2 });
assert.equal(next.state.values.flag, true);
assert.equal(next.segments.length, 2);
const cycle = build_npc_flow(fixture, {}, {
    [initial.segments[1]!.selector_key]: 2, 'npc:talk:2': 1,
});
assert.equal(cycle.segments.length, 2);
fixture.talks[1]!.conditions = [{ type: 'boolean', id: 'unknown', value: true, title: '', subtitle: '' }];
assert.equal(build_npc_flow(fixture, {}, {}).segments.length, 0);

// The same dialogue engine still supports isolated dialogue previews without following successors.
const preview = build_task_flow({
    task: timmie, current_step: 0, step_keys: [], initial_talk: flow.entry_key,
    state: { values, assigned: new Set(), completed: new Set() }, selections: {}, input_values: values,
});
assert.equal(preview.segments.length, 1);

// An NPC conversation must stop at its terminal, even if another independent entrance becomes available.
fixture.talks[1]!.conditions = [];
fixture.talks[2]!.next_talks = [];
fixture.talks[3]!.conditions = [];
fixture.entry_talks = [1, 3];
const bounded = build_npc_flow(fixture, {}, {});
assert.deepEqual(bounded.segments.map(segment => segment.talk_key), [1, 2]);

// Conditions on successors see values set by the previous talk; absent values remain unknown.
fixture.talks[3]!.conditions = [{ type: 'boolean', id: 'unset', value: false, title: '', subtitle: '' }];
assert.deepEqual(build_npc_flow(fixture, {}, {}).segments[1]!.candidate_keys, [2]);

// Nested topics share the same successor selector and preserve lower priorities and explicit order.
const sara: Npc = JSON.parse(fs.readFileSync('data/zh_hans/npc/items/sara.json', 'utf8'));
const sara_values: TaskConditionValues = {};
for (const condition of get_npc_conditions(sara)) {
    sara_values[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
}
const sara_flow = build_npc_flow(sara, sara_values, {});
const sara_menu = sara_flow.segments[1]!;
const nested = sara_menu.candidate_keys.find(key => sara.talks[key]!.source_id === 41702)!;
assert(nested);
const nested_flow = build_npc_flow(sara, sara_values, { [sara_menu.selector_key]: nested });
assert.equal(nested_flow.segments[2]!.selector_type, 'successor');
assert(nested_flow.segments[2]!.candidate_keys.every(key => sara.talks[nested]!.next_talks.includes(key)));

// Check every exported NPC against the shared engine, including condition-gated and cyclic graphs.
let checked = 0;
for (const lang of ['zh_hans', 'en']) {
    const pages: { id: string }[] = JSON.parse(fs.readFileSync(`data/${lang}/npc/pages.json`, 'utf8'));
    for (const page of pages) {
        const npc: Npc = JSON.parse(fs.readFileSync(`data/${lang}/npc/items/${page.id}.json`, 'utf8'));
        const defaults: TaskConditionValues = {};
        for (const condition of get_npc_conditions(npc)) {
            defaults[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
        }
        const result = build_npc_flow(npc, defaults, {});
        const visited = new Set<number>();
        for (const [index, segment] of result.segments.entries()) {
            if (index > 0) {
                const previous = npc.talks[result.segments[index - 1]!.talk_key!]!;
                assert.equal(segment.selector_type, 'successor', `${page.id}: unexpected independent entrance`);
                assert(segment.candidate_keys.every(key => previous.next_talks.includes(key)));
                assert.deepEqual(segment.candidate_keys,
                    previous.next_talks.filter(key => segment.candidate_keys.includes(key)));
            }
            if (segment.talk_key === undefined) continue;
            assert(!visited.has(segment.talk_key));
            visited.add(segment.talk_key);
        }
        checked++;
    }
}
console.log(`${checked} NPC language variants checked against the shared dialogue engine`);
console.log('NPC flow checks passed: shared successor selectors, explicit initial, conditions, variables, terminals and nested topics');
