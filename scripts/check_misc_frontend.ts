import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { display_images, entry_plain_text, is_image_url } from '../shared/archive_display';
import { misc_copy_text, misc_detail_description, misc_image_label_key, misc_relation_path, misc_relation_label_key, misc_section_label_key, misc_visible_sections, misc_placeholder_name, misc_collection_members, is_misc_collection_member } from '../app/utils/misc';
import type { MiscItem, MiscPageData } from '../app/types/misc';
import { filter_archive_pages, archive_page_number } from '../app/utils/archive_list';
import { misc_fixture } from './check_misc_contract';
import { loading_situation_fields, loading_situation_groups, loading_situation_table_rows } from '../shared/loading_situations';

const images = [
    { name: 'UI_NameCardIcon', kind: 'icon', url: '/images/icon.png' },
    { name: 'UI_NameCardBanner', kind: 'banner', url: 'https://example.com/banner.webp' },
    { name: 'UI_NameCardBackground', kind: 'background', url: '/images/background.png' },
    { name: 'Duplicate', url: '/images/icon.png' }, { name: 'Hash', url: '18446744073709551615' },
    { name: 'Prefab', kind: 'prefab', url: '/images/prefab.png' }, { name: 'Missing', url: null },
    { name: 'Injection', url: 'javascript:alert(1)' }, { name: 'ProtocolRelative', url: '//example.com/icon.png' },
    { name: 'SourcePath', url: 'UI/Atlas/Icon.prefab' },
];
const snapshot = JSON.stringify(images);
assert.deepEqual(display_images(images).map(image => image.name), ['UI_NameCardIcon', 'UI_NameCardBanner', 'UI_NameCardBackground']);
assert.equal(JSON.stringify(images), snapshot);
for (const url of ['/images/a.png', '/images/a.avif?v=1', 'https://example.com/a.jpg']) assert(is_image_url(url));
for (const url of ['1234', 'UI_ICON', 'data:image/svg+xml,hi', 'https://user:pass@example.com/a.png', '/images/foo.prefab', '/images/x.png"onload=x']) assert(!is_image_url(url));
for (const kind of ['icon', 'banner', 'background']) assert.equal(misc_image_label_key('namecard', { kind }), `misc.images.namecard_${kind}`);
assert.equal(misc_image_label_key('loading_tip', { kind: 'monster_icon' }), 'misc.images.monster_icon');
assert.equal(misc_image_label_key('tutorial', { kind: 'unknown' }), 'archive.image_alt');
assert.equal(misc_image_label_key('namecard', {}), 'archive.image_alt');
for (const lang of ['en', 'zh_hans']) {
    const locale = JSON.parse(readFileSync(`i18n/locales/${lang}.json`, 'utf8'));
    for (const kind of ['PC', 'Mobile', 'PS', 'ps5_title', 'acquisition', 'sender', 'alternate_title', 'subtitle']) {
        const key = misc_section_label_key(kind)!;
        assert(key && locale.misc.sections[key.split('.').at(-1)!]);
    }
    for (const role of ['previous_stage', 'next_stage', 'group', 'unlock_avatar', 'unlock_costume', 'unlock_material', 'unlock_quest', 'region', 'monster', 'stage', 'lore']) {
        const key = misc_relation_label_key(role)!;
        assert(key && locale.misc.roles[key.split('.').at(-1)!]);
    }
    if (lang === 'zh_hans') {
        assert.equal(locale.misc.types.gallant_path, '豪斗旅纪');
        assert.equal(locale.misc.roles.gallant_path, '相关豪斗旅纪');
    }
    for (const image of images.slice(0, 3)) {
        const key = misc_image_label_key('namecard', image).split('.').slice(2).join('.');
        assert(locale.misc.images[key], 'known labels must not display untranslated keys');
    }
    assert(locale.misc.images.monster_icon);
}
assert.equal(misc_relation_path({ category: 'misc', id: 'achievement-80001' }), '/misc/achievement-80001');
assert.equal(misc_relation_path({ category: 'character', id: 'amber' }), '/character/amber');
assert.equal(misc_relation_path({ category: 'task', id: 'quest-v1.x' }), '/travel-log/task/quest-v1.x');
assert.equal(misc_relation_path({ category: 'quest_item', id: 'item-1' }), '/travel-log/quest-item/item-1');
for (const relation of [{ category: 'unknown', id: '1' }, { category: 'constructor', id: '1' },
    { category: 'misc', id: '1771' }, { category: 'character', id: '../amber' }, { category: 'misc', id: 'tutorial-1/2' }]) assert.equal(misc_relation_path(relation), null);
assert.equal(misc_relation_path({ category: 'source', id: 'achievementgroup-0' }), null);
assert.equal(misc_relation_path({ category: 'source', id: 'region-1' }), null);
assert.equal(misc_relation_label_key('group'), 'misc.roles.group');
assert.equal(misc_relation_label_key('region'), 'misc.roles.region');
assert.equal(misc_relation_label_key('unlock_achievement'), 'misc.roles.unlock');
assert.equal(misc_relation_label_key('unlock_arbitrary_source'), 'misc.roles.unlock');
assert.equal(misc_relation_label_key('unknown'), null);
assert.equal(misc_section_label_key('unknown'), null);
assert.equal(entry_plain_text('<span>A &amp; B</span><br>&lt;img&gt; &#x4e2d;'), 'A & B\n<img> 中');
const copy = misc_copy_text({ ...misc_fixture, name: '<b>Tutorial</b>', description: 'Keyboard fragment' }, 'Scope note');
assert.equal(copy, 'Scope note\n\nTutorial\n\nPC\n\nKeyboard fragment\n\nTouch fragment\n\nPS\n\nController fragment\n\nAchievement');
assert(!copy.includes('18446744073709551615'));
const combined = { ...misc_fixture, description: 'First <b>part</b>\n\nSecond part', sections: [
    { kind: 'PC', title: 'PC', text: 'First <b>part</b>' }, { kind: 'PC', title: 'PC', text: 'Second part' },
    { kind: 'Mobile', title: 'Mobile', text: 'Separate touch controls' },
] };
assert.equal(misc_detail_description(combined), '', 'concatenated platform summaries must not repeat the detail sections');
assert.equal(misc_copy_text(combined).split('Second part').length - 1, 1);
assert(misc_copy_text(combined).includes('Separate touch controls'));
assert.equal(combined.description, 'First <b>part</b>\n\nSecond part', 'source data must remain unchanged');
assert.equal(misc_detail_description({ ...combined, description: 'An independent description' }), 'An independent description');
const source_relations = { ...misc_fixture, relations: [
    { category: 'source', id: 'region-1', name: 'Mondstadt', role: 'region' },
    { category: 'source', id: 'achievementgroup-0', name: 'Wonders of the World', role: 'group' },
    { category: 'source', id: 'outfit-200301', name: 'Original unlock name', role: 'unlock_outfit' },
] };
const relation_copy = misc_copy_text(source_relations, '', role => `Friendly ${role}`);
assert(relation_copy.includes('Friendly region: Mondstadt'));
assert(relation_copy.includes('Friendly group: Wonders of the World'));
assert(relation_copy.includes('Friendly unlock_outfit: Original unlock name'));
const blank = { ...misc_fixture, sections: [{ title: 'PC', kind: 'pc', text: '' }, { text: '  \n<br> ' }, { text: 'Visible' }],
    images: [{ name: 'Tutorial', url: '/images/tutorial.png' }] };
assert.equal(misc_visible_sections(blank).length, 1);
assert.equal(blank.sections.length, 3, 'blank source sections must be retained');
assert(!misc_copy_text(blank).includes('\n\nPC'), 'empty sections must not produce orphaned copy headings');
assert.equal(display_images(blank.images).length, 1, 'missing text must not hide available images');
const unnamed = { ...misc_fixture, name: '', source: { ...misc_fixture.source, id: '11' }, diagnostics: ['missing_name'] };
const fallback = misc_placeholder_name('教程', `tutorial-${unnamed.source.id}`);
assert.equal(fallback, '教程 · tutorial-11');
assert(misc_copy_text(unnamed, '', undefined, fallback).startsWith('教程 · tutorial-11\n\nSummary'));
assert.equal(unnamed.name, '');
assert.deepEqual(unnamed.diagnostics, ['missing_name']);
const pages = [{ id: '1', type: 'tutorial', name: 'A &amp; B', description: 'Keyboard', show: true },
    { id: '2', type: 'achievement_group', name: 'Collection', description: '', show: true },
    { id: '3', type: 'tutorial', name: 'Hidden', description: 'Keyboard', show: false }];
assert.equal(filter_archive_pages(pages, 'a & b', 'all').length, 1);
assert.equal(filter_archive_pages(pages, 'keyboard', 'tutorial').length, 1);
assert.equal(filter_archive_pages(pages, '', 'achievement_group')[0]!.id, '2');
assert.equal(filter_archive_pages(pages, '', 'all').length, 2);
assert.equal(filter_archive_pages([{ id: 'tutorial-11', name: '', description: '', type: 'tutorial', show: true }], 'tutorial-11', 'all').length, 1);
assert.equal(archive_page_number('3', 130, 48), 3);
assert.equal(archive_page_number('99', 130, 48), 3);
for (const value of ['-1', 'nan', ['2'], undefined, '9999999999999999999999999999']) assert.equal(archive_page_number(value, 130, 48), 1);
assert.equal(archive_page_number('2', 0, 48), 1);
for (const lang of ['zh_hans', 'en']) {
    const data = JSON.parse(readFileSync(`data/${lang}/misc/pages.json`, 'utf8')) as MiscPageData[];
    assert.equal(data.length, 5712);
    assert.equal(data.filter(page => page.type === 'achievement_group').length, 73);
    assert(!data.some(page => String(page.type) === 'mail_template'));
    assert.equal(misc_relation_path({ category: 'misc', id: 'achievement_group-0' }), '/misc/achievement_group-0');
    const members = new Set<string>();
    for (const group of data.filter(page => page.type === 'achievement_group')) {
        const item: MiscItem = JSON.parse(readFileSync(`data/${lang}/misc/items/${group.id}.json`, 'utf8'));
        const snapshot = JSON.stringify(item);
        const rows = misc_collection_members(item, data);
        assert.deepEqual(rows.map(row => row.id), [...new Set(item.relations.map(relation =>
            data.find(page => page.id === relation.id)?.group?.id || relation.id))]);
        for (const row of rows) {
            const page = data.find(page => page.id === row.id)!;
            assert.equal(row.name, page.name);
            assert.equal(row.description, page.description, 'member summaries must retain full source text');
        }
        const fallback = misc_collection_members(item, []);
        assert.deepEqual(fallback.map(row => row.name), item.relations.map(relation => relation.name), 'failed list requests must retain named links');
        assert.equal(JSON.stringify(item), snapshot);
        assert(item.name && item.source.id !== undefined);
        for (const relation of item.relations) {
            assert.equal(relation.category, 'misc');
            assert.equal(relation.role, 'achievement');
            assert(!members.has(relation.id));
            members.add(relation.id);
        }
    }
    assert.equal(members.size, 1854);
}
assert(!is_misc_collection_member(misc_fixture, { category: 'misc', role: 'achievement', id: 'achievement-1', name: '' }));
assert(!readFileSync('app/components/MiscDetail.vue', 'utf8').includes('misc.source_details'));
console.log('Misc frontend: URL-only galleries, image labels, relations, copy, search/filter and pagination passed.');
for (const lang of ['zh_hans', 'en']) {
    const locale = JSON.parse(readFileSync(`i18n/locales/${lang}.json`, 'utf8'));
    const pages = JSON.parse(readFileSync(`data/${lang}/misc/pages.json`, 'utf8'));
    for (const page of pages.filter((page: any) => page.type === 'loading_tip')) {
        const item = JSON.parse(readFileSync(`data/${lang}/misc/items/${page.id}.json`, 'utf8')) as MiscItem;
        for (const situation of item.loading_situations || []) {
            assert(locale.misc.loading.actions[situation.action]);
            assert(!situation.action.includes('SITUATION_TYPE_'));
            if (situation.terrain) assert(locale.misc.loading.terrains[situation.terrain]);
        }
    }
}
const situationCopy = misc_copy_text({ ...misc_fixture, loading_situations: [{ id: '1', action: 'transport',
    areas: [{ id: '1100', name: 'Plain area' }], terrain: 'city' }] }, '', undefined, '', key => key.split('.').at(-1)!);
assert(situationCopy.includes('transport\nareas：Plain area · terrain：city'));
assert(!situationCopy.includes('1100'));
const unnamedSituationCopy = misc_copy_text({ ...misc_fixture, loading_situations: [{ id: '87', action: 'transport',
    areas: [{ id: '99101', name: '' }] }] }, '', undefined, '', key => key.split('.').at(-1)!);
assert(unnamedSituationCopy.includes('unnamed_area'));
assert(!unnamedSituationCopy.includes('unspecified'));
assert(!unnamedSituationCopy.includes('terrain：'));
assert.deepEqual(loading_situation_fields({ id: '1', action: 'transport', areas: [] }, key => key), []);
const label = (key: string, values?: Record<string, string | number>) => values?.id ? `${key}:${values.id}` : key;
const situationFixture = [
    { id: '1', action: 'transport', areas: [{ id: '1', name: 'Area' }], terrain: 'city' },
    { id: '9', action: 'login', areas: [] },
    { id: '2', action: 'transport', areas: [], terrain: 'outdoor' },
    { id: '65', action: 'certain_dungeon', areas: [], dungeons: [{ id: '156', name: '' }] },
    { id: '68', action: 'certain_dungeon', areas: [], dungeon_type: 'character_master' },
    { id: '101', action: 'specified_room', areas: [], scene_ids: ['1161'] },
];
const situationSnapshot = JSON.stringify(situationFixture);
const situationGroups = loading_situation_groups(situationFixture, label);
assert.deepEqual(situationGroups.map(value => value.action), ['transport', 'login', 'certain_dungeon', 'specified_room']);
assert.deepEqual(situationGroups[0]!.columns.map(value => value.key), ['areas', 'terrain']);
assert.equal(situationGroups[0]!.rows.length, 2);
assert.equal(situationGroups[1]!.rows.length, 0, 'login must not show irrelevant placeholders');
assert.deepEqual(loading_situation_fields(situationFixture[3]!, label).map(value => value.key), ['dungeons']);
assert(loading_situation_fields(situationFixture[3]!, label)[0]!.text.endsWith(':156'));
assert.deepEqual(loading_situation_fields(situationFixture[4]!, label).map(value => value.key), ['dungeon_type']);
assert.deepEqual(loading_situation_fields(situationFixture[5]!, label).map(value => value.text), ['1161']);
assert.equal(JSON.stringify(situationFixture), situationSnapshot);
const situationComponent = readFileSync('app/components/MiscLoadingSituations.vue', 'utf8');
assert.match(situationComponent, /<template>\s*<el-table\b/);
assert(!/<(?:table|el-collapse|el-card|el-descriptions)\b/.test(situationComponent), 'situations render one Element Plus table directly inside the detail card');
assert(situationComponent.includes(':span-method="span_method"'));
assert(situationComponent.includes('round_icon_with_bg situation-image'), 'white loading art uses the shared grey background');
assert(situationComponent.includes('preview-teleported'));
const imageSituations = loading_situation_groups([
    { id: '5', action: 'quest_dungeon', image: { name: 'Domain', url: '/images/domain.png' } },
    { id: '9', action: 'login', image: { name: 'Invalid', url: 'javascript:alert(1)' } },
    { id: '10', action: 'logout', image: { name: 'Missing', url: null } },
], label);
assert.equal(imageSituations[0]!.rows[0]!.image!.url, '/images/domain.png', 'image-only situations must render');
assert.equal(imageSituations[1]!.rows.length, 0);
assert.equal(imageSituations[2]!.rows.length, 0);
for (const lang of ['zh_hans', 'en']) {
    const locale = JSON.parse(readFileSync(`i18n/locales/${lang}.json`, 'utf8'));
    assert(locale.misc.images.loading_background);
}
const sharedImage = { name: 'Shared', url: '/images/shared.png' };
const otherImage = { name: 'Other', url: '/images/other.png' };
const tableFixture = [
    { id: '1', action: 'transport', areas: [], image: sharedImage },
    { id: '2', action: 'transport', areas: [], image: sharedImage },
    { id: '3', action: 'transport', areas: [], image: otherImage },
    { id: '4', action: 'transport', areas: [], image: sharedImage },
    { id: '5', action: 'quest_dungeon', image: sharedImage },
    { id: '9', action: 'login' },
];
const tableSnapshot = JSON.stringify(tableFixture);
const tableRows = loading_situation_table_rows(tableFixture, label);
assert.equal(tableRows.length, 6);
assert.deepEqual(tableRows.map(row => row.action_span), [4, 0, 0, 0, 1, 1]);
assert.deepEqual(tableRows.map(row => row.image_span), [2, 0, 1, 1, 1, 1], 'image merging must not cross a different picture or action');
assert.equal(tableRows.at(-1)!.fields.length, 0, 'fieldless actions remain visible');
assert.equal(new Set(tableRows.map(row => row.id)).size, tableRows.length);
assert.equal(JSON.stringify(tableFixture), tableSnapshot);
for (const lang of ['zh_hans', 'en']) {
    const pages = JSON.parse(readFileSync(`data/${lang}/misc/pages.json`, 'utf8'));
    for (const page of pages.filter((page: any) => page.type === 'loading_tip')) {
        const item = JSON.parse(readFileSync(`data/${lang}/misc/items/${page.id}.json`, 'utf8')) as MiscItem;
        const snapshot = JSON.stringify(item);
        const rows = loading_situation_table_rows(item.loading_situations || [], label);
        assert.equal(rows.reduce((sum, row) => sum + row.action_span, 0), rows.length);
        assert.equal(rows.reduce((sum, row) => sum + row.image_span, 0), rows.length);
        assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
        for (const [index, row] of rows.entries()) {
            if (row.image_span > 1) assert(rows.slice(index, index + row.image_span).every(next => next.action === row.action && next.image?.url === row.image?.url));
            if (row.action_span > 1) assert(rows.slice(index, index + row.action_span).every(next => next.action === row.action));
        }
        assert.equal(JSON.stringify(item), snapshot);
    }
}
