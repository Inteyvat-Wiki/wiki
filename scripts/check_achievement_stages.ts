import fs from 'node:fs';
import assert from 'node:assert/strict';
import { merge_entry_page, resolve_page_relations } from '../shared/entry_page';
import { get_entry_page } from '../app/utils/entry_page';
import { misc_collection_members } from '../app/utils/misc';
import type { MiscItem, MiscPageData } from '../app/types/misc';
export async function run() { for (const lang of ['zh_hans', 'en']) {
    const directory = `data/${lang}/misc/items`;
    const pages: MiscPageData[] = JSON.parse(fs.readFileSync(`data/${lang}/misc/pages.json`, 'utf8'));
    const items = new Map<string, MiscItem>(pages.filter(p => p.type === 'achievement').map(p =>
        [p.id, JSON.parse(fs.readFileSync(`${directory}/${p.id}.json`, 'utf8'))]));
    const before = JSON.stringify([...items]);
    const groups = pages.filter(page => page.group?.mode === 'stages' && page.show);
    let chains = 0;
    for (const page of groups) {
        const root = page.id, chain = page.items;
        chains++;
        const combined = merge_entry_page(page, chain.map(id => items.get(id)!));
        for (const id of chain) {
            assert.deepEqual(await get_entry_page(id, async () => pages, async key => items.get(key)!), combined);
            assert(combined.sections.some(s => s.text === items.get(id)!.description));
            assert.equal(pages.find(p => p.id === id)!.show, root === id);
        }
        assert(!combined.relations.some(r => ['previous_stage', 'next_stage'].includes(r.role)));
    }
    assert.equal(JSON.stringify([...items]), before);
    assert.equal(chains, 148);
    for (const page of pages.filter(page => page.type === 'achievement_group')) {
        const collection: MiscItem = JSON.parse(fs.readFileSync(`${directory}/${page.id}.json`, 'utf8'));
        const original = JSON.stringify(collection);
        const members = misc_collection_members(collection, pages);
        const normalized = resolve_page_relations(collection, pages, 'misc');
        assert.deepEqual(normalized.relations.map(relation => relation.id), members.map(member => member.id), 'copy and links must also use canonical members');
        assert.equal(JSON.stringify(collection), original);
        assert.equal(new Set(members.map(member => member.id)).size, members.length);
        assert(members.every(member => !pages.find(page => page.id === member.id)?.group || pages.find(page => page.id === member.id)!.show));
    }
    console.log(`${lang}: ${items.size} achievements, ${chains} linked chains; all stage descriptions, shared details, list visibility and source immutability passed.`);
} }
