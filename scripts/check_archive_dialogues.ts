import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build_npc_flow, get_npc_conditions } from '../app/utils/npc_flow';
import type { TaskConditionValues } from '../app/utils/task_condition';
import type { ArchiveItem } from '../app/types/archive';
import type { Npc } from '../app/types/npc';

function npc(item: ArchiveItem): Npc {
    return { name: item.name, npc_id: 0, birth_points: [], diagnostics: [], entry_talks: item.entry_talks,
        talks: Object.fromEntries(Object.entries(item.talks).map(([key, talk]) => [key, {
            ...talk, task: null, active_mode: '', source: item.source.table,
        }])) };
}
let topics = 0, lines = 0;
for (const lang of ['zh_hans', 'en']) {
    const sources = JSON.parse(fs.readFileSync('data/common/serenitea/source_ids.json', 'utf8'));
    const item: ArchiveItem = JSON.parse(fs.readFileSync(`data/${lang}/serenitea/items/${sources['companion-9002']}.json`, 'utf8'));
    const find = (id: number) => Object.keys(item.talks).find(key => item.talks[key]!.source_id === id)!;
    const key = find(6900207), ordinary = find(6900202);
    const state = item.talks[ordinary]!.conditions.find(token => typeof token !== 'string')!;
    assert(typeof state !== 'string' && state.type === 'boolean');
    const model = npc(item), values: TaskConditionValues = {};
    for (const condition of get_npc_conditions(model)) values[condition.id] = condition.type === 'step' ? 'finished' : condition.type === 'number' ? 0 : false;
    for (const value of [true, false]) {
        const flow = build_npc_flow(model, { ...values, [state.id]: value }, {});
        const menu = flow.segments[1]!;
        assert(menu.candidate_keys.includes(Number(value ? key : ordinary)));
        assert(!menu.candidate_keys.includes(Number(value ? ordinary : key)));
    }
    for (const category of ['serenitea', 'tcg']) {
        const directory = `data/${lang}/${category}/items`;
        for (const file of fs.readdirSync(directory)) {
            const entry: ArchiveItem = JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8'));
            if (!Object.keys(entry.talks).length) continue;
            const before = JSON.stringify(entry);
            const flow = build_npc_flow(npc(entry), {}, {});
            for (const segment of flow.segments) if (segment.talk_key !== undefined) assert(entry.talks[segment.talk_key]);
            assert.equal(JSON.stringify(entry), before);
            topics += Object.keys(entry.talks).length;
            lines += Object.values(entry.talks).reduce((n, talk) => n + Object.keys(talk.dialogs).length, 0);
        }
    }
}
const component = fs.readFileSync('app/components/ArchiveDialogues.vue', 'utf8');
assert(!component.includes('conditionsOnly'));
assert(!component.includes('view_options'));
assert(component.includes('<npc-dialogue-workspace'));
assert(!component.includes('show-titles'));
const workspace = fs.readFileSync('app/components/NpcDialogueWorkspace.vue', 'utf8');
assert(!workspace.includes('showTitles'));
const talk_component = fs.readFileSync('app/components/TaskTalk.vue', 'utf8');
assert(!talk_component.includes('props.title'));
assert(talk_component.includes("props.talk.objects.join(' / ')"));
const selector = fs.readFileSync('app/components/TalkFlowSelector.vue', 'utf8');
assert(selector.includes("segment.selector_type === 'successor'"));
assert(selector.includes('get_first_line(talks[key]!)'));
assert(workspace.includes('<talk-flow-selector :talks="npc.talks"'));
assert(workspace.includes(':condition_values="flow.state.values"'));
assert(workspace.includes('selections.value = { entry: selections.value.entry }'));
assert(fs.readFileSync('app/pages/travel-log/npc/[name].vue', 'utf8').includes('<npc-dialogue-workspace'));
console.log(`${topics} dialogue topics / ${lines} lines retained; condition browsing, mutually exclusive topics and source immutability passed.`);
