import assert from 'node:assert/strict';
import { create_misc_processor } from '../server/utils/misc';
import { create_archive_text_processor } from '../server/utils/archive_text';
import { parse_settings } from '../server/utils/settings';
import { misc_fixture } from './check_misc_contract';

const processor = create_misc_processor(parse_settings(JSON.stringify({ traveller: 'aether', traveller_name: 'Traveler' })), (key: string) => key);
const text = '<color=#FFCC33>Title</color>\\n{NICKNAME} {0} {1}\r\n<color=#{0}>Dynamic {2}</color>';
const source = { ...misc_fixture, name: text, description: text,
    sections: misc_fixture.sections.map(section => ({ ...section, title: text, text })),
    relations: misc_fixture.relations.map(relation => ({ ...relation, name: text })) };
const snapshot = JSON.stringify(source);
const item = processor.item(source);
assert(!/<\/?color\b/i.test(item.description));
assert(item.description.includes('data-source-color="#{0}"'));
assert(item.description.includes('Traveler {0} {1}<br>'));
assert(item.description.includes('Dynamic {2}'));
assert.match(item.name, /^<span class="colored_content" style="color:rgba\(/);
assert.equal(item.sections.length, 3, 'every platform section survives');
assert.deepEqual(item.sections.map(section => section.kind), ['pc', 'mobile', 'ps']);
for (const section of item.sections) assert.equal(section.text, item.description);
assert.equal(item.relations[0]!.name, item.description);
assert.equal(JSON.stringify(source), snapshot, 'source must not be mutated');
assert.deepEqual(item.source, source.source);
assert.deepEqual(item.images, source.images);
assert.deepEqual(item.diagnostics, source.diagnostics);
const page = processor.page({ id: 'tutorial-1771', type: 'tutorial', name: text, description: text,
    icon: null, star: null, show: true, items: ['tutorial-1771'], related_items: [] });
assert.equal(page.name, item.name);
assert.equal(page.description, item.description);

const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script><svg onload=alert(3)></svg><a href="javascript:alert(4)">link</a>';
const safe = processor.item({ ...misc_fixture, name: hostile, description: hostile,
    sections: [{ title: hostile, text: hostile }], relations: [{ ...misc_fixture.relations[0]!, name: hostile }] });
for (const output of [safe.name, safe.description, safe.sections[0]!.title!, safe.sections[0]!.text, safe.relations[0]!.name]) {
    assert(!/<(?:img|script|svg|a)\b/i.test(output), 'raw HTML must never reach SSR');
    assert(output.includes('&lt;img'));
}
const hostile_settings = parse_settings(JSON.stringify({ traveller_name: hostile, wanderer_name: hostile, littleone_name: hostile }));
const process = create_archive_text_processor(hostile_settings, () => hostile);
for (const marker of ['{NICKNAME}', '{REALNAME[ID(1)]}', '{REALNAME[ID(2)]}']) assert(!process(marker).includes('<img'));
assert(!create_archive_text_processor(parse_settings(undefined), () => hostile)('{NICKNAME}').includes('<img'));
const situation = processor.item({ ...misc_fixture, loading_situations: [{ id: '1', action: 'transport',
    areas: [{ id: '1100', name: hostile }], terrain: 'city' },
    { id: '2', action: 'certain_dungeon', dungeons: [{ id: '149', name: hostile }] }] });
assert(!situation.loading_situations![0]!.areas![0]!.name.includes('<img'));
assert(situation.loading_situations![0]!.areas![0]!.name.includes('&lt;img'));
assert(!situation.loading_situations![1]!.dungeons![0]!.name.includes('<img'));
const color = process('<color=x" onmouseover="alert(1)>Text</color>');
assert(!color.includes(' onmouseover="'), 'unresolved colors cannot add HTML attributes');
assert(color.includes('&quot;'));
assert.equal(process('<b>Bold</b><br><i>Italic</i>'), '<b>Bold</b><br><i>Italic</i>');
assert.equal(process('\uE000archive {0}'), '\uE000archive {0}', 'sentinel collisions must be protected');
assert.equal(process("Traveler's & <source>"), 'Traveler&apos;s &amp; &lt;source&gt;');
console.log('Misc server text: HTML injection, color, placeholders, newlines, platform sections and metadata passed.');
