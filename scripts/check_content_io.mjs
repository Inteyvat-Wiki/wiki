// Run the real modules with in-memory I/O: never read or change formal data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createJiti } from 'jiti';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const jiti = createJiti(import.meta.url, { fsCache: false, alias: { '#server': `${root}/server`, '~~': root, '~': `${root}/app` } });
const boundary = await jiti.import('../server/utils/content_boundary.ts');
const routes = await jiti.import('../shared/content_routes.ts');
function load(relative, mocks, globals = {}) {
    const source = fs.readFileSync(`${root}/${relative}`, 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    vm.runInNewContext(outputText, { exports, require: key => Object.hasOwn(mocks, key) ? mocks[key] : require(key),
        console, createError: options => Object.assign(new Error(options.message), options), ...globals }, { filename: relative });
    return exports;
}
const common = new Map([['character/ids', ['amber']], ['misc/ids', ['tutorial-a']],
    ['misc/source_ids', { 'tutorial-1': 'tutorial-a' }], ['misc/id_aliases', { old: 'tutorial-a' }]]);
const page = { id: 'amber', name: 'Amber', icon: null, star: null, show: true, items: ['amber'], related_items: [] };
const localized = new Map([['character/items/amber', { name: 'Amber', skills: [] }], ['character/pages', [page]],
    ['misc/items/tutorial-a', { name: 'Tutorial', type: 'tutorial' }]]);
const reads = [];
const reader = load('server/utils/page.ts', { './content_boundary': boundary, '#server/utils/read': {
    read_common: async path => { reads.push(path); if (!common.has(path)) throw new Error(`Missing fixture ${path}`); return structuredClone(common.get(path)); },
    read_lang: async (path, lang) => { reads.push(`${lang}/${path}`); return structuredClone(localized.get(path)); },
} });
async function readObjectOnce(category, id, lang = 'en') {
    const indexPath = `${category}/ids`;
    const before = reads.filter(path => path === indexPath).length;
    try {
        return await reader.read_object(category, id, lang);
    } finally {
        assert.equal(reads.filter(path => path === indexPath).length, before + 1,
            `${category}/${id} must read its index exactly once, including alias resolution`);
    }
}
assert.equal((await readObjectOnce('character', 'amber')).name, 'Amber');
assert.equal((await reader.read_pages('character', 'zh_hans'))[0].id, 'amber');
// Replace fixtures without reloading the reader: completed reads must not cache old IDs.
common.set('character/ids', ['amber', 'lisa']);
localized.set('character/items/lisa', { name: 'Lisa', skills: [] });
assert.equal(await reader.is_data_id('character', 'lisa'), true, 'new IDs must be visible immediately');
assert.equal((await readObjectOnce('character', 'lisa')).name, 'Lisa');
common.set('character/ids', ['lisa']);
assert.equal(await reader.is_data_id('character', 'amber'), false, 'removed IDs must be rejected immediately');
const beforeRemoved = reads.length;
await assert.rejects(readObjectOnce('character', 'amber'), error => error.statusCode === 404);
assert.deepEqual(reads.slice(beforeRemoved), ['character/ids'], 'removed IDs must not read retained item files');
assert.equal((await readObjectOnce('character', 'lisa')).name, 'Lisa');
for (const malformed of [[5], ['../outside'], { lisa: true }, null]) {
    common.set('character/ids', malformed);
    const beforeMalformed = reads.length;
    await assert.rejects(reader.is_data_id('character', 'lisa'), /Invalid data ID index/);
    await assert.rejects(readObjectOnce('character', 'lisa'), /Invalid data ID index/);
    assert.deepEqual(reads.slice(beforeMalformed), ['character/ids', 'character/ids'],
        'a malformed replacement must not fall back to the last valid index');
}
common.delete('character/ids');
await assert.rejects(readObjectOnce('character', 'lisa'), /Missing fixture character\/ids/);
common.set('character/ids', ['lisa']);
assert.equal((await readObjectOnce('character', 'lisa')).name, 'Lisa', 'failed reads must be retried');
for (const id of ['tutorial-a', 'tutorial-1', 'old']) assert.equal((await readObjectOnce('misc', id)).type, 'tutorial');
common.set('misc/ids', ['tutorial-b']);
localized.set('misc/items/tutorial-b', { name: 'New tutorial', type: 'tutorial' });
common.set('misc/source_ids', { 'tutorial-1': 'tutorial-b', deleted: 'tutorial-a' });
common.set('misc/id_aliases', { old: 'tutorial-b' });
for (const id of ['tutorial-b', 'tutorial-1', 'old']) assert.equal((await readObjectOnce('misc', id)).name, 'New tutorial');
for (const id of ['tutorial-a', 'deleted', 'missing']) {
    const beforeMissing = reads.length;
    await assert.rejects(readObjectOnce('misc', id), error => error.statusCode === 404);
    assert(reads.slice(beforeMissing).every(path => !path.startsWith('en/')), 'unknown or removed alias targets must not read items');
}
const readCount = reads.length;
for (const id of [undefined, ['amber'], '../amber', 'a/b', '%2e%2e', 'a..b']) await assert.rejects(reader.read_object('character', id, 'en'), error => error.statusCode === 404);
await assert.rejects(reader.read_object('map', 'a', 'en'), /Invalid content category/);
assert.equal(reads.length, readCount, 'invalid category/IDs must not reach filesystem paths');
await assert.rejects(readObjectOnce('character', 'missing'), error => error.statusCode === 404);
common.set('task/ids', [5]);
await assert.rejects(reader.is_data_id('task', 'quest-v1.x'), /Invalid data ID index/);
common.set('task/ids', ['quest-v1.x']);
assert.equal(await reader.is_data_id('task', 'quest-v1.x'), true, 'invalid indexes must be retried');
localized.set('character/pages', [{ ...page, related_items: null }]);
await assert.rejects(reader.read_pages('character', 'en'), /Invalid character base page/);
common.set('misc/source_ids', { 'tutorial-2': '../outside' });
await assert.rejects(readObjectOnce('misc', 'tutorial-2'), /Invalid data ID alias/);

// Hold concurrent I/O pending, then fail it: no rejected promise may poison later reads.
const pendingReads = [];
let failReads = true;
const retryReader = load('server/utils/page.ts', { './content_boundary': boundary, '#server/utils/read': {
    read_common: path => {
        assert.equal(path, 'task/ids');
        return failReads ? new Promise((_, reject) => pendingReads.push(reject)) : Promise.resolve(['quest-v1.x']);
    },
    read_lang: async (path, lang) => {
        assert.equal(path, 'task/items/quest-v1.x');
        assert.equal(lang, 'en');
        return { name: 'Quest' };
    },
} });
const failures = Promise.allSettled([
    retryReader.is_data_id('task', 'quest-v1.x'), retryReader.read_object('task', 'quest-v1.x', 'en'),
]);
assert(pendingReads.length > 0, 'index I/O must be pending before rejection');
for (const reject of pendingReads) reject(new Error('Transient index read failure'));
for (const result of await failures) {
    assert.equal(result.status, 'rejected');
    assert.match(result.reason.message, /Transient index read failure/);
}
failReads = false;
assert.equal(await retryReader.is_data_id('task', 'quest-v1.x'), true, 'in-flight failures must allow subsequent retries');
assert.equal((await retryReader.read_object('task', 'quest-v1.x', 'en')).name, 'Quest');

const requested = [];
let onRequest;
const client = load('app/utils/api.ts', { '~~/shared/content_routes': routes, '~~/shared/i18n': require('@inteyvat-wiki/wiki-contracts/language') }, {
    $fetch: { create: options => { onRequest = options.onRequest; return async path => { requested.push(path); return { sentinel: true }; }; } },
    useNuxtApp: () => ({ $i18n: { locale: { value: 'invalid' } } }), get_settings_value: async () => ({}),
});
for (const category of Object.keys(routes.CONTENT_ROUTES)) {
    await client.get_content_item(category, 'quest-v1.x');
    assert.equal(requested.at(-1), `${routes.CONTENT_ROUTES[category].item}/quest-v1.x`);
    await client.get_content_pages(category);
    assert.equal(requested.at(-1), routes.CONTENT_ROUTES[category].pages);
}
await client.get_quest_item('a/b?#');
assert.equal(requested.at(-1), '/api/quest-item/a%2Fb%3F%23');
const options = { query: { existing: 'kept' } };
await onRequest({ options });
assert.equal(options.query.lang, require('@inteyvat-wiki/wiki-contracts/language').DEFAULT_LOCALE);
assert.equal(options.query.existing, 'kept');

const rawCharacter = { name: 'Amber', icon: '', splash: '', element: 'pyro', weapon: 'bow', star: 4, info: [], stats: { hp: [], atk: [], def: [], substats: [] },
    skills: [{ id: 1, sub_ids: [11], title: 'Skill', icon: '', description: '', details: ['Damage|{param1:F0}'], params: { param1: [10, 20] } }],
    talents: [], constellations: [], link_description: [], stories: [], voiceovers: [], images: [] };
const rawWeapon = { name: 'Bow', icon: '', awaken_icon: '', type: 'bow', star: 4, stats: { base: [], substats_name: null, substats: null },
    effect: { name: 'Effect', description: 'Bonus {0}', values: [['10'], ['20']] }, description: '', story: [], refine_material: null };
const snapshots = [JSON.stringify(rawCharacter), JSON.stringify(rawWeapon)];
const mocks = { '#server/utils/page': { read_object: async category => structuredClone(category === 'character' ? rawCharacter : rawWeapon) },
    '#server/utils/lang': { get_lang: () => 'en' }, '#server/utils/i18n': { create_i18n: () => ({ global: { t: key => key } }) },
    '#server/utils/settings': { parse_settings: () => ({}) }, '#server/utils/text': { process_text: text => text },
    '~~/server/utils/text': { process_text: text => text }, '#server/utils/value': await jiti.import('../server/utils/value.ts') };
const globals = { defineEventHandler: handler => handler, getQuery: () => ({}) };
const character = await load('server/api/character/[name].ts', mocks, globals).default({ context: { params: { name: 'amber' } } });
assert.equal(character.skills[0].sub_title, 'skill.normal_attack');
assert.equal(character.skills[0].details[0].value.length, 15);
assert.equal(character.skills[0].details[0].value[14], '20');
assert.equal(Object.hasOwn(character.skills[0], 'params'), false);
const weapon = await load('server/api/weapon/[name].ts', mocks, globals).default({ context: { params: { name: 'bow' } } });
assert.equal(weapon.effect.description, 'Bonus 10-20');
assert.equal(Object.hasOwn(weapon.effect, 'values'), false);
assert.deepEqual([JSON.stringify(rawCharacter), JSON.stringify(rawWeapon)], snapshots);
console.log(`Content I/O: readers, aliases, live index replacements, single-read snapshots, failure retry, ${Object.keys(routes.CONTENT_ROUTES).length} route pairs and character/weapon display transforms passed (in-memory fixtures).`);
