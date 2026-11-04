import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, { fsCache: false });
const { map_condition_scope, unique_map_conditions } = await jiti.import('../app/utils/map_condition_scope.ts');
const { sort_map_task_conditions, set_map_condition_value } = await jiti.import('../app/utils/map_task_dependencies.ts');
const { resolve_map_mask_previews } = await jiti.import('../app/utils/map_mask_conditions.ts');
const { map_layer_label } = await jiti.import('../shared/map_display.ts');
const step = (id, task, number) => ({ id, type: 'step', task, step: number, state: 'finished', title: task, subtitle: '' });
const predicate = key => ({ op: 'selected', key, values: ['fulfilled'] });
const before = step('before', 'prelude', 3), unlock = step('unlock', 'cave', 5), rename = step('rename', 'cave', 10);
const failure = { ...unlock, state: 'failed' }, outsider = step('elsewhere', 'other', 1);
const mask = (id, overlay, conditions) => ({ id, overlayIds: [overlay], previewKey: `preview-${id}`,
    rules: conditions.map((condition, i) => ({ id: `${id}-${i}`, kind: 'requirement', when: [condition] })) });
const groups = [mask('clicked', 'surface', [before, rename]), mask('first-floor', 'first-image', [rename, unlock, { ...rename }]),
    mask('hidden-sibling', 'second-image', [unlock, failure]), mask('unrelated', 'other-image', [outsider])];
const scene = {
    layers: [{ id: 'first', groupId: 'cave', label: 'Cold cave', labelVariants: [{ label: 'Warm cave', condition: predicate('name') }] },
        { id: 'second', groupId: 'cave', label: 'Lower cave', condition: { op: 'constant', value: false } },
        { id: 'other', groupId: 'elsewhere', label: 'Cold cave' },
        { id: 'name-only', groupId: 'names', label: 'Old', labelVariants: [{ label: 'New', condition: predicate('name') }] }],
    overlays: [{ id: 'surface' }, { id: 'first-image', layerId: 'first' },
        { id: 'second-image', layerId: 'second', condition: { op: 'constant', value: false } }, { id: 'other-image', layerId: 'other' }],
    markers: [], regions: [], maskConditions: groups,
    maskGroups: [{ id: 'chosen', overlayIds: ['surface'], conditionIds: ['clicked'] }],
    states: [{ id: 'name', taskCondition: rename }],
};
assert.deepEqual(map_condition_scope(undefined, '', ''), { groups: [], conditions: [], choices: [] });
assert.equal(map_condition_scope(scene, '', '').conditions.length, 0);
assert.deepEqual(map_condition_scope(scene, 'chosen', '').conditions, [before, rename]);
const scope = map_condition_scope(scene, 'chosen', 'first');
assert.deepEqual(scope.groups.map(group => group.id), ['clicked', 'first-floor', 'hidden-sibling']);
assert.deepEqual(scope.conditions, [before, rename, unlock, failure]);
assert.deepEqual(map_condition_scope(scene, 'chosen', 'second'), scope); // Entire group, regardless of selected floor/visibility.
assert.deepEqual(map_condition_scope(scene, '', 'name-only').conditions, [rename]); // No mask or image required for a floor name.
assert(!scope.conditions.some(condition => condition.id === outsider.id)); // Equal labels cannot join groups.
const reordered = Object.fromEntries(Object.entries(rename).reverse());
assert.deepEqual(unique_map_conditions([rename, reordered, { ...rename }, unlock, failure]), [rename, unlock, failure]);
const count = { id: 'count', type: 'number', title: '', subtitle: '', comparison: 'equal', value: 1 };
assert.equal(unique_map_conditions([count, { ...count }, { ...count, value: 2 }]).length, 2);

// Predicate keys may be nested; unbound exported choices remain explicit and
// are never converted into invented task identities or mask-index controls.
const explicit = { ...scene, layers: [{ id: 'plain', groupId: 'plain', label: 'Old', labelVariants: [
    { label: 'New', condition: { op: 'all', args: [predicate('manual'), predicate('name'), predicate('preview-first-floor')] } },
] }], states: [...scene.states, { id: 'manual', label: 'Recorded choice', options: [{ id: 'on', label: 'On' }] },
    { id: 'preview-first-floor', label: 'Image preview' }] };
const explicitScope = map_condition_scope(explicit, '', 'plain');
assert.deepEqual(explicitScope.groups.map(group => group.id), ['first-floor']);
assert.deepEqual(explicitScope.choices.map(choice => choice.id), ['manual']);

// The merged list shares the existing map-only ordering and propagation. A
// visible successor also updates predecessors from the other selected source.
const dependencies = { schema: 1, sameTaskOrder: 'ascending', edges: [
    { from: { task: 'prelude', step: 3 }, to: { task: 'cave', step: 1 } },
] };
assert.deepEqual(sort_map_task_conditions(scope.conditions, dependencies).map(condition => condition.id), ['before', 'unlock', 'unlock', 'rename']);
const all = [...scope.conditions, outsider], initial = { before: 'unstarted', unlock: 'finished', rename: 'finished', elsewhere: 'ongoing' };
for (const state of ['unstarted', 'ongoing', 'failed']) {
    const changed = set_map_condition_value(all, initial, 'unlock', state, dependencies);
    assert.equal(changed.rename, 'unstarted');
    assert.equal(changed.elsewhere, 'ongoing');
    if (state === 'ongoing') assert.equal(changed.before, 'finished');
}
const completed = set_map_condition_value(all, initial, 'rename', 'finished', dependencies);
assert.equal(completed.before, 'finished'); assert.equal(completed.unlock, 'finished');
const states = resolve_map_mask_previews(groups, {}, completed, dependencies, scene.states).states;
assert.equal(map_layer_label(scene.layers[0], states), 'Warm cave');
console.log('Map condition scopes merge selected masks with all sibling floors, deduplicate exact predicates and retain task dependencies');
