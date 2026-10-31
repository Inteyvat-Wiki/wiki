import assert from 'node:assert/strict';
import fs from 'node:fs';
import { archive_classification_groups, archive_classification_children, filter_archive_classifications,
    filter_archive_pages } from '../app/utils/archive_list';
import type { ArchivePage } from '../app/types/archive';

const animal = { id: '9002', group_id: '11', group_name: 'Animal', name: 'Outdoor Creature' };
const indoor = { id: '9001', group_id: '16', group_name: 'Animal', name: 'Indoor Creature' };
const fixture = [
    { id: 'cat', type: 'furniture', name: 'Cat', description: '', show: true, classifications: [animal, indoor] },
    { id: 'unknown', type: 'furniture', name: '', description: '', show: true, classifications: [] },
    { id: 'old', type: 'furniture', name: 'Old', description: '', show: false,
        classifications: [{ ...animal, id: '999', group_id: '99' }] },
    { id: 'suite', type: 'suite', name: '', description: '', show: true, classifications: [animal] },
];
const snapshot = JSON.stringify(fixture);
const template = fs.readFileSync('app/components/ArchiveList.vue', 'utf8');
assert(template.includes('$t(classification_group_label)') && template.includes('$t(classification_child_label)'));
for (const lang of ['zh_hans', 'en']) {
    const labels = JSON.parse(fs.readFileSync(`i18n/locales/${lang}.json`, 'utf8')).archive;
    assert(labels.costume_classification_group && labels.costume_classification_child);
    assert.notEqual(labels.costume_classification_group, labels.classification_group);
    assert.notEqual(labels.costume_classification_child, labels.classification_child);
}
const visible = filter_archive_pages(fixture, '', 'furniture');
assert.deepEqual(archive_classification_groups(fixture).map(value => [value.id, value.duplicate_name]), [['11', true], ['16', true]]);
assert.deepEqual(archive_classification_children(fixture, '11').map(value => value.id), ['9002']);
assert.equal(filter_archive_classifications(visible, '11', '9002')[0]!.id, 'cat');
assert.equal(filter_archive_classifications(visible, '16', '9001')[0]!.id, 'cat');
assert.equal(filter_archive_classifications(visible, '11', '9001').length, 0, 'a child must match the same classification path');
assert.deepEqual(filter_archive_classifications(visible, 'unclassified').map(value => value.id), ['unknown']);
assert.equal(filter_archive_classifications(filter_archive_pages(fixture, 'cat', 'furniture'), '16').length, 1);
assert.equal(JSON.stringify(fixture), snapshot);

let identities: string | undefined;
for (const lang of ['zh_hans', 'en']) {
    const pages: ArchivePage[] = JSON.parse(fs.readFileSync(`data/${lang}/serenitea/pages.json`, 'utf8'));
    const furniture = filter_archive_pages(pages, '', 'furniture');
    const groups = archive_classification_groups(pages);
    assert.equal(furniture.length, 2324);
    assert.equal(groups.length, 13, 'same-name raw parent IDs must not be merged');
    assert.equal(filter_archive_classifications(furniture, 'unclassified').length, 5);
    assert.equal(furniture.filter(item => item.classifications!.length > 1).length, 79);
    const classified = new Set<string>();
    const types = new Set<string>();
    for (const group of groups) {
        const parent = filter_archive_classifications(furniture, group.id);
        const children = archive_classification_children(pages, group.id);
        const joined = new Set<string>();
        for (const child of children) {
            types.add(child.id);
            for (const item of filter_archive_classifications(furniture, group.id, child.id)) joined.add(item.id);
        }
        assert.deepEqual([...joined].sort(), parent.map(item => item.id).sort());
        for (const id of joined) classified.add(id);
    }
    assert.equal(types.size, 73);
    assert.equal(classified.size, 2319);
    const source_ids = JSON.parse(fs.readFileSync('data/common/serenitea/source_ids.json', 'utf8'));
    const cat = furniture.find(item => item.id === source_ids['furniture-369101'])!;
    for (const value of cat.classifications!) {
        assert(filter_archive_classifications(furniture, value.group_id, value.id).some(item => item.id === cat.id));
    }
    const ids = JSON.stringify(furniture.map(item => [item.id, item.classifications!.map(value => [value.group_id, value.id])]));
    if (identities) assert.equal(ids, identities, 'classification paths must survive language switching');
    identities = ids;
    console.log(`${lang}: 13 source parent IDs, 73 subcategories, 2319 classified and 5 unclassified furnishings passed.`);
}
console.log('Two-level classifications: source IDs, same-name groups, multi-membership, search and source immutability passed.');

let costume_paths: string | undefined;
for (const lang of ['zh_hans', 'en']) {
    const pages: ArchivePage[] = JSON.parse(fs.readFileSync(`data/${lang}/miliastra/pages.json`, 'utf8'));
    const costumes = filter_archive_pages(pages, '', 'costume');
    const before = JSON.stringify(costumes);
    const groups = archive_classification_groups(costumes);
    assert.equal(costumes.length, 2757);
    assert.deepEqual(groups.map(group => group.id), ['1', '2']);
    assert.equal(filter_archive_classifications(costumes, '1').length, 2180);
    assert.equal(filter_archive_classifications(costumes, '2').length, 567);
    assert.equal(filter_archive_classifications(costumes, 'unclassified').length, 10);
    const multi = costumes.filter(page => page.classifications!.length > 1);
    assert.equal(multi.length, 194);
    assert.equal(multi.filter(page => page.classifications!.some(value => value.id === '13')
        && page.classifications!.some(value => value.id === '14')).length, 87);
    for (const page of multi) for (const value of page.classifications!) {
        assert(filter_archive_classifications(costumes, value.group_id, value.id).includes(page));
    }
    for (const group of groups) {
        const children = archive_classification_children(costumes, group.id);
        const union = new Set(children.flatMap(child => filter_archive_classifications(costumes, group.id, child.id).map(page => page.id)));
        assert.deepEqual([...union].sort(), filter_archive_classifications(costumes, group.id).map(page => page.id).sort());
    }
    const paths = JSON.stringify(costumes.map(page => [page.id, page.classifications!.map(value => [value.group_id, value.id])]));
    if (costume_paths) assert.equal(paths, costume_paths);
    costume_paths = paths;
    assert.equal(JSON.stringify(costumes), before);
    console.log(`${lang}: costume filters: 2 groups, 194 multi-slot entries (including 87 dual-slot accessories) and 10 unclassified entries passed.`);
}
