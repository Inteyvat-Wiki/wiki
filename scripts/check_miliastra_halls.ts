import fs from 'node:fs';
import assert from 'node:assert/strict';
import { merge_entry_page } from '../shared/entry_page';
import { get_entry_page } from '../app/utils/entry_page';
import type { ArchiveItem, ArchivePage } from '../app/types/archive';

export async function run() { for (const lang of ['zh_hans', 'en']) {
    const pages: ArchivePage[] = JSON.parse(fs.readFileSync(`data/${lang}/miliastra/pages.json`, 'utf8'));
    const items = new Map<string, ArchiveItem>(pages.filter(page => page.type === 'hall').map(page =>
        [page.id, JSON.parse(fs.readFileSync(`data/${lang}/miliastra/items/${page.id}.json`, 'utf8'))]));
    const before = JSON.stringify([pages, [...items]]);
    const groups = pages.filter(page => page.group?.mode === 'variants' && page.show);
    assert.equal(groups.length, 9);
    assert.equal(pages.filter(page => page.type === 'hall' && page.show).length, 11);
    for (const page of groups) {
        const root = page.id, ids = page.items;
        const combined = merge_entry_page(page, ids.map(id => items.get(id)!));
        assert.equal(combined.description, '');
        for (const id of ids) {
            const original = items.get(id)!;
            assert.deepEqual(await get_entry_page(id, async () => pages, async key => items.get(key)!), combined, 'old variant URLs return the same merged detail');
            assert(combined.sections.some(section => section.title === original.name && section.text === original.description));
            assert(original.images.every(image => combined.images.some(other => other.name === image.name && other.url === image.url)));
            assert.equal(pages.find(page => page.id === id)!.show, id === root);
            assert(page.description.includes(original.name), 'both variant names remain searchable');
            assert(original.source.hashes.every(hash => combined.source.hashes.includes(hash)));
        }
    }
    for (const source of ['hall-1', 'hall-2']) {
        const page = pages.find(page => page.source_id === source)!;
        assert.deepEqual(await get_entry_page(page.id, async () => pages, async key => items.get(key)!), items.get(page.id));
    }
    const public_page = pages.find(page => page.source_id === 'hall-1011')!;
    assert.deepEqual(await get_entry_page('hall-1011', async () => pages, async key => items.get(key === 'hall-1011' ? public_page.id : key)!),
        await get_entry_page(public_page.id, async () => pages, async key => items.get(key)!));
    assert.equal(JSON.stringify([pages, [...items]]), before, 'cached source data stays immutable');
    console.log(`${lang}: 20 halls -> 11 visible entries; all 9 pairs retain both names, descriptions, images and old URLs.`);
} }
