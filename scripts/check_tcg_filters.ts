import assert from 'node:assert/strict';
import fs from 'node:fs';
import { archive_card_options, archive_card_tag_groups, archive_tag_cascader_props, filter_archive_cards, filter_archive_pages } from '../app/utils/archive_list';
import { archive_sorted_tags, archive_tag_group } from '../shared/archive_tags';
import type { ArchiveItem, ArchivePage } from '../app/types/archive';

const fixture = [
    { id: 'a', name: 'Apple', description: '', type: 'card', show: true, card_type: { id: 'event', name: 'Event' }, tags: [{ id: 'food', name: 'Food' }, { id: 'talent', name: 'Talent' }] },
    { id: 'b', name: 'Bow', description: '', type: 'card', show: true, card_type: { id: 'equip', name: 'Equipment' }, tags: [{ id: 'talent', name: 'Talent' }, { id: 'hidden', name: 'Hidden', hidden: true }] },
    { id: 'c', name: 'Hidden', description: '', type: 'card', show: false, card_type: { id: 'hidden', name: 'Hidden' }, tags: [] },
];
const snapshot = JSON.stringify(fixture);
const pages = filter_archive_pages(fixture, '', 'card');
assert.deepEqual(archive_card_options(fixture, 'card_type').map(option => option.id), ['event', 'equip']);
assert.deepEqual(archive_card_options(fixture, 'tags').map(option => option.id), ['food', 'talent']);
assert.deepEqual(filter_archive_cards(pages, 'all', ['talent']).map(page => page.id), ['a', 'b']);
assert.deepEqual(filter_archive_cards(pages, 'event', ['food', 'talent']).map(page => page.id), ['a']);
assert.equal(filter_archive_cards(pages, 'equip', ['food', 'talent']).length, 0);
assert.equal(filter_archive_cards(pages, 'all', ['hidden']).length, 0);
assert.equal(filter_archive_cards(filter_archive_pages(fixture, 'bow', 'card'), 'equip', ['talent']).length, 1);
assert.equal(JSON.stringify(fixture), snapshot);
assert.equal(archive_tag_cascader_props.multiple, true);
assert.equal(archive_tag_cascader_props.checkStrictly, true);
assert.equal(archive_tag_cascader_props.emitPath, false);
assert.equal((archive_tag_cascader_props.disabled as Function)({ children: [{}] }), true);
assert.equal((archive_tag_cascader_props.disabled as Function)({ value: 'element_cryo' }), false);
const unsorted = [
    { id: 'food', name: 'Food', order: 50 },
    { id: 'element_pyro', name: 'Pyro', order: 12 },
    { id: 'element_cryo', name: 'Cryo', order: 10 },
    { id: 'weapon_bow', name: 'Bow', order: 1 },
    { id: 'future', name: 'Future' },
    { id: 'hidden', name: 'Hidden', hidden: true },
];
assert.deepEqual(archive_sorted_tags(unsorted).map(tag => tag.id), [
    'element_cryo', 'element_pyro', 'weapon_bow', 'food', 'future',
]);
assert.equal(archive_tag_group('future'), 'other', 'new tags must remain selectable');
assert.equal(unsorted[0]!.id, 'food', 'sorting must not mutate source order');

let bilingual_order: string[] | undefined;
for (const lang of ['zh_hans', 'en']) {
    const pages: ArchivePage[] = JSON.parse(fs.readFileSync(`data/${lang}/tcg/pages.json`, 'utf8'));
    const cards = pages.filter(page => page.type === 'card');
    assert.equal(cards.length, 629);
    const counts: Record<string, number> = {};
    for (const page of cards) {
        const item: ArchiveItem = JSON.parse(fs.readFileSync(`data/${lang}/tcg/items/${page.id}.json`, 'utf8'));
        assert(page.card_type?.name);
        assert(Array.isArray(page.tags));
        assert(page.tags.every(tag => Number.isInteger(tag.order)));
        assert.deepEqual(page.card_type, item.card_type);
        assert.deepEqual(page.tags, item.tags);
        counts[page.card_type.id] = (counts[page.card_type.id] || 0) + 1;
    }
    assert.deepEqual(counts, { character: 147, equipment: 269, event: 125, support: 88 });
    assert.equal(archive_card_options(pages, 'card_type').length, 4);
    assert(!archive_card_options(pages, 'tags').some(tag => tag.id === 'non_discoverable'));
    const groups = archive_card_tag_groups(pages, key => key);
    assert.deepEqual(groups.map(group => group.value), ['tag-group:element', 'tag-group:weapon', 'tag-group:affiliation', 'tag-group:attribute', 'tag-group:other']);
    const ordered = groups.flatMap(group => group.children.map(tag => tag.value));
    assert.equal(ordered.length, new Set(ordered).size);
    assert.deepEqual(new Set(ordered), new Set(archive_card_options(pages, 'tags').map(tag => tag.id)));
    assert.deepEqual(archive_card_tag_groups([...pages].reverse(), key => key), groups, 'group order must not depend on card traversal order');
    if (bilingual_order) assert.deepEqual(ordered, bilingual_order, 'language must not affect tag order');
    else bilingual_order = ordered;
    assert.equal(filter_archive_cards(cards, 'all', ['tag-group:element']).length, 0, 'group IDs must never match tags');
    const weapon = filter_archive_cards(cards, 'character', ['element_cryo', 'weapon_bow']);
    assert(weapon.length > 0);
    assert.equal(filter_archive_cards(cards, 'event', ['element_cryo']).length, 0);
    console.log(`${lang}: 629 card metadata records and combined type/multi-tag filters passed.`);
}
