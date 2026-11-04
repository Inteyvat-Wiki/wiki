import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, { fsCache: false });
const { create_map_task_order, resolve_map_task_conditions, sort_map_task_conditions, set_map_condition_value } = await jiti.import('../app/utils/map_task_dependencies.ts');
const { resolve_map_mask_previews } = await jiti.import('../app/utils/map_mask_conditions.ts');
const graph = { schema: 1, sameTaskOrder: 'ascending', edges: [
    { from: { task: 'a', step: 10 }, to: { task: 'bridge', step: 1 } },
    { from: { task: 'bridge', step: 5 }, to: { task: 'b', step: 1 } },
] };
const condition = (id, task, step) => ({ id, task, step, type: 'step', state: 'finished', title: '', subtitle: '' });
const inputs = [condition('a2', 'a', 2), condition('a6', 'a', 6), condition('b3', 'b', 3), condition('unrelated', 'c', 1)];
const order = create_map_task_order(graph);
assert(order.precedes({task:'a',step:2},{task:'b',step:3}));
assert(!order.precedes({task:'b',step:3},{task:'a',step:2}));
assert(!order.precedes({task:'a',step:2},{task:'c',step:3}));
assert(order.precedes({task:'c',step:2},{task:'c',step:3}));
assert(!order.precedes({task:'c',step:3},{task:'c',step:3}));
// Fire-root controls used to follow image discovery order instead of step order.
const fireRoots = [12, 14, 21, 22, 20, 16].map(step => condition(`root-${step}`, 'ripe_for_trouble', step));
assert.deepEqual(sort_map_task_conditions(fireRoots).map(input => input.step), [12, 14, 16, 20, 21, 22]);
assert.deepEqual(fireRoots.map(input => input.step), [12, 14, 21, 22, 20, 16]);
// Hidden bridge nodes and same-task edges must order cross-task controls too.
// Keep all predicates for one selector (including its failure branch).
const failure = { ...inputs[0], state: 'failed' };
const numeric = { id: 'count', type: 'number', title: '', subtitle: '', comparison: 'greater_equal', value: 1 };
const unordered = [inputs[2], inputs[3], inputs[1], numeric, inputs[0], failure];
const sorted = sort_map_task_conditions(unordered, graph);
assert.deepEqual(sorted.map(input => input.id), ['unrelated', 'count', 'a2', 'a2', 'a6', 'b3']);
assert.equal(sorted[3], failure);
assert.deepEqual(sort_map_task_conditions(sorted, graph), sorted);
assert.deepEqual(sort_map_task_conditions([numeric, inputs[3]], graph), [numeric, inputs[3]]);
assert.deepEqual(sort_map_task_conditions([], graph), []);
// Explicit map edits follow the four requested transitions across invisible bridge
// nodes, other mask groups and aliases. Their propagated edits must not cascade.
const linked = [...inputs, condition('a6-alias', 'a', 6), condition('b1', 'b', 1),
    condition('b1-name', 'b', 1), condition('b4', 'b', 4), numeric,
    { id: 'flag', type: 'boolean', title: '', subtitle: '', value: true }];
const before = { a2: 'failed', a6: 'ongoing', 'a6-alias': 'ongoing', b1: 'finished',
    'b1-name': 'finished', b3: 'finished', b4: 'failed', unrelated: 'ongoing', count: 7, flag: true };
for (const state of ['unstarted', 'ongoing', 'failed', 'finished']) {
    const changed = set_map_condition_value(linked, before, 'b1', state, graph);
    assert.equal(changed.b1, state); assert.equal(changed['b1-name'], state);
    for (const id of ['a2', 'a6', 'a6-alias']) assert.equal(changed[id],
        state === 'ongoing' || state === 'finished' ? 'finished' : before[id]);
    for (const id of ['b3', 'b4']) assert.equal(changed[id], state === 'finished' ? before[id] : 'unstarted');
    assert.equal(changed.unrelated, before.unrelated);
    assert.equal(changed.count, before.count); assert.equal(changed.flag, before.flag);
}
assert.deepEqual(before, { a2: 'failed', a6: 'ongoing', 'a6-alias': 'ongoing', b1: 'finished',
    'b1-name': 'finished', b3: 'finished', b4: 'failed', unrelated: 'ongoing', count: 7, flag: true });
// An alias edit updates every control for the same step and crosses task boundaries.
assert.deepEqual(set_map_condition_value(linked, before, 'a6-alias', 'unstarted', graph), {
    ...before, a6: 'unstarted', 'a6-alias': 'unstarted', b1: 'unstarted', 'b1-name': 'unstarted', b3: 'unstarted', b4: 'unstarted',
});
assert.deepEqual(set_map_condition_value(linked, before, 'count', 2, graph), { ...before, count: 2 });
assert.deepEqual(set_map_condition_value(linked, before, 'flag', false, graph), { ...before, flag: false });
assert.deepEqual(set_map_condition_value([condition('local', null, 1)], before, 'local', 'ongoing', graph), { ...before, local: 'ongoing' });
// Sibling branches sharing an ancestor are unaffected by completing that ancestor
// as part of an edit on the other branch.
const forkGraph = { schema: 1, sameTaskOrder: 'ascending', edges: [
    { from: { task: 'a', step: 6 }, to: { task: 'b', step: 1 } },
    { from: { task: 'a', step: 6 }, to: { task: 'c', step: 1 } },
] };
const forked = set_map_condition_value(linked, before, 'b1', 'ongoing', forkGraph);
assert.equal(forked.a6, 'finished'); assert.equal(forked.unrelated, 'ongoing');
const rootValues = Object.fromEntries(fireRoots.map(input => [input.id, 'finished']));
assert.deepEqual(set_map_condition_value(fireRoots, rootValues, 'root-16', 'ongoing'), {
    'root-12': 'finished', 'root-14': 'finished', 'root-16': 'ongoing',
    'root-20': 'unstarted', 'root-21': 'unstarted', 'root-22': 'unstarted',
});
console.log('Map-only control edits propagate predecessors/successors, preserve sibling branches and synchronize aliases');
const values = { b3: 'ongoing' };
const result = resolve_map_task_conditions(graph, inputs, values);
assert.equal(result.values.a2, 'finished'); assert.equal(result.values.a6, 'finished');
assert.equal(result.values.b3, 'ongoing'); assert.equal(result.values.unrelated, undefined);
assert.deepEqual(values, { b3: 'ongoing' });
assert.equal(resolve_map_task_conditions(graph, inputs, {}).values.a2, undefined);
const conflict = resolve_map_task_conditions(graph, inputs, { a2: 'unstarted', b3: 'finished' });
assert(conflict.conflicts.has('a2') && conflict.conflicts.has('b3'));
assert.equal(conflict.values.a6, undefined);
assert.equal(conflict.values.b3, undefined);
const failed = resolve_map_task_conditions(graph, inputs, { b3: 'failed' });
assert.equal(failed.values.a2, 'finished'); assert.equal(failed.values.b3, 'failed');
// A finish prerequisite may still be pending while its target step is ongoing or failed.
const waiting = [...inputs, condition('b1', 'b', 1)];
assert.equal(resolve_map_task_conditions(graph, waiting, { b1: 'ongoing' }).values.a2, undefined);
assert.equal(resolve_map_task_conditions(graph, waiting, { b1: 'failed' }).values.a2, undefined);
assert.equal(resolve_map_task_conditions(graph, waiting, { b1: 'finished' }).values.a2, 'finished');
const alias = resolve_map_task_conditions(graph, [...inputs,condition('a2-alias','a',2)], { a2: 'finished' });
assert.equal(alias.values['a2-alias'], 'finished');
const groups = [{ id:'mask', previewKey:'preview', rules:[{kind:'selector',when:[inputs[0]],previewOption:'index-0'}, {kind:'event',when:[inputs[2]]}] }];
assert.equal(resolve_map_mask_previews(groups,{},values,graph).states.preview,'index-0');
assert.equal(resolve_map_mask_previews(groups,{}, {},graph).states.preview,'hidden');
assert.equal(resolve_map_mask_previews(groups,{}, { a2:'unstarted',b3:'finished' },graph).states.preview,'hidden');
console.log('Map dependency ordering, transitive inference, aliases, conflicts and preview integration passed');
