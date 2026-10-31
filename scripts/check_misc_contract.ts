import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MISC_TYPES, is_misc_id, is_misc_type, type MiscRecord } from '../shared/misc';
import type { MiscItem, MiscPageData } from '../app/types/misc';
for (const id of ['tutorial-second_blooming', 'loading_tip-genius_invokation_tcg-0', 'achievement_group-genius_invokation_tcg']) assert(is_misc_id(id));
for (const id of ['tutorial--second_blooming', 'tutorial-../escape', 'mail_template-test']) assert(!is_misc_id(id));

type Assert<T extends true> = T;
export type ItemContract = Assert<Extract<'id' | 'order' | 'show' | 'version' | 'talks' | 'layout', keyof MiscItem> extends never ? true : false>;
export type RequiredItemFields = Assert<keyof Omit<MiscRecord, 'id' | 'order' | 'show' | 'version'> extends keyof MiscItem ? true : false>;
export type SourceIDContract = Assert<MiscItem['source']['id'] extends string ? true : false>;
export type SourceHashContract = Assert<MiscItem['source']['hashes'][number] extends string ? true : false>;
export type PublishedRelationContract = Assert<Extract<'source_id', keyof MiscItem['relations'][number]> extends never ? true : false>;

export const misc_fixture: MiscItem = {
    type: 'tutorial', name: 'Tutorial', description: 'Summary',
    sections: [{ title: 'PC', kind: 'pc', text: 'Keyboard fragment' },
        { kind: 'mobile', text: 'Touch fragment' }, { title: 'PS', kind: 'ps', text: 'Controller fragment' }],
    images: [{ name: 'UI_Tutorial_1771', kind: 'preview', url: null }, { name: '18446744073709551615', kind: 'hash', url: null }],
    relations: [{ category: 'misc', id: 'achievement-80001', name: 'Achievement', role: 'related' }],
    source: { table: 'TutorialExcelConfigData', id: '1771', hashes: ['4294967295', '2179024312'],
        references: ['TextMap:4294967295', 'TextureHash:18446744073709551615', 'TextureHash:9007199254740993', 'UI_Tutorial_1771'] },
    diagnostics: ['Unavailable image'],
};

assert.equal(MISC_TYPES.length, 10);
assert.equal(new Set(MISC_TYPES).size, 10);
for (const type of MISC_TYPES) {
    assert(is_misc_type(type));
    assert(is_misc_id(`${type}-1771`));
    const item: MiscItem = { ...misc_fixture, type };
    const page: MiscPageData = { id: `${type}-1771`, type, name: item.name, description: item.description,
        icon: null, star: null, show: true, items: [`${type}-1771`], related_items: [] };
    assert.equal(page.type, item.type);
}
for (const value of ['achievement-80001', 'achievement_group-0', 'namecard-210001', 'tutorial-1771']) assert(is_misc_id(value));
assert(!is_misc_id('mail_template-1001'));
assert(!is_misc_type('mail_template'));
for (const value of ['the_wind_and_the_star_traveler', 'wonders_of_the_world', 'a_riotous_response-0']) assert(is_misc_id(value));
for (const value of [null, 1771, '1771', 'tutorial-', 'tutorial-../1771', 'tutorial-1/2', 'tutorial-1%2f2', 'tutorial-1.2']) assert(!is_misc_id(value));
assert(!is_misc_type('mail'));
const roundtrip: MiscItem = JSON.parse(JSON.stringify(misc_fixture));
assert.deepEqual(roundtrip.source.hashes, ['4294967295', '2179024312']);
for (const hash of roundtrip.source.hashes) assert(BigInt(hash) <= 0xffffffffn, 'TextMap hashes are uint32 strings');
assert.equal(roundtrip.images[1]!.name, '18446744073709551615');
assert.equal(typeof roundtrip.source.id, 'string');
assert.deepEqual(roundtrip.source.references, misc_fixture.source.references);
for (const key of ['id', 'order', 'show', 'version', 'talks', 'layout']) assert(!Object.hasOwn(roundtrip, key));
for (const lang of ['en', 'zh_hans']) {
    const locale = JSON.parse(readFileSync(`i18n/locales/${lang}.json`, 'utf8'));
    for (const type of MISC_TYPES) assert(locale.misc.types[type]);
    assert(locale.menu.misc);
}
console.log('Misc contract: ten types, item/page separation, source strings and locale coverage passed.');
