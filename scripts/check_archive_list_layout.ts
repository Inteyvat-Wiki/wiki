import assert from 'node:assert/strict';
import fs from 'node:fs';
import { archive_list_icon, archive_list_layout } from '../app/utils/archive_list_layout';
import { archive_selected_type } from '../app/utils/archive_list';
import { filter_archive_pages } from '../app/utils/archive_list';
assert.equal(filter_archive_pages([{id:'english_name', source_id:'achievement-123', name:'Name', description:'', type:'achievement', show:true}], '123', 'achievement').length, 1);

for (const value of [undefined, 'all', 'unknown', ['card']]) assert.equal(archive_selected_type(['card', 'player'], value), 'card');
assert.equal(archive_selected_type(['card', 'player'], 'player'), 'player');
assert.equal(archive_selected_type([], undefined), '');
assert(!fs.readFileSync('app/components/ArchiveList.vue', 'utf8').includes('name="all"'), 'archive lists must not expose a mixed all-types tab');

assert.equal(archive_list_layout('serenitea', 'companion', false), 'index');
assert.equal(archive_list_layout('serenitea', 'furniture', true), 'gallery');
assert.equal(archive_list_layout('serenitea', 'suite', true), 'landscape');
assert.equal(archive_list_layout('tcg', 'card', true), 'portrait');
assert.equal(archive_list_layout('tcg', 'player', true), 'compact');
assert.equal(archive_list_layout('tcg', 'player', false), 'compact');
assert.equal(archive_list_layout('tcg', 'stage', false), 'compact');
assert.equal(archive_list_layout('tcg', 'stage', true), 'compact');
assert.equal(archive_list_layout('miliastra', 'costume', true), 'gallery');
assert.equal(archive_list_layout('miliastra', 'catalog', true), 'gallery');
assert.equal(archive_list_layout('miliastra', 'costume', false), 'compact');
assert.equal(archive_list_layout('misc', 'achievement', true), 'compact');
assert.equal(archive_list_layout('misc', 'profile_picture', true), 'portrait');
assert.equal(archive_list_layout('misc', 'tutorial', true), 'text');
assert.equal(archive_list_layout('misc', 'achievement_group', true), 'gallery');
const entry_component = fs.readFileSync('app/components/ArchiveListEntry.vue', 'utf8');
assert(!entry_component.includes("if (props.category === 'miliastra' && props.item.type === 'costume') return '';"), 'costume galleries retain the shared description summary');
assert(entry_component.includes('.entry-miliastra-costume.layout-gallery .entry-image,\n.entry-miliastra-catalog.layout-gallery .entry-image'), 'costumes and catalogs share the same centered image size');
assert(entry_component.includes('@container archive-grid (min-width: 960px) { .entry-misc-loading_tip.layout-text { grid-column: span 6; } }'), 'loading tips use two columns only with sufficient content width');
assert(entry_component.includes('.entry-misc-loading_tip.layout-text .entry-content { display: block; }'), 'two-column loading tips retain a readable title-above-body layout');
assert(entry_component.includes('.entry-misc-expedition.layout-media .entry-image { width: 160px; height: 72px; flex-basis: 160px; }'));
assert(entry_component.includes('.entry-misc-expedition.layout-media .entry-image { width: 120px; height: 56px; flex-basis: 120px; }'));
assert(entry_component.includes('@container archive-grid (max-width: 239px)'), 'very narrow content must use one readable gallery column');
assert(entry_component.includes('v-if="title_avatar && icon"'), 'title avatars require an available image');
assert(entry_component.includes('v-if="icon && !title_avatar"'), 'title avatars must not repeat beside the whole card');
assert(entry_component.includes('class="round_icon entry-title-avatar"'), 'player avatars use a compact rounded title image');
assert(entry_component.includes('.entry-serenitea-companion .entry-title-avatar { width: 48px; height: 48px; flex-basis: 48px; }'), 'companion avatars need more room without enlarging TCG avatars');
assert(entry_component.includes('.entry-serenitea-companion.layout-index { grid-column: auto; width: 100%; max-width: 240px; }'), 'companion cards must not stretch into wide rows');
assert(entry_component.includes('min-height: 80px; box-sizing: border-box; padding: 16px;'), 'companion rows retain comfortable height');
assert(fs.readFileSync('app/components/ArchiveList.vue', 'utf8').includes('.archive-grid.companion-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr)); }'), 'companion columns follow available content width rather than fixed viewport spans');
assert(fs.readFileSync('app/components/ArchiveList.vue', 'utf8').includes('container: archive-grid / inline-size'));
for (const [category, type] of [['misc', 'achievement_group'], ['serenitea', 'furniture'], ['miliastra', 'costume'], ['miliastra', 'catalog']]) {
    assert.equal(archive_list_layout(category!, type!, false), 'compact');
    assert.equal(archive_list_icon(category!, {type:type!, icon:'/images/card.png'}, true), null);
}
for (const type of ['card', 'card_back', 'card_table']) assert.equal(archive_list_layout('tcg', type, false), 'compact');
assert.equal(archive_list_layout('future', 'unknown', false), 'compact');
const image = { type: 'card', icon: '/images/card.png' };
assert.equal(archive_list_icon('tcg', image), image.icon);
assert.equal(archive_list_icon('tcg', image, true), null);
for (const icon of [null, '', '1234', 'UI_Icon', 'javascript:alert(1)']) assert.equal(archive_list_icon('tcg', { ...image, icon }), null);
assert.equal(archive_list_icon('tcg', { ...image, type: 'stage' }), image.icon);
assert.equal(archive_list_icon('tcg', { ...image, type: 'stage' }, true), null);
assert.equal(archive_list_icon('tcg', { type: 'player', icon: '/images/player.png' }), '/images/player.png');
assert.equal(archive_list_icon('tcg', { type: 'player', icon: '/images/player.png' }, true), null);
assert.equal(archive_list_icon('tcg', { type: 'player', icon: null }), null);
assert.equal(archive_list_icon('serenitea', { ...image, type: 'companion' }), image.icon);
assert.equal(archive_list_icon('serenitea', { ...image, type: 'companion' }, true), null);
assert.equal(archive_list_icon('misc', { ...image, type: 'loading_tip' }), null);

let checked = 0;
for (const lang of ['zh_hans', 'en']) for (const category of ['serenitea', 'tcg', 'miliastra', 'misc']) {
    const pages = JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`, 'utf8'));
    const snapshot = JSON.stringify(pages);
    const types = [...new Set<string>(pages.map((page: { type: string }) => page.type))];
    assert.equal(archive_selected_type(types, 'all'), types[0]);
    for (const page of pages.filter((page: { show: boolean }) => page.show)) {
        const icon = archive_list_icon(category, page);
        const layout = archive_list_layout(category, page.type, !!icon);
        if (!icon) assert(!['gallery', 'portrait', 'landscape', 'media'].includes(layout), `${category}/${page.id}: empty image space`);
        if (category === 'tcg' && page.type === 'stage') {
            assert.equal(layout, 'compact');
            const item = JSON.parse(fs.readFileSync(`data/${lang}/tcg/items/${page.id}.json`, 'utf8'));
            assert.equal(page.icon, item.images.find((image: { kind?: string; url: string | null }) => image.kind === 'opponent' && image.url)?.url || null);
        }
        if (category === 'serenitea' && page.type === 'companion') assert.equal(layout, 'index');
        checked++;
    }
    assert.equal(JSON.stringify(pages), snapshot, 'layout selection must not modify exported source text');
}
console.log(`Archive list layouts: ${checked} visible bilingual entries, scoped stage/companion images, failed-image fallback and source immutability passed.`);
