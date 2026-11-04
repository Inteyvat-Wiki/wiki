// Published-shape fixtures only: no game input, formal output or running server required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createJiti } from 'jiti';
import { createError } from 'h3';
import { OUTFIT_TYPES } from '@inteyvat-wiki/wiki-contracts/outfit';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const jiti = createJiti(import.meta.url, { fsCache: false, alias: { '#server': `${root}/server`, '~~': root, '~': `${root}/app` } });
const boundary = await jiti.import('../server/utils/content_boundary.ts');
const outfit = await jiti.import('../shared/outfit.ts');
const display = await jiti.import('../shared/archive_display.ts');
const routes = await jiti.import('../shared/content_routes.ts');
const { create_outfit_processor } = await jiti.import('../server/utils/outfit.ts');
const { parse_settings } = await jiti.import('../server/utils/settings.ts');
const { gallery_size, gallery_panel_width } = await jiti.import('../shared/gallery_layout.ts');
const pagination = await jiti.import('../shared/list_pagination.ts');

const raw = { name: '{NICKNAME}', type: 'character', description: '<color=#112233>Color</color>\\n<b>Bold</b> {NICKNAME}',
    story: 'First\n{M#Brother}{F#Sister} {NICKNAME}', sources: ['Shop {NICKNAME}'],
    character: { id: 'amber', name: '{NICKNAME}' }, weapon_type: null, is_default: false, icon: null, images: [] };
const page = { id: 'character-test', name: raw.name, type: raw.type, description: raw.description, character: raw.character,
    weapon_type: null, is_default: false, icon: null, star: null, show: true, items: ['character-test'], related_items: [] };
const originals = JSON.stringify([raw, page]);

assert.deepEqual(boundary.accept_export_document('outfit', raw), raw);
assert.deepEqual(boundary.accept_content_pages('outfit', [page]), [page]);
for (const invalid of [{ ...raw, type: 'unknown' }, { ...raw, source_id: 12 }, { ...raw, images: [{ kind: 'icon', url: null }] },
    { ...raw, character: { id: 'amber', name: 'Amber', avatarId: 1 } }]) {
    assert.throws(() => boundary.accept_export_document('outfit', invalid), /Invalid outfit document/);
}
for (const invalid of [{ ...page, raw: {} }, { ...page, type: 'FLYCLOAK' }, { ...page, character: { id: '../a', name: '' } }]) {
    assert.throws(() => boundary.accept_content_pages('outfit', [invalid]), /Invalid outfit page/);
}
const settings = parse_settings(JSON.stringify({ traveller: 'lumine', traveller_name: '<img src=x onerror=alert(1)>' }));
const processor = create_outfit_processor(settings, key => key);
const processed = processor.item(raw);
assert.equal(processed.name, '&lt;img src=x onerror=alert(1)&gt;');
assert(processed.description.includes('colored_content') && processed.description.includes('<br>'));
assert(processed.description.includes('<b>Bold</b>'));
assert(processed.story.includes('First<br>Sister'));
assert.equal(processed.sources[0], `Shop ${processed.name}`);
assert.equal(processed.character.name, processed.name);
assert.equal(processor.page(page).name, processed.name);
assert(!processed.story.includes('<img'));
assert.equal(processor.item({ ...raw, story: null, character: null }).story, null);
assert.equal(processor.item({ ...raw, description: '<script>alert(1)</script>' }).description, '&lt;script&gt;alert(1)&lt;/script&gt;');
assert.equal(JSON.stringify([raw, page]), originals, 'processing must not mutate exporter documents');

function load_source(source, filename, mocks = {}, globals = {}) {
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    vm.runInNewContext(outputText, { exports, require: key => Object.hasOwn(mocks, key) ? mocks[key] : require(key),
        console: { ...console, error() {} }, createError, ...globals }, { filename });
    return exports;
}
const read = path => fs.readFileSync(`${root}/${path}`, 'utf8');
const load = (path, mocks, globals) => load_source(read(path), path, mocks, globals);
const reads = [];
let document = raw, pages = [page];
const reader = load('server/utils/page.ts', { './content_boundary': boundary, '#server/utils/read': {
    read_common: async path => { reads.push(path); assert.equal(path, 'outfit/ids'); return [page.id]; },
    read_lang: async (path, lang) => {
        reads.push(`${lang}/${path}`);
        if (path === 'outfit/pages') return structuredClone(pages);
        assert.equal(path, `outfit/items/${page.id}`);
        return structuredClone(document);
    },
} });
const api_mocks = { '#server/utils/page': reader, '#server/utils/outfit': { create_outfit_processor },
    '#server/utils/lang': { get_lang: event => event.lang }, '#server/utils/i18n': { create_i18n: () => ({ global: { t: key => key } }) },
    '#server/utils/settings': { parse_settings } };
const globals = { defineEventHandler: handler => handler, getQuery: () => ({ settings: JSON.stringify({ traveller_name: 'Traveler' }) }) };
const item_api = load('server/api/outfit/[id].ts', api_mocks, globals).default;
const pages_api = load('server/api/outfits.ts', api_mocks, globals).default;
const event = (id, lang = 'en') => ({ lang, context: { params: { id } } });
for (const lang of ['en', 'zh_hans']) {
    for (const type of OUTFIT_TYPES) {
        document = { ...raw, type }; pages = [{ ...page, type }];
        assert.equal((await item_api(event(page.id, lang))).name, 'Traveler');
        const result = await pages_api(event(undefined, lang));
        assert.equal(result[0].type, type);
        assert.equal(result[0].character.name, 'Traveler');
    }
}
const before_invalid = reads.length;
for (const id of [undefined, '../x', 'a/b', ['a'], '', 'a..b']) {
    await assert.rejects(item_api(event(id)), error => error.statusCode === 404);
}
assert.equal(reads.length, before_invalid, 'unsafe IDs cannot reach data paths');
await assert.rejects(item_api(event('not-published')), error => error.statusCode === 404);
document = { ...raw, raw_id: 1 };
await assert.rejects(item_api(event(page.id)), error => error.statusCode === 500);
pages = [{ ...page, images: [] }];
await assert.rejects(pages_api(event()), error => error.statusCode === 500);
document = raw; pages = [page];
assert.equal(reads.filter(path => path === 'outfit/ids').length, 2 * OUTFIT_TYPES.length + 2,
    'Every safe item request reads one fresh index; lists and unsafe IDs do not');

const inline_api = load('server/api/inline-link/[category]/[name].ts', {
    ...api_mocks, '#server/utils/archive_text': await jiti.import('../server/utils/archive_text.ts'),
    '#server/utils/text': await jiti.import('../server/utils/text.ts'),
}, globals).default;
const inline = await inline_api({ lang: 'en', context: { params: { category: 'outfit', name: page.id } } });
assert.equal(inline.name, 'Traveler');
assert.equal(inline.icon, undefined, 'missing icons are omitted from inline summaries');

const requests = [];
const client = load('app/utils/api.ts', { '~~/shared/content_routes': routes, '~~/shared/i18n': require('@inteyvat-wiki/wiki-contracts/language') }, {
    $fetch: { create: () => async path => { requests.push(path); return {}; } },
});
await client.get_outfit_pages();
await client.get_outfit_item('a/b?#');
assert.deepEqual(requests, ['/api/outfits', '/api/outfit/a%2Fb%3F%23']);

const choices = OUTFIT_TYPES.map(type => ({ ...page, id: type, type }));
assert.equal(outfit.outfit_selected_type('all'), 'character');
assert.equal(outfit.outfit_selected_type(['weapon']), 'character');
for (const type of OUTFIT_TYPES) {
    assert.deepEqual(outfit.filter_outfit_pages(choices, type, '').map(item => item.id), [type]);
}
assert.deepEqual(outfit.filter_outfit_pages([{ ...page, character: { id: null, name: 'Amber' } }], 'character', 'amber'), [{ ...page, character: { id: null, name: 'Amber' } }]);
assert.equal(outfit.filter_outfit_pages([{ ...page, show: false }], 'character', '').length, 0);
const filter_items = [
    { ...page, id: 'default-clothes', name: '<b>Everyday &amp; Calm</b>', description: 'A quiet day', is_default: true },
    { ...page, id: 'custom-clothes', name: 'Moonlight', description: 'A quiet night', is_default: false, character: { id: null, name: 'Amber' } },
    { ...page, id: 'hidden-clothes', name: 'Hidden', show: false },
    { ...page, id: 'wings', type: 'glider', name: 'Moonlight', character: null },
];
const filter_before = JSON.stringify(filter_items);
const variant = { ...raw, name: 'Sublimation', description: 'Distinct variant text', type: 'weapon' };
const group_pages = [
    { ...page, id: 'base', type:'weapon', name:'Base', description:'Base\nOriginal\n\nSublimation\nDistinct variant text', items:['base','sublimation'] },
    { ...page, id:'sublimation', type:'weapon', name:variant.name, description:variant.description, show:false, items:['sublimation'], related_items:['base'] },
];
assert.deepEqual(outfit.filter_outfit_pages(group_pages,'weapon','sublimation').map(page=>page.id), ['base']);
const { get_page_data } = await jiti.import('../app/utils/page.ts');
const group_items = { base: { ...raw, name:'Base',type:'weapon' }, sublimation:variant };
const grouped = await get_page_data('base', async()=>group_pages, async id=>group_items[id]);
assert.deepEqual(grouped.items, [group_items.base,variant]);
const linked = await get_page_data('sublimation', async()=>group_pages, async id=>group_items[id]);
assert.deepEqual(linked.items, [variant,group_items.base], 'old member links retain the requested item and show its group siblings');
await assert.rejects(()=>get_page_data('unknown',async()=>group_pages,async id=>group_items[id]), /Page not found/);
assert.deepEqual(outfit.filter_outfit_pages(filter_items, 'character', '').map(item => item.id), ['default-clothes', 'custom-clothes'],
    'default and custom outfits share the same list and preserve exporter order');
assert.deepEqual(outfit.filter_outfit_pages(filter_items, 'character', ' EVERYDAY & CALM ').map(item => item.id), ['default-clothes']);
assert.deepEqual(outfit.filter_outfit_pages(filter_items, 'character', 'QUIET NIGHT').map(item => item.id), ['custom-clothes']);
assert.deepEqual(outfit.filter_outfit_pages(filter_items, 'character', 'AMBER').map(item => item.id), ['custom-clothes']);
assert.deepEqual(outfit.filter_outfit_pages(filter_items, 'glider', 'moonlight').map(item => item.id), ['wings']);
assert.equal(JSON.stringify(filter_items), filter_before);
assert.equal(outfit.filter_outfit_pages([{ ...page, name: '', description: '' }], 'character', '').length, 1,
    'source placeholder exclusions belong to the export directory, never a frontend name/ID heuristic');
assert.deepEqual(outfit.outfit_detail_images(raw), []);
assert.equal(outfit.outfit_detail_images({ ...raw, icon: '/icon.png' })[0].url, '/icon.png');
assert.equal(outfit.outfit_detail_images({ ...raw, images: [{ kind: 'icon', url: '/icon' }, { kind: 'card', url: '/card' }] })[0].url, '/card');
assert.deepEqual(outfit.outfit_detail_images({ ...raw, images: [{ kind: 'splash', url: '/splash' },
    { kind: 'card', url: '/card' }, { kind: 'splash', url: '/splash' }] }).map(image => image.url), ['/splash']);
for (const type of OUTFIT_TYPES) {
    const size = gallery_size('outfit', type);
    assert(size.width >= size.imageWidth);
    const icon_images = outfit.outfit_detail_images({ ...raw, type, icon: '/icon.png' });
    const icon_size = outfit.outfit_gallery_size(type, icon_images);
    assert.deepEqual(icon_size, gallery_size('common', 'icon'));
    assert.equal(icon_size.width, 194, 'icon-only entries must not reserve a full artwork column');
    assert.equal(gallery_panel_width(icon_size, [{ width: 2048, height: 2048 }]), 194, 'high-resolution icons still use compact presentation');
    for (const kind of ['card', 'splash']) {
        assert.deepEqual(outfit.outfit_gallery_size(type, outfit.outfit_detail_images({ ...raw,
            images: [{ kind, url: '/art.png' }, { kind: 'icon', url: '/icon.png' }] })), size);
    }
    for (const columns of [1, 2, 4, 8]) {
        const capacity = pagination.list_page_size(columns, outfit.OUTFIT_LIST_LAYOUT[type].layout);
        assert(capacity % columns === 0 && capacity <= 120);
        const anchor = pagination.list_page_anchor('3', '24', 200);
        const page = pagination.list_anchor_page(anchor, capacity);
        assert((page - 1) * capacity <= anchor && page * capacity > anchor);
    }
}
assert(gallery_size('outfit', 'character').imageHeight > gallery_size('outfit', 'character').imageWidth);
assert(gallery_size('outfit', 'glider').imageWidth > gallery_size('outfit', 'glider').imageHeight);
assert(outfit.OUTFIT_LIST_LAYOUT.glider.minWidth > outfit.OUTFIT_LIST_LAYOUT.character.minWidth);

// Compile and render the actual entry component, not a copy of its conditional image logic.
const vue = require('vue');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { renderToString } = require('@vue/server-renderer');
const entry_source = read('app/components/OutfitListEntry.vue');
const { descriptor } = parse(entry_source);
const compiled = compileScript(descriptor, { id: 'outfit-entry-test', inlineTemplate: true });
const Entry = load_source(compiled.content, 'OutfitListEntry.vue', { '~~/shared/archive_display': display }, {
    computed: vue.computed, ref: vue.ref, watch: vue.watch, useLocalePath: () => path => path,
}).default;
async function render_entry(item) {
    const app = vue.createSSRApp(Entry, { item });
    app.component('NuxtLink', vue.defineComponent({ props: ['to'], setup: (props, { slots }) => () => vue.h('a', { href: props.to }, slots.default?.()) }));
    app.component('ElCard', vue.defineComponent({ setup: (_, { slots }) => () => vue.h('article', slots.default?.()) }));
    app.component('ElImage', vue.defineComponent({ props: ['src', 'alt'], setup: props => () => vue.h('img', { src: props.src, alt: props.alt }) }));
    app.component('InlineText', vue.defineComponent({ props: ['text'], setup: props => () => vue.h('span', { innerHTML: props.text }) }));
    return renderToString(app);
}
for (const type of OUTFIT_TYPES) {
    const without = await render_entry({ ...page, type });
    assert(!without.includes('<img'), 'no placeholder image when the icon is missing');
    assert(without.includes(`entry-${type}`));
    const with_image = await render_entry({ ...page, type, icon: '/image.png' });
    assert(with_image.includes('src="/image.png"'));
    assert(with_image.includes(`href="/outfit/${page.id}"`));
}
const list_source = read('app/components/OutfitList.vue');
const detail_source = read('app/components/OutfitDetail.vue');
assert(list_source.includes('list_page_anchor') && list_source.includes('ResizeObserver'));
assert(list_source.includes('v-for="type in OUTFIT_TYPES"') && !list_source.includes('name="all"'));
assert(list_source.includes('repeat(auto-fill, minmax(min(100%, var(--entry-width)), 1fr))'));
assert(entry_source.includes('.entry-character .entry-image { width: min(100%, 112px); aspect-ratio: 1; max-height: 112px; }'));
assert(!entry_source.includes('aspect-ratio: 3 / 4'), 'list icons are square character heads, not portrait artwork');
assert(entry_source.includes('aspect-ratio: 2 / 1'));
assert(detail_source.includes("inline_link_text('character', character.id, 'icon')"));
assert.equal((detail_source.match(/<normal-text/g) || []).length, 1, 'copy belongs only to the long story');
assert(detail_source.includes('<normal-text :text="item.story"'));
assert(detail_source.includes('<el-descriptions') && !detail_source.includes('copy_all'));
assert(detail_source.includes(':size="outfit_gallery_size(item.type, images)"'));
assert(detail_source.includes('get_page_data(id, get_outfit_pages, get_outfit_item)'));
assert(detail_source.includes('v-for="{ item, images, id } in sections"'), 'each member retains its own text and media');
for (const locale of ['en', 'zh_hans']) {
    const labels = JSON.parse(read(`i18n/locales/${locale}.json`));
    assert(labels.menu.outfit);
    assert.deepEqual(Object.keys(labels.outfit.types), [...OUTFIT_TYPES]);
}
console.log('Outfits: strict boundaries, text processing, bilingual handler fixtures, 404/500 paths, inline links, client routes, filtering, image priority, adaptive pagination and entry SSR passed.');
