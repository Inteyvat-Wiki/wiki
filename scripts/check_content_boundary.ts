import assert from 'node:assert/strict';
import { CONTENT_CATEGORIES } from '@inteyvat-wiki/wiki-contracts/registry';
import { accept_export_document, accept_content_pages, assert_content_category, parse_id_index, parse_id_aliases, parse_menu } from '../server/utils/content_boundary';
import { CONTENT_ROUTES, content_item_path } from '../shared/content_routes';
import { create_archive_processor } from '../server/utils/archive';
import { parse_settings } from '../server/utils/settings';
import type { ArchiveItem } from '@inteyvat-wiki/wiki-contracts/archive';

assert.deepEqual(Object.keys(CONTENT_ROUTES).sort(), [...CONTENT_CATEGORIES].sort());
assert.equal(CONTENT_CATEGORIES.length, 17);
for (const invalid of ['map', 'menu', 'quest-item', '../task', 'constructor', undefined]) {
    assert.throws(() => assert_content_category(invalid), /Invalid content category/);
}
for (const [category, path] of [['living_being', '/api/living-being'], ['quest_item', '/api/quest-item'], ['chapter_group', '/api/chapter-group'], ['tcg', '/api/archive/tcg']] as const) {
    assert.equal(content_item_path(category, 'quest-v1.x'), `${path}/quest-v1.x`);
    assert.equal(content_item_path(category, 'a/b?#'), `${path}/a%2Fb%3F%23`);
}
assert.deepEqual([...parse_id_index(['quest-v1.x', 'a'])], ['quest-v1.x', 'a']);
for (const invalid of [{}, [1], ['../a']]) assert.throws(() => parse_id_index(invalid));
assert.equal(parse_id_aliases({ 'card-1': 'card-a' })['card-1'], 'card-a');
for (const invalid of [[], { a: 1 }, { a: '../outside' }]) assert.throws(() => parse_id_aliases(invalid));
const page = { id: 'card-a', name: 'A', type: 'card', description: '', icon: null, star: null, show: true, items: ['card-a'], related_items: [] };
assert.deepEqual(accept_content_pages('tcg', [page]), [page]);
for (const invalid of [null, {}, [null], [{ ...page, items: 'card-a' }], [{ ...page, group: { id: 'a', mode: 'bad' } }]]) {
    assert.throws(() => accept_content_pages('tcg', invalid));
}
assert.throws(() => accept_content_pages('serenitea', [page]), /Invalid serenitea type/);
assert.throws(() => accept_content_pages('tcg', [{ ...page, card_type: { id: 'equip', name: '' } }]));
assert.throws(() => accept_content_pages('misc', [{ ...page, type: 'tutorial', tutorial_category: 'unknown' }]));
for (const invalid of [null, [], 'text', 1]) assert.throws(() => accept_export_document('character', invalid));
assert.throws(() => accept_export_document('misc', { type: 'tutorial', loading_situations: [{ id: '1', action: 'login', areas: [] }] }));
assert.throws(() => accept_export_document('misc', { type: 'graeae_message', message_thread: { nodes: [{ kind: 'unknown' }] } }));
// This deliberately passes: we check containers/discriminants, NOT complete nested schemas.
assert.deepEqual(accept_export_document('character', { skills: 'unchecked' }), { skills: 'unchecked' });
const menu = { character: { icon: '/image.png', extra: true } };
assert.deepEqual(parse_menu(menu), menu);
assert.throws(() => parse_menu({ character: { icon: 1 } }));
const archive: ArchiveItem<'tcg'> = { name: '{NICKNAME}', type: 'card', description: '{0}', sections: [], images: [], relations: [], talks: {}, entry_talks: [], source: { table: 'fixture', id: '1', hashes: [] }, card_type: { id: 'event', name: '{NICKNAME}' } };
const before = JSON.stringify(archive);
const processed = create_archive_processor(parse_settings('{"traveller_name":"Test"}'), (key: string) => key).item(archive);
assert.equal(processed.name, 'Test');
assert.equal(processed.card_type?.name, 'Test');
assert.equal(processed.description, '{0}');
assert.equal(JSON.stringify(archive), before);
console.log('Content boundaries: category routes, JSON containers, base pages, directory metadata and explicit trust limits passed.');
