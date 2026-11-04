import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { message_thread_path, message_continues, select_message_reply } from '../shared/message_thread';
import { TUTORIAL_CATEGORIES, filter_tutorial_category, type MiscMessageThread } from '../shared/misc';
import type { MiscItem, MiscPageData } from '../app/types/misc';
import { create_misc_processor } from '../server/utils/misc';
import { parse_settings } from '../server/utils/settings';
import { misc_copy_text } from '../app/utils/misc';
import { misc_fixture } from './check_misc_contract';

const graph: MiscMessageThread = { initial: ['a', 'b'], nodes: [
    { id: 'a', kind: 'option', text: 'A', next: ['x', 'y'] },
    { id: 'b', kind: 'option', text: 'B', next: ['x', 'y'] },
    { id: 'x', kind: 'text', text: 'Reply A', requires: 'a', next: ['end'] },
    { id: 'y', kind: 'text', text: 'Reply B', requires: 'b', next: ['end'] },
    { id: 'end', kind: 'control', text: '', next: [] },
] };
assert.equal(message_thread_path(graph, {}).length, 1);
const first = message_thread_path(graph, { 'a|b': 'a' });
assert.deepEqual(first.filter(item => item.kind === 'message').map(item => item.node.id), ['x']);
const second = message_thread_path(graph, { 'a|b': 'b', unrelated: 'a' });
assert.deepEqual(second.filter(item => item.kind === 'message').map(item => item.node.id), ['y']);
const nested: MiscMessageThread = { initial: ['a', 'b'], nodes: [
    { id: 'a', kind: 'option', text: 'A', next: ['c', 'd'] },
    { id: 'b', kind: 'option', text: 'B', next: ['c', 'd'] },
    { id: 'c', kind: 'option', text: 'C', next: [] },
    { id: 'd', kind: 'option', text: 'D', next: [] },
] };
const old_replies = { 'a|b': 'a', 'c|d': 'c' };
assert.deepEqual(select_message_reply(nested, old_replies, 'a|b', 'b'), { 'a|b': 'b' });
assert.deepEqual(select_message_reply(nested, old_replies, 'c|d', 'd'), { 'a|b': 'a', 'c|d': 'd' });
assert.equal(select_message_reply(nested, old_replies, 'a|b', 'a'), old_replies);
assert.deepEqual(old_replies, { 'a|b': 'a', 'c|d': 'c' });
assert.throws(() => select_message_reply(nested, {}, 'c|d', 'c'), /Unavailable/);
assert.throws(() => select_message_reply(nested, {}, 'a|b', 'c'), /Invalid/);
const correspondence: MiscMessageThread = { initial: ['one'], nodes: [
    { id: 'one', kind: 'text', speaker: 'Sender', text: 'First', next: ['two'] },
    { id: 'two', kind: 'image', speaker: 'Sender', text: '', image: { name: 'Image', url: '/images/test.png' }, next: ['reply'] },
    { id: 'reply', kind: 'option', text: 'Reply', next: ['three'] },
    { id: 'three', kind: 'text', speaker: 'Sender', text: 'After reply', next: [] },
] };
const correspondence_path = message_thread_path(correspondence, { reply: 'reply' });
assert(!message_continues(correspondence_path, 0));
assert(message_continues(correspondence_path, 1), 'same sender attachment belongs with the preceding message');
assert(!message_continues(correspondence_path, 2));
assert(!message_continues(correspondence_path, 3), 'a reply starts a new sender group');
assert.throws(() => message_thread_path({ initial: ['missing'], nodes: [] }, {}), /Missing message node/);
assert.throws(() => message_thread_path({ initial: ['x'], nodes: [{ id: 'x', kind: 'control', text: '', next: ['x'] }] }, {}), /Message cycle/);

const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';
const source: MiscItem = { ...misc_fixture, message_thread: { initial: ['x'], nodes: [{ id: 'x', kind: 'text',
    text: hostile, speaker: hostile, preview: hostile, location: hostile, next: [] }] } };
const snapshot = JSON.stringify(source);
const safe = create_misc_processor(parse_settings(undefined), (key: string) => key).item(source);
for (const value of Object.values(safe.message_thread!.nodes[0]!)) {
    if (typeof value === 'string') assert(!value.includes('<img') && !value.includes('<script'));
}
assert.equal(JSON.stringify(source), snapshot);

for (const lang of ['zh_hans', 'en']) {
    const pages: MiscPageData[] = JSON.parse(readFileSync(`data/${lang}/misc/pages.json`, 'utf8'));
    const tutorials = pages.filter(page => page.type === 'tutorial');
    assert.equal(tutorials.length, 2213);
    for (const page of tutorials) assert(TUTORIAL_CATEGORIES.includes(page.tutorial_category as typeof TUTORIAL_CATEGORIES[number]));
    assert.equal(TUTORIAL_CATEGORIES.reduce((sum, category) => sum + filter_tutorial_category(tutorials, category).length, 0), tutorials.length);
    assert.equal(filter_tutorial_category(tutorials, 'all').length, tutorials.length);
    const messages = pages.filter(page => page.type === 'graeae_message');
    assert.equal(messages.length, 24);
    let visible = 0, replies = 0, pictures = 0;
    for (const page of messages) {
        assert.equal(page.icon, null);
        const item: MiscItem = JSON.parse(readFileSync(`data/${lang}/misc/items/${page.id}.json`, 'utf8'));
        const thread = item.message_thread!;
        assert(thread && thread.nodes.length);
        const before = JSON.stringify(thread), seen = new Set<string>();
        let paths = 0;
        function visit(selections: Record<string, string>) {
            assert(++paths < 1000, 'unbounded reply graph');
            const path = message_thread_path(thread, selections);
            for (const entry of path) {
                if (entry.kind === 'message') seen.add(entry.node.id);
                else if (entry.selected) seen.add(entry.selected);
            }
            const pending = path.find(entry => entry.kind === 'choices' && !entry.selected);
            if (pending?.kind === 'choices') for (const option of pending.options) visit({ ...selections, [pending.key]: option.id });
        }
        visit({});
        const expected = thread.nodes.filter(node => node.kind !== 'control');
        assert.deepEqual([...seen].sort(), expected.map(node => node.id).sort(), `Unreachable source content in ${page.id}`);
        assert.equal(JSON.stringify(thread), before);
        for (const node of expected) {
            if (node.kind === 'option') replies++; else visible++;
            if (node.image) {
                pictures++;
                assert(node.image.url?.startsWith('/images/'));
                assert(item.images.some(image => image.name === node.image!.name && image.url === node.image!.url));
            }
        }
        const copy = misc_copy_text(item);
        assert(!copy.includes('/images/'));
        assert(copy.length >= item.name.length);
    }
    assert.equal(visible, 260);
    assert.equal(replies, 45);
    assert.equal(pictures, 2);
}
console.log('Misc messages: every formal branch, reply, attachment, safe text and six tutorial categories passed.');
