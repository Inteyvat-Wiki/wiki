import type { MapMaskRule, MapScene, MapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskStepCondition } from '@inteyvat-wiki/wiki-contracts/task';
import { evaluate_external_task_conditions, type TaskConditionValues } from './task_condition';
import { create_map_task_order, resolve_map_task_conditions } from './map_task_dependencies';

/** Replay converted writes; descriptions, raw IDs and image indices are never interpreted. */
export function resolve_map_mask_previews(groups: MapScene['maskConditions'], selections: Record<string, string>, values: TaskConditionValues, dependencies?: MapTaskDependencies, choices: MapScene['states'] = []) {
    const states = { ...selections }, conflicts = new Set<string>(), unresolved = new Set<string>();
    const conditions = groups?.flatMap(group => group.rules.flatMap(rule => rule.when.filter(token => typeof token !== 'string'))) || [];
    conditions.push(...choices.flatMap(choice => choice.taskCondition ? [choice.taskCondition] : []));
    const steps = conditions.filter((token): token is TaskStepCondition & { task: string } => token.type === 'step' && token.task !== null);
    const order = create_map_task_order(dependencies || {schema:1,sameTaskOrder:'ascending',edges:[]}, steps);
    if (dependencies) {
        const resolved = resolve_map_task_conditions(dependencies, conditions, values);
        values = resolved.values;
        for (const id of resolved.conflicts) conflicts.add(id);
    }
    for (const choice of choices) if (choice.taskCondition) {
        const result = evaluate_external_task_conditions([choice.taskCondition], values);
        if (result === undefined) delete states[choice.id];
        else states[choice.id] = result ? 'fulfilled' : 'unfulfilled';
    }
    for (const group of groups || []) {
        if (group.replay) {
            const writes = group.rules.filter((rule): rule is MapMaskRule & { write: NonNullable<MapMaskRule['write']> } => !!rule.write)
                .map(rule => ({ rule, step: rule.when[0] as TaskStepCondition & {task:string},
                    active: evaluate_external_task_conditions(rule.when, values) })).filter(write => write.active !== false);
            // Only a definite later write can erase an earlier or unknown write.
            // Equal-valued unordered final writes commute; different values remain a conflict.
            const last = writes.filter(a => !writes.some(b => b.active === true && (a.step.task === b.step.task && a.step.step === b.step.step
                ? a.rule.write.order < b.rule.write.order : order.precedes(a.step, b.step))));
            const outcomes = new Set(last.map(write => write.rule.write.visible));
            if (last.some(write => write.active === undefined) || outcomes.size > 1) {
                states[group.previewKey] = 'hidden'; unresolved.add(group.id);
                if (outcomes.size > 1) for (const write of last) conflicts.add(write.step.id);
            } else {
                const visible = last.length ? last[0]!.rule.write.visible : group.replay.initialVisible;
                // Do not draw an unconfirmed future image on top of a known active one.
                // Hidden is a preview policy here; unresolved retains the unknown source state.
                if (visible === null) { states[group.previewKey] = 'hidden'; unresolved.add(group.id); }
                else states[group.previewKey] = visible ? group.replay.visibleOption : 'hidden';
            }
            continue;
        }
        const matching = group.rules.filter(rule => rule.previewOption !== undefined
            && evaluate_external_task_conditions(rule.when, values) === true);
        const options = new Set(matching.map(rule => rule.previewOption!));
        // Unknown, false or contradictory choices never inherit a stale preview selection.
        states[group.previewKey] = options.size === 1 ? [...options][0]! : 'hidden';
        if (options.size > 1) for (const rule of matching) for (const token of rule.when) {
            if (typeof token !== 'string') conflicts.add(token.id);
        }
    }
    return { states, conflicts, unresolved };
}
