import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build_npc_flow, get_npc_conditions } from '../app/utils/npc_flow';
import type { Npc } from '../app/types/npc';
import type { TaskConditionValues } from '../app/utils/task_condition';

const timmie: Npc = JSON.parse(fs.readFileSync('data/zh_hans/npc/items/timmie.json', 'utf8'));
const values: TaskConditionValues = {};
for (const condition of get_npc_conditions(timmie)) {
    values[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
}
const flow = build_npc_flow(timmie, values, {});
assert.equal(timmie.talks[flow.entry_key!]!.source_id, 6156701);
const menu = flow.segments[0]!;
assert(menu.menu_keys.length >= 3, 'topics for the same NPC must coexist');
assert.deepEqual(menu.menu_keys.map(key => timmie.talks[key]!.source_id).filter(id => id >= 6156702 && id <= 6156704),
    [6156702, 6156703, 6156704]);
const key = menu.menu_keys.find(key => timmie.talks[key]!.source_id === 6156702)!;
const selected = build_npc_flow(timmie, values, { [menu.menu_selector_key]: key });
assert.equal(selected.segments[1]!.talk_key, key);
assert(selected.segments[1]!.segment.items.length > 1);
assert.equal(build_npc_flow(timmie, values, { [menu.menu_selector_key]: -1 }).segments.length, 1);

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
assert.deepEqual(initial.segments[0]!.menu_keys, [2]);
assert.equal(initial.segments[0]!.segment.items.some(item => item.kind === 'dialog' && item.dialog.content === 'unreachable'), false);
const next = build_npc_flow(fixture, {}, { [initial.segments[0]!.menu_selector_key]: 2 });
assert.equal(next.state.values.flag, true);
assert.equal(next.segments.length, 2);
const cycle = build_npc_flow(fixture, {}, {
    [initial.segments[0]!.menu_selector_key]: 2, [next.segments[1]!.menu_selector_key]: 1,
});
assert.equal(cycle.segments.length, 2);
fixture.talks[1]!.conditions = [{ type: 'boolean', id: 'unknown', value: true, title: '', subtitle: '' }];
assert.equal(build_npc_flow(fixture, {}, {}).segments.length, 0);
console.log('NPC flow checks passed: concurrent topics, explicit initial, conditions, persistent variables and cycles');
