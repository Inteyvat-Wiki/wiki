<template>
    <TaskConditions :model-value="model" @update:model-value="update_conditions" :conditions="inputs" :initialize="false" :availability="availability" :display-values="display_values" />
</template>

<script setup lang="ts">
import type { MapMaskConditions, MapTaskDependencies, MapStateChoice } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskConditionValues } from '~/utils/task_condition';
import type { TaskCondition } from '@inteyvat-wiki/wiki-contracts/task';
import { unique_map_conditions } from '~/utils/map_condition_scope';
import { resolve_map_mask_previews } from '~/utils/map_mask_conditions';
import { resolve_map_task_conditions, set_map_condition_value, sort_map_task_conditions } from '~/utils/map_task_dependencies';
const props = defineProps<{ groups: MapMaskConditions[]; conditions: TaskCondition[]; allGroups?: MapMaskConditions[]; dependencies?: MapTaskDependencies; states?: MapStateChoice[] }>();
const model = defineModel<TaskConditionValues>({ required: true });
// The shared task component groups repeated condition IDs into a single selector.
const inputs = computed(() => sort_map_task_conditions(unique_map_conditions(props.conditions), props.dependencies));
const all_groups = computed(() => props.allGroups || props.groups);
const all_inputs = computed(() => unique_map_conditions([
    ...all_groups.value.flatMap(group => group.rules.flatMap(rule => rule.when.filter(token => typeof token !== 'string'))),
    ...(props.states || []).flatMap(choice => choice.taskCondition ? [choice.taskCondition] : []),
]));
const resolved = computed(() => props.dependencies ? resolve_map_task_conditions(props.dependencies, all_inputs.value, model.value) : undefined);
function update_conditions(next: TaskConditionValues) {
    let values = model.value;
    // Update the whole scene, including unopened mask groups and floor-name controls.
    // This map-only handler leaves the shared task-page control unchanged.
    for (const id of new Set([...Object.keys(model.value), ...Object.keys(next)])) {
        if (next[id] !== model.value[id]) values = set_map_condition_value(all_inputs.value, values, id, next[id], props.dependencies);
    }
    model.value = values;
}
// Keep explicit conflicting choices visible so users can adjust them; inferred values are not saved.
const display_values = computed(() => ({ ...resolved.value?.values, ...model.value }));
const availability = computed(() => {
    const supported = new Set(props.groups.flatMap(group => group.rules.filter(rule => rule.previewOption !== undefined || rule.write !== undefined)
        .flatMap(rule => rule.when.filter(token => typeof token !== 'string').map(token => token.id))));
    for (const choice of props.states || []) if (choice.taskCondition) supported.add(choice.taskCondition.id);
    const { conflicts } = resolve_map_mask_previews(all_groups.value, {}, model.value, props.dependencies, props.states);
    const result: Record<string, { disabled?: boolean; title: string }> = {};
    for (const input of inputs.value) {
        if (resolved.value?.conflicts.has(input.id)) result[input.id] = { title: $t('map.mask_groups.task_conflict') };
        else if (conflicts.has(input.id)) result[input.id] = { title: $t('map.mask_groups.conflict') };
        else if (resolved.value?.inferred.has(input.id)) result[input.id] = { title: $t('map.mask_groups.inferred') };
        else if (!supported.has(input.id)) result[input.id] = input.type === 'step' && input.task && props.dependencies
            ? { title: $t('map.mask_groups.order_only') }
            : { disabled: true, title: $t('map.mask_groups.unavailable') };
    }
    return result;
});
</script>
