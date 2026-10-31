import assert from 'node:assert/strict';
import { entry_copy_text } from '../shared/entry_copy';
import { misc_copy_text } from '../app/utils/misc';
import { misc_fixture } from './check_misc_contract';

const item = { name: '<b>Title &amp; name</b>', description: 'One<br>Two',
    sections: [{ kind: 'story', title: 'Story', text: '503 things &lt;tag&gt;' }, { text: '<br>  ' }],
    relations: [{ name: '<i>Companion</i>', role: 'component', count: 3 }, { name: '', role: 'empty' }],
};
const before = JSON.stringify(item);
const value = entry_copy_text(item, { relation_label: role => `Label ${role}`, metadata: ['<b>Type</b>'], dialogues: ['Speaker：Line'] });
assert.equal(value, 'Title & name\n\nType\n\nOne\nTwo\n\nStory\n\n503 things <tag>\n\nLabel component: Companion × 3\n\nSpeaker：Line');
assert.equal(JSON.stringify(item), before);
assert.equal(entry_copy_text({ ...item, description: '503 things &lt;tag&gt;' }).match(/503 things/g)?.length, 1);
assert(entry_copy_text({ ...item, name: '' }, { fallback_name: 'Unnamed' }).startsWith('Unnamed\n'));
assert.equal(misc_copy_text(misc_fixture), entry_copy_text(misc_fixture));
console.log('Shared detail copy: metadata, original numeric text, paragraphs, relation names/counts, all dialogue lines and source immutability passed.');
