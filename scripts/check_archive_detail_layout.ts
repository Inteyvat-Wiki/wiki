import assert from 'node:assert/strict';
import fs from 'node:fs';
import { entry_detail_content, entry_is_long_text, entry_plain_text, type EntrySection } from '../shared/archive_display';
import { archive_title_image, archive_detail_images } from '../shared/archive';

// Publication assets are already selected by wiki-data; the UI knows no game filenames.
const hall_large = { name: 'large', kind: 'preview', url: '/images/large.png' };
const hall_public = { name: 'public', kind: 'theme', url: '/images/public.png' };
const hall_images = [hall_large, hall_public];
const hall_before = JSON.stringify(hall_images);
assert.deepEqual(archive_detail_images('miliastra', 'hall', hall_images), [hall_large, hall_public]);
assert.deepEqual(archive_detail_images('miliastra', 'hall', [{ ...hall_large, url: null }]), []);
assert.equal(JSON.stringify(hall_images), hall_before, 'gallery filtering must not change list covers or source images');

const player_avatar = { url: '/images/player.png', kind: 'player' };
const player_extra = { url: '/images/extra.png', kind: 'other' };
const player_images = [{ url: null, kind: 'player:imageNameHash' }, player_avatar, player_extra, { ...player_avatar }];
const player_snapshot = JSON.stringify(player_images);
assert.equal(archive_title_image('tcg', 'player', player_images), player_avatar);
assert.deepEqual(archive_detail_images('tcg', 'player', player_images), [player_extra], 'title avatar must not repeat in a large gallery');
assert.deepEqual(archive_detail_images('tcg', 'player', [player_avatar]), []);
assert.equal(archive_title_image('tcg', 'player', [{ url: null, kind: 'player' }]), undefined);
assert.equal(archive_title_image('tcg', 'card', player_images), undefined);
assert.equal(archive_title_image('serenitea', 'companion', player_images), undefined);
const companion_images = [{ url: '/images/side.png', kind: 'side_portrait' }, { url: '/images/avatar.png', kind: 'portrait' }];
assert.equal(archive_title_image('serenitea', 'companion', companion_images), companion_images[1]);
assert.equal(archive_title_image('serenitea', 'companion', [{ url: null, kind: 'portrait' }]), undefined);
assert.deepEqual(archive_detail_images('serenitea', 'companion', companion_images), [], 'companions keep small avatars only, never a gallery');
const stage_images = [{ url: '/images/loading.png', kind: 'stage_loading' }, { url: '/images/opponent.png', kind: 'opponent' }];
assert.equal(archive_title_image('tcg', 'stage', stage_images), stage_images[1]);
assert.equal(archive_title_image('tcg', 'stage', [stage_images[0]!]), undefined, 'loading art must not substitute for the opponent');
assert.deepEqual(archive_detail_images('tcg', 'stage', stage_images), [], 'stage avatars must not restore the large gallery');
assert.equal(JSON.stringify(player_images), player_snapshot, 'avatar presentation must not mutate source images');
const detail_template = fs.readFileSync('app/components/ArchiveDetail.vue', 'utf8');
assert(!detail_template.includes('archive.image_pending'));
const misc_template = fs.readFileSync('app/components/MiscDetail.vue', 'utf8');
assert(!misc_template.includes('tutorial_scope'));
assert(!fs.readFileSync('app/components/MiscList.vue', 'utf8').includes('tutorial_scope'));
const dialogues_template = fs.readFileSync('app/components/ArchiveDialogues.vue', 'utf8');
assert(!dialogues_template.includes('source_dialogue_hint'));
assert(!dialogues_template.includes('all_topics_hint'));
assert(!misc_template.includes('archive.image_unavailable'));
assert(!misc_template.includes('misc.some_images_unavailable'));
assert(!fs.readFileSync('app/components/ArchiveGallery.vue', 'utf8').includes('class="gallery-hint"'));
const gallery_template = fs.readFileSync('app/components/ArchiveGallery.vue', 'utf8');
assert(!gallery_template.includes('#header') && !gallery_template.includes('gallery-heading'), 'gallery needs no redundant image header or counter');
assert(gallery_template.includes('images.length > 1 && selected_label'), 'single images need no visible caption');
assert(gallery_template.includes(':alt="image_label(selected_index)"') && gallery_template.includes(':aria-label='), 'accessible image labels must remain');
assert(detail_template.includes('class="round_icon archive-title-avatar"'));
assert(detail_template.includes('@error="title_image_failed = true"'));
for (const lang of ['zh_hans', 'en']) {
    const companions = `data/${lang}/serenitea/items`;
    for (const file of fs.readdirSync(companions)) {
        const item = JSON.parse(fs.readFileSync(`${companions}/${file}`, 'utf8'));
        if (item.type !== 'companion') continue;
        const title = archive_title_image('serenitea', item.type, item.images);
        assert(title?.kind === 'portrait', `${lang}/${file}: companion needs the character portrait, not the side portrait`);
        assert.deepEqual(archive_detail_images('serenitea', item.type, item.images), []);
    }
    const directory = `data/${lang}/tcg/items`;
    for (const file of fs.readdirSync(directory)) {
        const item = JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8'));
        if (item.type !== 'player') continue;
        const title = archive_title_image('tcg', item.type, item.images);
        const gallery = archive_detail_images('tcg', item.type, item.images);
        assert(!title || !gallery.some(image => image.url === title.url), `${lang}/${file}: duplicated title avatar`);
        assert.equal(!!title, item.images.some((image: { kind: string; url: string | null }) => image.kind === 'player' && !!image.url));
    }
}

const list_template = fs.readFileSync('app/components/ArchiveList.vue', 'utf8');
assert(!list_template.includes('archive.image_unavailable'), 'lists must not render missing-image placeholders');
const entry_template = fs.readFileSync('app/components/ArchiveListEntry.vue', 'utf8');
assert(!entry_template.includes('archive.image_unavailable'));
assert(entry_template.includes('@error="image_failed = true"'), 'failed list images must collapse their container');

for (const component of ['ArchiveDetail', 'MiscDetail']) {
    const template = fs.readFileSync(`app/components/${component}.vue`, 'utf8');
    const fields = template.match(/<el-descriptions\b[\s\S]*?<\/el-descriptions>/)?.[0];
    assert(fields?.includes('<inline-text :text="section.text" />'), `${component}: information fields must retain rich text`);
    assert(!fields?.includes('<normal-text'), `${component}: information fields must not have per-field copy buttons`);
    assert(template.includes('<entry-text-blocks :blocks="content.blocks"'), `${component}: shared long-text copy must remain available`);
    assert(template.includes('@click="copy_all"'), `${component}: copy-all must remain available`);
}
assert(fs.readFileSync('app/components/EntryTextBlocks.vue', 'utf8').includes('<normal-text v-for="(section, section_index) in block.sections"'));

assert(!entry_is_long_text('短说明'));
assert(!entry_is_long_text(`<span class="${'class-'.repeat(100)}">短说明</span>`), 'HTML markup must not count as visible text');
assert(!entry_is_long_text('字'.repeat(180)));
assert(entry_is_long_text('字'.repeat(181)));
assert(entry_is_long_text('A'.repeat(361)));

const metadata = ['classification', 'source', 'unlock', 'preferred_characters', 'quality', 'body_type', 'color',
    'slot', 'category', 'variant', 'ps5_title', 'sender', 'acquisition', 'subtitle', 'alternate_title'];
const fixture = { description: 'Short description', sections: [
    ...metadata.map(kind => ({ kind, title: kind, text: kind === 'source' ? 'Source '.repeat(100) : 'Original value' })),
    { kind: 'story', title: 'Short story', text: 'A brief original quotation.' },
    { kind: 'story', title: 'Long story', text: 'Long original paragraph. '.repeat(40) },
    { kind: 'empty', title: 'No body text', text: '<br>  \n' },
] };
const before = JSON.stringify(fixture);
const layout = entry_detail_content(fixture);
assert.equal(layout.fields.length, metadata.length + 2);
for (const kind of metadata) assert(layout.fields.some(section => section.kind === kind), kind);
assert.equal(layout.blocks.length, 1);
assert.equal(layout.blocks[0]!.title, 'Long story');
assert.equal(JSON.stringify(fixture), before);
assert.equal(entry_detail_content({ description: '字'.repeat(200), sections: [] }).blocks[0]!.kind, 'description');

const parts = [
    { kind: 'PC', title: 'PC', text: 'Short introduction' },
    { kind: 'PC', title: 'PC', text: 'Long paragraph. '.repeat(50) },
    { kind: 'PC', title: 'PC', text: 'Short final paragraph' },
    { kind: 'Mobile', title: 'Mobile', text: 'Separate platform text. '.repeat(30) },
];
const tutorial = { description: parts.slice(0, 3).map(section => section.text).join('\n\n'), sections: parts };
const tutorial_layout = entry_detail_content(tutorial);
assert.equal(tutorial_layout.fields.length, 0, 'the list summary must not duplicate source platform paragraphs');
assert.equal(tutorial_layout.blocks.length, 2, 'platform variants must stay separate');
assert.deepEqual(tutorial_layout.blocks[0]!.sections, parts.slice(0, 3), 'short/long/short paragraphs must retain their order together');
assert.deepEqual(tutorial_layout.blocks[1]!.sections, parts.slice(3));

let checked = 0, fields = 0, blocks = 0;
for (const lang of ['zh_hans', 'en']) for (const category of ['serenitea', 'tcg', 'miliastra', 'misc']) {
    const directory = `data/${lang}/${category}/items`;
    for (const file of fs.readdirSync(directory)) {
        const item: { description: string; sections: EntrySection[] } = JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8'));
        const snapshot = JSON.stringify({ description: item.description, sections: item.sections });
        const result = entry_detail_content(item);
        const displayed = [...result.fields, ...result.blocks.flatMap(block => block.sections)];
        for (const section of item.sections) {
            assert.equal(displayed.filter(value => value === section).length, entry_plain_text(section.text) ? 1 : 0,
                `${lang}/${category}/${file}: source section lost or repeated`);
        }
        for (const block of result.blocks) {
            assert(entry_is_long_text(block.sections.map(section => section.text).join('<br><br>')));
            assert(block.sections.every(section => section.kind === block.kind && section.title === block.title));
        }
        assert.equal(JSON.stringify({ description: item.description, sections: item.sections }), snapshot);
        checked++; fields += result.fields.length; blocks += result.blocks.length;
    }
}
console.log(`Detail layout: ${checked} bilingual items, ${fields} information rows and ${blocks} long-text blocks; source text, paragraph order and immutability passed.`);
