import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gallery_size, gallery_panel_width, gallery_image_style } from '../shared/gallery_layout';
import { archive_detail_images } from '../shared/archive';
import { display_images } from '../shared/archive_display';

const avatar = gallery_size('misc', 'profile_picture');
assert.equal(avatar.width, 204);
assert(gallery_size('misc', 'tutorial').width > gallery_size('miliastra', 'costume').width);
assert(gallery_size('miliastra', 'hall').width > avatar.width);
assert(gallery_size('misc', 'achievement').width < 300);
assert.equal(gallery_panel_width(avatar, [{ width: 256, height: 256 }]), 204);
assert.equal(gallery_panel_width(gallery_size('tcg', 'card'), [{ width: 138, height: 233 }]), 182);
assert.equal(gallery_panel_width(avatar, []), avatar.width);
assert.equal(gallery_panel_width(avatar, [{ width: 0, height: 100 }]), avatar.width);
assert.equal(gallery_image_style(avatar, { width: 64, height: 64 })['--gallery-image-width'], '64px');
assert.equal(gallery_image_style(avatar, { width: 256, height: 256 })['--gallery-image-width'], '160px');
const tall = { width: 100, height: 1000 };
assert(Number.parseFloat(gallery_image_style(avatar, tall)['--gallery-image-width']) <= 22);

let checked = 0;
const dimensions = new Map<string, { width: number; height: number }>();
for (const category of ['serenitea', 'tcg', 'miliastra', 'misc']) {
    const directory = `data/zh_hans/${category}/items`;
    for (const file of fs.readdirSync(directory)) {
        const item = JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8'));
        const images = category === 'misc' ? display_images(item.images) : archive_detail_images(category, item.type, item.images);
        const size = gallery_size(category, item.type);
        for (const image of images) {
            if (!dimensions.has(image.url)) {
                const png = fs.readFileSync(`data${image.url}`);
                dimensions.set(image.url, { width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
            }
            const native = dimensions.get(image.url)!;
            const width = Number.parseFloat(gallery_image_style(size, native)['--gallery-image-width']);
            assert(width <= native.width && width <= size.imageWidth);
            assert(width * native.height / native.width <= size.imageHeight + 0.001);
            assert(gallery_panel_width(size, [native]) <= size.width);
            checked++;
        }
    }
}
for (const file of ['ArchiveDetail', 'MiscDetail', 'ItemCommon']) {
    assert(fs.readFileSync(`app/components/${file}.vue`, 'utf8').includes('<entry-media-layout'), `${file} must share media width rules`);
}
const gallery = fs.readFileSync('app/components/ArchiveGallery.vue', 'utf8');
assert(gallery.includes('target.naturalWidth') && gallery.includes('target.naturalHeight'));
assert(!gallery.includes('height: 420px') && !gallery.includes('min-height: 220px'));
assert(gallery.includes(':preview-src-list="image_urls"'), 'native image preview remains available');
console.log(`Detail gallery sizing: ${checked} available images fit their native resolution, aspect ratio and category bounds; small icons and large art use separate widths.`);
