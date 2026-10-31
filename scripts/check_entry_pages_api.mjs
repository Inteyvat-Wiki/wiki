import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const jiti = createJiti(import.meta.url, { fsCache: false, alias: { '~': `${root}/app`, '~~': root } });
const { get_entry_page } = await jiti.import('../app/utils/entry_page.ts');
const base = process.argv[2] || 'http://localhost:4013';
for (const lang of ['zh_hans', 'en']) for (const category of ['miliastra', 'misc']) {
    const api = category === 'misc' ? '/api/misc' : '/api/archive/miliastra';
    const get = async path => {
        const response = await fetch(`${base}${path}?lang=${lang}`);
        assert.equal(response.status, 200, path);
        return response.json();
    };
    const pages = await get(api), cache = new Map();
    const item = id => {
        if (!cache.has(id)) cache.set(id, get(`${api}/${encodeURIComponent(id)}`));
        return cache.get(id);
    };
    const groups = pages.filter(page => page.group && page.show);
    assert.equal(groups.length, category === 'misc' ? 148 : 9);
    let links = 0;
    for (const page of groups) {
        const canonical = await get_entry_page(page.id, async () => pages, item, category);
        assert.equal(canonical.sections.filter(section => ['achievement_stage', 'hall_description'].includes(section.kind)).length, page.items.length);
        for (const id of page.items) {
            const source = await item(id), before = JSON.stringify(source);
            assert.deepEqual(await get_entry_page(id, async () => pages, item, category), canonical);
            assert(canonical.sections.some(section => section.text === source.description));
            assert.equal(JSON.stringify(source), before);
            links++;
        }
    }
    // Stable source-ID URLs still resolve through the ordinary item endpoint.
    const alias = pages.find(page => page.group && !page.show);
    assert.deepEqual(await get_entry_page(alias.source_id, async () => pages, item, category),
        await get_entry_page(alias.id, async () => pages, item, category));
    console.log(`${lang}/${category}: ${groups.length} groups, ${links} member URLs and source-ID aliases render the same complete pages; APIs retain independent records.`);
}
