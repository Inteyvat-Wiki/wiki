import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { archive_relation_path } from '../shared/archive';

const base = process.argv[2] || 'http://127.0.0.1:4010';
const expected = { serenitea: 2564, tcg: 2340, miliastra: 3512 };
async function get(url: string) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200, url);
    return await response.json();
}
for (const lang of ['zh_hans', 'en']) {
    for (const [category, count] of Object.entries(expected)) {
        const pages = await get(`/api/archive/${category}?lang=${lang}`);
        assert.equal(pages.length, count);
        assert.equal(new Set(pages.map((page: any) => page.id)).size, count);
        const available = new Set(pages.map((page: any) => page.id));
        if (category === 'tcg') {
            const cards = pages.filter((page: any) => page.type === 'card');
            assert.equal(cards.length, 629);
            assert(cards.every((page: any) => page.card_type?.name && Array.isArray(page.tags)));
            assert.equal(new Set(cards.map((page: any) => page.card_type.id)).size, 4);
        }
        if (category === 'serenitea') {
            assert(!pages.some((page: any) => page.type === 'host'));
            assert.equal(pages.filter((page: any) => page.type === 'furniture').length, 2324);
            assert.equal(pages.filter((page: any) => page.type === 'companion').length, 121);
            const furniture = pages.filter((page: any) => page.type === 'furniture');
            assert(furniture.every((page: any) => Array.isArray(page.classifications)));
            assert.equal(furniture.filter((page: any) => page.classifications.length).length, 2319);
            assert.equal(furniture.filter((page: any) => !page.classifications.length).length, 5);
            assert.equal(new Set(furniture.flatMap((page: any) => page.classifications.map((value: any) => value.group_id))).size, 13);
            assert.equal(new Set(furniture.flatMap((page: any) => page.classifications.map((value: any) => value.id))).size, 73);
            for (const id of ['host-1001', 'host-2000', 'furniture-368101', 'furniture-368137']) {
                assert(!available.has(id));
                assert.equal((await fetch(`${base}/api/archive/serenitea/${id}?lang=${lang}`)).status, 404);
            }
        }
        const samples = { serenitea: ['furniture-369101', 'suite-33', 'companion-9002', 'companion-9047'],
            tcg: ['card-311103', 'player-1437', 'stage-11001', 'stage-11003'], miliastra: ['suit-265348', 'costume-260001', 'hall-1'] };
        for (const id of samples[category as keyof typeof samples]) {
            const data = await get(`/api/archive/${category}/${id}?lang=${lang}`);
            const page = pages.find((page: any) => page.id === id || page.source_id === id);
            assert(page, `Missing maintained page for ${id}`);
            assert(data.name, `${category}/${id}: missing name`);
            assert.deepEqual(data.classifications, page.classifications);
            assert.deepEqual(data.card_type, page.card_type);
            assert.deepEqual(data.tags, page.tags);
            assert(!/<\/?color\b/i.test(JSON.stringify(data)), `${id}: game colour tag must be normalised into HTML`);
            assert(!data.description.includes('\\n'), `${id}: literal newline not processed`);
            for (const image of data.images) if (image.url) {
                assert(fs.existsSync(path.join('data', image.url.slice(1))));
                assert.equal((await fetch(base + image.url)).status, 200);
            }
            for (const relation of data.relations) {
                assert(archive_relation_path(relation.category, relation.id));
                if (relation.category === category) assert(available.has(relation.id), `${id}: stale related page ${relation.id}`);
            }
            if (id === 'suit-265348') assert(data.description.includes('503'), 'full costume story must survive text processing');
            if (id === 'stage-11003') {
                const source = JSON.parse(fs.readFileSync(path.join('data', lang, category, 'items', `${page.id}.json`), 'utf8'));
                const placeholders = source.description.match(/\{\d+\}/g);
                assert(placeholders?.length, 'real source sample must contain numeric placeholders');
                assert.deepEqual(data.description.match(/\{\d+\}/g), placeholders,
                    'unresolved numeric substitutions must survive archive text processing');
            }
            if (id === 'companion-9002') {
                const talks = Object.values(data.talks) as any[];
                const ordinary = talks.find(talk => talk.source_id === 6900202)!;
                const highlighted = talks.find(talk => talk.source_id === 6900207)!;
                const old_state = ordinary.conditions.find((token: any) => typeof token !== 'string');
                const new_state = highlighted.conditions.find((token: any) => typeof token !== 'string');
                assert.equal(old_state.id, new_state.id, 'production data must share new/old topic state');
                assert.equal(old_state.value, false);
                assert.equal(new_state.value, true);
                assert.equal(ordinary.title, ordinary.dialogs[1].content, 'production menu prompt must survive processing');
            }
        }
        console.log(`${lang}/${category}: list, detail, relations, text and real image URLs passed`);
    }
}
for (const url of ['/api/archive/unknown', '/api/archive/serenitea/does-not-exist', '/api/archive/tcg/invalid%2Fpath']) {
    const response = await fetch(base + url);
    assert.equal(response.status, 404, `Invalid category/ID must return 404: ${url}`);
}
assert.equal(archive_relation_path('unknown', 'entry'), null);
assert.equal(archive_relation_path('serenitea', '../entry'), null);
console.log('Production archive API checks passed.');
