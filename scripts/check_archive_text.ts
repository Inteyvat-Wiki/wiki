import assert from 'node:assert/strict';
import { create_archive_processor } from '../server/utils/archive';
import { create_dialogue_processor } from '../server/utils/dialogue';
import { parse_settings } from '../server/utils/settings';
import type { ArchiveItem } from '../app/types/archive';
import { archive_images, archive_detail_images, archive_images_enabled, is_serenitea_companion } from '../shared/archive';

const settings = parse_settings(JSON.stringify({ traveller: 'aether', traveller_name: 'Traveler' }));
const t = (key: string) => key;
const processor = create_archive_processor(settings, t);
const raw = '\uE000archive {0} {1} {0}\\n{NICKNAME}';
const expected = '\uE000archive {0} {1} {0}<br>Traveler';
const page = processor.page({ id: 'sample', name: raw, description: raw, type: 'stage',
    icon: null, star: null, show: true, items: [], related_items: [] });
assert.equal(page.name, expected);
assert.equal(page.description, expected);
const source: ArchiveItem = {
    name: raw, type: 'stage', description: raw, sections: [{ title: raw, text: raw }],
    relations: [{ category: 'tcg', id: 'sample', name: raw, role: 'player' }], images: [], entry_talks: [1],
    source: { table: 'sample', id: '1', hashes: [] },
    classifications: [{ id: '9001', group_id: '16', group_name: raw, name: raw }],
    card_type: { id: 'event', name: raw }, tags: [{ id: 'food', name: raw, hidden: true }],
    talks: { 1: { source_id: 1, title: raw, priority: 0, begin_way: null, next_talks: [],
        trigger_ids: [], conditions: [], objects: [raw], trigger_points: [],
        dialogs: { 1: { content: raw, speaker: raw, role: 'npc', next_dialogs: [] } } } },
};
const item = processor.item(source);
assert.equal(item.sections[0]!.title, expected);
assert.equal(item.sections[0]!.text, expected);
assert.equal(item.relations[0]!.name, expected);
assert.equal(item.talks[1]!.title, expected);
assert.equal(item.talks[1]!.objects[0], expected);
assert.equal(item.talks[1]!.dialogs[1]!.content, expected);
assert.equal(item.talks[1]!.dialogs[1]!.speaker, expected);
assert.equal(source.description, raw, 'processing must not mutate the source');
assert.equal(item.card_type!.name, expected);
assert.equal(item.tags![0]!.name, expected);
assert.equal(item.tags![0]!.hidden, true);
assert.equal(processor.page({ ...page, card_type: source.card_type, tags: source.tags }).card_type!.name, expected);
assert.equal(source.tags![0]!.name, raw);
assert.deepEqual(item.classifications, [{ id: '9001', group_id: '16', group_name: expected, name: expected }]);
assert.deepEqual(processor.page({ ...page, classifications: source.classifications }).classifications, item.classifications);
assert.equal(source.classifications![0]!.name, raw);
assert.equal(create_dialogue_processor(settings, t).text('{NICKNAME}'), 'Traveler');
const formatted = processor.page({ ...page, name: '<color=#FFCC33FF>Title</color>',
    description: '<color=#{0}>Rule {1}</color> <color=#FFCC33>Hint</color>' });
assert.match(formatted.name, /^<span class="colored_content" style="color:rgba\(/);
assert(!/<\/?color\b/i.test(formatted.description));
assert(formatted.description.includes('data-source-color="#{0}"'));
assert(formatted.description.includes('Rule {1}'));
assert.match(formatted.description, /<span class="colored_content" style="color:rgba\([^\"]+\)">Hint<\/span>/);
const nested = processor.page({ ...page, description: '<color=#112233FF>A<color=#{0}>B</color>C</color>' });
assert.equal((nested.description.match(/<span\b/g) || []).length, 2);
assert.equal((nested.description.match(/<\/span>/g) || []).length, 2);
assert(!/<\/?color\b/i.test(nested.description));
const pictures = [{url:'/images/one.png',kind:'card'}, {url:'/images/one.png',kind:'icon'},
    {url:null}, {url:'/images/atlas.png',kind:'card_view:spinePrefab'}, {url:'/images/two.png',kind:'preview'}];
assert.deepEqual(archive_images(pictures).map(image => image.url), ['/images/one.png', '/images/two.png']);
assert.equal(pictures.length, 5, 'gallery filtering must not mutate source references');
const faces = [
    { url: '/images/card.png', kind: 'card' },
];
assert.deepEqual(archive_detail_images('tcg', 'card', faces).map(image => image.url), ['/images/card.png']);
assert.equal(archive_detail_images('tcg', 'card_back', faces).length, 1);
assert.equal(archive_detail_images('miliastra', 'card', faces).length, 1);
assert.equal(archive_detail_images('serenitea', 'companion', faces).length, 0);
assert.equal(archive_detail_images('tcg', 'stage', faces).length, 0);
assert(!archive_images_enabled('tcg', 'stage'));
assert(archive_images_enabled('tcg', 'player'));
assert(archive_images_enabled('tcg', 'card'));
assert(archive_images_enabled('miliastra', 'stage'));
assert.equal(faces.length, 1, 'gallery display must not mutate the converted publication assets');
assert(is_serenitea_companion('serenitea', 'companion'));
for (const [category, type] of [['serenitea', 'host'], ['serenitea', 'suite'], ['serenitea', 'furniture'],
    ['tcg', 'companion'], ['miliastra', 'companion'], ['misc', 'profile_picture']] as const) {
    assert(!is_serenitea_companion(category, type), `${category}/${type}: companion presentation must stay scoped`);
}
console.log('Archive text, colour markup, gallery deduplication, dialogue callback and legacy defaults passed.');
