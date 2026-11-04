import { isMapTaskDependencies, type MapTaskDependencies, type MapTaskStep } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskCondition, TaskState, TaskStepCondition } from '@inteyvat-wiki/wiki-contracts/task';
import type { TaskConditionValues } from './task_condition';

const key = (step: MapTaskStep) => `${step.task}:${step.step}`;

/** Partial order: unrelated branches stay unordered, even when IDs happen to be similar. */
export function create_map_task_order(data: MapTaskDependencies, steps: MapTaskStep[] = []) {
    if (!isMapTaskDependencies(data)) throw new Error('Invalid map task dependencies');
    const nodes = new Map<string, MapTaskStep>(), previous = new Map<string, Set<string>>();
    for (const step of [...data.edges.flatMap(edge => [edge.from, edge.to]), ...steps]) nodes.set(key(step), step);
    const add = (from: MapTaskStep, to: MapTaskStep) => {
        const predecessors = previous.get(key(to)) || new Set<string>(); predecessors.add(key(from)); previous.set(key(to), predecessors);
    };
    for (const edge of data.edges) add(edge.from, edge.to);
    const tasks = new Map<string, MapTaskStep[]>();
    for (const node of nodes.values()) { const list = tasks.get(node.task) || []; list.push(node); tasks.set(node.task, list); }
    for (const list of tasks.values()) {
        list.sort((a, b) => a.step - b.step);
        for (let i = 1; i < list.length; i++) add(list[i - 1]!, list[i]!);
    }
    const cache = new Map<string, Set<string>>();
    function ancestors(step: MapTaskStep): Set<string> {
        const id = key(step), cached = cache.get(id); if (cached) return cached;
        const result = new Set<string>(), pending = [...previous.get(id) || []];
        while (pending.length) {
            const next = pending.pop()!; if (result.has(next)) continue;
            result.add(next); pending.push(...previous.get(next) || []);
        }
        cache.set(id, result); return result;
    }
    return { ancestors, precedes: (from: MapTaskStep, to: MapTaskStep): boolean => {
        if (from.task === to.task) return from.step < to.step;
        if (!nodes.has(key(from)) || !nodes.has(key(to)))
            return create_map_task_order(data, [...nodes.values(), from, to]).precedes(from, to);
        return ancestors(to).has(key(from));
    } };
}

/** List prerequisite controls first, retaining every predicate of a shared control. */
export function sort_map_task_conditions(conditions: TaskCondition[], data?: MapTaskDependencies): TaskCondition[] {
    const groups = new Map<string, TaskCondition[]>();
    for (const condition of conditions) {
        const group = groups.get(condition.id) || [];
        group.push(condition); groups.set(condition.id, group);
    }
    const entries = [...groups.values()].map(conditions => ({ conditions,
        step: conditions.find((condition): condition is TaskStepCondition & { task: string } =>
            condition.type === 'step' && condition.task !== null),
    }));
    const order = create_map_task_order(data || { schema: 1, sameTaskOrder: 'ascending', edges: [] },
        entries.flatMap(entry => entry.step ? [entry.step] : []));
    const pending = new Set(entries.map((_, index) => index));
    const predecessors = entries.map(entry => new Set(entries.flatMap((other, index) =>
        entry.step && other.step && order.precedes(other.step, entry.step) ? [index] : [])));
    const result: TaskCondition[] = [];
    while (pending.size) {
        // A comparator cannot sort a partial order reliably. Pick the first ready
        // control instead; unseen intermediate steps still contribute dependencies.
        const next = [...pending].find(index => [...predecessors[index]!].every(before => !pending.has(before)));
        if (next === undefined) throw new Error('Cyclic map condition dependencies');
        result.push(...entries[next]!.conditions); pending.delete(next);
    }
    return result;
}

/** Apply an explicit map-control edit once; propagated values do not trigger further edits. */
export function set_map_condition_value(conditions: TaskCondition[], input: TaskConditionValues,
    id: string, value: TaskConditionValues[string], data?: MapTaskDependencies): TaskConditionValues {
    const values = { ...input };
    if (value === undefined) delete values[id];
    else values[id] = value;
    if (typeof value !== 'string' || !['unstarted', 'ongoing', 'finished', 'failed'].includes(value)) return values;
    const steps = conditions.filter((condition): condition is TaskStepCondition & { task: string } =>
        condition.type === 'step' && condition.task !== null);
    const selected = steps.find(condition => condition.id === id);
    if (!selected) return values;
    const order = create_map_task_order(data || { schema: 1, sameTaskOrder: 'ascending', edges: [] }, steps);
    for (const step of steps) {
        if (key(step) === key(selected)) values[step.id] = value;
        else if ((value === 'ongoing' || value === 'finished') && order.precedes(step, selected)) values[step.id] = 'finished';
        else if (value !== 'finished' && order.precedes(selected, step)) values[step.id] = 'unstarted';
    }
    return values;
}

/** Apply the maintained dependency convention without persisting inferred choices. */
export function resolve_map_task_conditions(data: MapTaskDependencies, conditions: TaskCondition[], input: TaskConditionValues) {
    const steps = conditions.filter((condition): condition is TaskStepCondition & { task: string } => condition.type === 'step' && condition.task !== null);
    const identities = steps.map(condition => ({ task: condition.task!, step: condition.step }));
    const order = create_map_task_order(data, identities), aliases = new Map<string, string[]>();
    for (const condition of steps) {
        const id = key({ task: condition.task!, step: condition.step });
        const list = aliases.get(id) || []; if (!list.includes(condition.id)) list.push(condition.id); aliases.set(id, list);
    }
    const explicit = new Map<string, Set<TaskState>>();
    for (const [identity, ids] of aliases) {
        const selected = new Set(ids.map(id => input[id]).filter((v): v is TaskState =>
            typeof v === 'string' && ['unstarted', 'ongoing', 'finished', 'failed'].includes(v)));
        if (selected.size) explicit.set(identity, selected);
    }
    function completed_predecessors(condition: TaskStepCondition & { task: string }, state: TaskState) {
        const before = order.ancestors(condition);
        if (state === 'finished') return before;
        if (state === 'unstarted') return new Set<string>();
        // Ongoing/failed steps imply earlier steps in the same task by the configured convention.
        // A cross-task finish condition on the current step may still be waiting.
        const completed = new Set<string>();
        for (const id of before) if (id.startsWith(`${condition.task}:`)) {
            completed.add(id);
            const earlier = { task: condition.task, step: Number(id.slice(condition.task.length + 1)) };
            for (const ancestor of order.ancestors(earlier)) completed.add(ancestor);
        }
        return completed;
    }
    const implied = new Set<string>(), bad = new Set<string>();
    for (const [identity, states] of explicit) {
        if (states.size !== 1) { bad.add(identity); continue; }
        if (states.has('unstarted')) continue;
        const condition = steps.find(c => key({ task: c.task!, step: c.step }) === identity)!;
        for (const before of completed_predecessors(condition, [...states][0]!)) {
            const selected = explicit.get(before);
            if (selected && (selected.size !== 1 || !selected.has('finished'))) { bad.add(before); bad.add(identity); }
        }
    }
    // A contradictory selected successor must not manufacture completed ancestors.
    for (const condition of steps) {
        const identity = key({ task: condition.task!, step: condition.step });
        const states = explicit.get(identity);
        if (!states || states.size !== 1 || states.has('unstarted') || bad.has(identity)) continue;
        for (const before of completed_predecessors(condition, [...states][0]!)) implied.add(before);
    }
    const values = { ...input }, conflicts = new Set<string>(), inferred = new Set<string>();
    for (const [identity, ids] of aliases) for (const id of ids) {
        if (bad.has(identity)) { delete values[id]; conflicts.add(id); }
        else if (explicit.get(identity)?.size === 1) values[id] = [...explicit.get(identity)!][0];
        else if (implied.has(identity)) { values[id] = 'finished'; inferred.add(id); }
    }
    return { values, conflicts, inferred, order };
}
