import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INLINE_LINK_CATEGORIES, inline_link_text, inline_map_link_text, map_location_path, parse_inline_links, is_inline_link_id } from '@inteyvat-wiki/wiki-contracts/inline_link';
import { entry_relation_path } from '../shared/archive_display';
import { archive_relation_path } from '../shared/archive';

for (const category of ['serenitea', 'tcg', 'miliastra', 'misc'] as const) {
    assert.equal(INLINE_LINK_CATEGORIES[category].path, `/${category}`);
    for (const lang of ['zh_hans', 'en']) {
        const pages = JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`, 'utf8'));
        for (const page of pages) {
            const token = inline_link_text(category, page.id, 'icon')!;
            assert.deepEqual(parse_inline_links(token), [{ category, id: page.id, style: 'icon' }]);
            assert.equal(entry_relation_path(category, page.id), `/${category}/${page.id}`);
            assert.equal(archive_relation_path(category, page.id), entry_relation_path(category, page.id));
        }
    }
}
assert.equal(inline_link_text('quest_item', 'item-1'), '[[iw:quest-item/item-1?style=text]]');
assert.equal(inline_link_text('chapter_group', 'chapter-1'), '[[iw:chapter-group/chapter-1?style=text]]');
assert.deepEqual(parse_inline_links('[[iw:task/quest-v1.x]]'), [{ category: 'task', id: 'quest-v1.x', style: 'text' }]);
for (const id of ['', '../entry', 'a..b', 'a/b', '.entry', 'entry.', 'a?x=1']) {
    assert(!is_inline_link_id(id));
    assert.equal(inline_link_text('miliastra', id), null);
}
for (const category of ['source', 'unknown', 'toString', '__proto__']) assert.equal(inline_link_text(category, 'entry'), null);
for (const text of ['[[iw:misc/../entry]]', '[[iw:source/entry]]', '[[iw:tcg/card?style=unknown]]']) {
    assert.deepEqual(parse_inline_links(text), [text]);
}
assert.deepEqual(parse_inline_links('\\[[iw:tcg/card]]'), ['[[iw:tcg/card]]']);
const mapText = inline_map_link_text('teyvat', -100.5, 200)!;
const mapToken = parse_inline_links(mapText)[0];
assert(mapToken && typeof mapToken === 'object' && mapToken.category === 'map');
assert.equal(map_location_path(mapToken), '/map?scene=teyvat&x=-100.5&z=200');
assert.equal(inline_link_text('map', 'teyvat'), null, 'Map locations cannot go through the content lookup API');
for (const component of ['ArchiveDetail', 'MiscDetail']) {
    const template = fs.readFileSync(`app/components/${component}.vue`, 'utf8');
    const relations = template.match(/<el-space wrap class="relation-links">[\s\S]*?<\/el-space>/)?.[0];
    assert(relations?.includes('inline_link_text(relation.category, relation.id'));
    assert(!relations?.includes('NuxtLink') && !relations?.includes('el-tag'), 'relations must use the common inline-link renderer');
}
console.log('Common inline links: bilingual IDs in all four categories, aliases, version IDs, unsafe input and relation renderers passed.');
