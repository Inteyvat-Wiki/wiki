import type { MapMaskConditions, MapPredicate, MapScene, MapStateChoice } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskCondition } from '@inteyvat-wiki/wiki-contracts/task';

/** Remove identical predicates, retaining different states/ranges of one control. */
export function unique_map_conditions(conditions: TaskCondition[]): TaskCondition[] {
    const seen = new Set<string>();
    return conditions.filter(condition => {
        const key = JSON.stringify(Object.entries(condition).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
}

/** Select through exported group/layer identities, including currently hidden
 * images and sibling floors. No name, raw ID or image-path inference belongs here.
 */
export function map_condition_scope(scene: MapScene | undefined, maskId: string, layerId: string): {
    groups: MapMaskConditions[]; conditions: TaskCondition[]; choices: MapStateChoice[];
} {
    if (!scene) return { groups: [], conditions: [], choices: [] };
    const selectedMask = scene.maskGroups?.find(group => group.id === maskId);
    const selectedFloor = scene.layers.find(floor => floor.id === layerId);
    const floors = selectedFloor ? scene.layers.filter(floor => floor.groupId === selectedFloor.groupId) : [];
    const floorIds = new Set(floors.map(floor => floor.id));
    const overlayIds = new Set(selectedMask?.overlayIds || []);
    const groupIds = new Set(selectedMask?.conditionIds || []), keys = new Set<string>();
    const predicate = (value?: MapPredicate) => {
        if (value?.op === 'selected') keys.add(value.key);
        else if (value?.op === 'all' || value?.op === 'any') value.args.forEach(predicate);
    };
    for (const floor of floors) {
        predicate(floor.condition);
        for (const variant of floor.labelVariants || []) predicate(variant.condition);
    }
    for (const overlay of scene.overlays) {
        if (overlay.layerId && floorIds.has(overlay.layerId)) overlayIds.add(overlay.id);
        if (overlayIds.has(overlay.id)) predicate(overlay.condition);
    }
    for (const marker of scene.markers) if (marker.layerId && floorIds.has(marker.layerId)) {
        predicate(marker.condition);
        for (const variant of marker.labelVariants || []) predicate(variant.condition);
    }
    for (const region of scene.regions) if (region.layerId && floorIds.has(region.layerId)) predicate(region.condition);
    const groups = (scene.maskConditions || []).filter(group => groupIds.has(group.id)
        || group.overlayIds.some(id => overlayIds.has(id)) || keys.has(group.previewKey));
    const choices = scene.states.filter(choice => keys.has(choice.id));
    const conditions = unique_map_conditions([
        ...groups.flatMap(group => group.rules.flatMap(rule => rule.when.filter(token => typeof token !== 'string'))),
        ...choices.flatMap(choice => choice.taskCondition ? [choice.taskCondition] : []),
    ]);
    const previewKeys = new Set((scene.maskConditions || []).map(group => group.previewKey));
    // An exported choice without a task binding stays an explicit choice. Do not
    // manufacture a quest identity or dependency by parsing its label/key.
    return { groups, conditions, choices: choices.filter(choice => !choice.taskCondition && !previewKeys.has(choice.id)) };
}
