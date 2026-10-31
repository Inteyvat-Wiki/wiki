import assert from 'node:assert/strict';
import { list_page_size, list_page_anchor, list_anchor_page, list_grid_columns } from '../shared/list_pagination';

assert.equal(list_grid_columns(12, [{ start: 'span 2', end: 'auto' }]), 6);
assert.equal(list_grid_columns(12, [{ start: 'auto', end: 'span 3' }]), 4);
assert.equal(list_grid_columns(12, [{ start: 'span 6', end: 'auto' }]), 2);
assert.equal(list_grid_columns(4, [{ start: 'auto', end: 'auto' }]), 4, 'companion auto-fill grid');
assert.equal(list_grid_columns(12, [{ start: 'span 12', end: 'auto' }]), 1);
assert.equal(list_grid_columns(12, []), 12);

assert.equal(list_page_size(6, 'gallery'), 30);
assert.equal(list_page_size(2, 'gallery'), 10);
assert.equal(list_page_size(1, 'text'), 10);
assert.equal(list_page_size(2, 'compact'), 16);
assert.equal(list_page_size(4, 'index'), 40);
for (const columns of [0, 1, 2, 3, 4, 6, 12, Infinity, NaN]) {
    const size = list_page_size(columns, 'gallery');
    assert(Number.isSafeInteger(size) && size > 0 && size <= 120);
}
assert.equal(list_page_anchor('3', undefined, 1000), 96, 'legacy page URLs use the former 48-entry capacity');
assert.equal(list_page_anchor('3', '30', 1000), 60);
assert.equal(list_page_anchor('999', '30', 70), 60);
assert.equal(list_page_anchor('999', '30', 0), 0);
for (const invalid of ['NaN', '-1', '0', '1.5', '1e2', ['2'], null, '999999999999999999999']) {
    assert.equal(list_page_anchor(invalid, '30', 1000), 0);
    assert.equal(list_page_anchor('3', invalid, 1000), 96);
}
for (const size of [5, 10, 16, 30, 40]) {
    const anchor = list_page_anchor('3', '30', 1000);
    const page = list_anchor_page(anchor, size);
    assert((page - 1) * size <= anchor && anchor < page * size, 'resize keeps the bookmarked entry on screen');
    assert.equal(list_page_anchor(String(page), String(size), 1000), (page - 1) * size, 'next-page navigation records its own capacity');
}
console.log('Adaptive pagination: layout density, bounds, legacy URLs, empty results and resize anchors passed.');
