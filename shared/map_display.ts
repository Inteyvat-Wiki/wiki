import { evaluateMapPredicate, type MapArea, type MapCoordinate, type MapOverlay, type MapPredicate, type MapScene, type MapStateChoice } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskState } from '@inteyvat-wiki/wiki-contracts/task';

export function valid_map_condition_values(groups: MapScene['maskConditions'], stored: unknown, choices: MapScene['states'] = []): Record<string, TaskState | number | boolean | undefined> {
    const result: Record<string, TaskState | number | boolean | undefined> = {};
    const saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
    for (const token of [...(groups || []).flatMap(group => group.rules.flatMap(rule => rule.when)), ...choices.flatMap(choice => choice.taskCondition ? [choice.taskCondition] : [])]) {
        if (typeof token === 'string') continue;
        const value = saved[token.id];
        // All task controls start finished, including groups whose drawer has not been opened.
        if (token.type === 'step') result[token.id] = 'finished';
        if (token.type === 'number' && typeof value === 'number' && Number.isFinite(value)
            || token.type === 'boolean' && typeof value === 'boolean'
            || token.type === 'step' && typeof value === 'string' && ['unstarted','ongoing','finished','failed'].includes(value)) result[token.id]=value as TaskState | number | boolean;
    }
    return result;
}

/** Frame every independent footprint. Height metadata does not affect this 2D view. */
export function map_area_bounds(area: MapArea): MapScene['bounds'] | undefined {
    const points = area.polygons.flatMap(polygon => polygon.points);
    if (!points.length) return undefined;
    return [{ x: Math.min(...points.map(point => point.x)), y: Math.min(...points.map(point => point.y)) },
        { x: Math.max(...points.map(point => point.x)), y: Math.max(...points.map(point => point.y)) }];
}

export function map_defaults(choices: MapStateChoice[]): Record<string, string> {
    return Object.fromEntries(choices.filter(choice => choice.default !== undefined).map(choice => [choice.id, choice.default!]));
}
export function valid_map_selections(choices: MapStateChoice[], stored: unknown): Record<string, string> {
    const result = map_defaults(choices);
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return result;
    for (const choice of choices) {
        const value = (stored as Record<string, unknown>)[choice.id];
        if (typeof value === 'string' && choice.options.some(option => option.id === value)) result[choice.id] = value;
        // An explicit null is the user's "unknown" choice, even for a preset.
        if (value === null) delete result[choice.id];
    }
    return result;
}
export function map_visible(condition: MapPredicate | undefined, values: Record<string, string>, include_unknown: boolean) {
    const status = condition ? evaluateMapPredicate(condition, values) : true;
    return status === true || (status === 'unknown' && include_unknown);
}
export function map_layer_label(layer: Pick<MapScene['layers'][number], 'label' | 'labelVariants'>, states: Record<string, string>): string {
    const matched = (layer.labelVariants || []).filter(variant => evaluateMapPredicate(variant.condition, states) === true);
    return matched.length === 1 ? matched[0]!.label : layer.label;
}
/** Converted group IDs define context; equal floor names never join unrelated groups. */
export function map_layer_context(layers: MapScene['layers'], selected: string, states: Record<string, string>, include_unknown: boolean) {
    const focus = layers.find(layer => layer.id === selected && map_visible(layer.condition, states, include_unknown));
    return focus ? layers.filter(layer => layer.groupId === focus.groupId && map_visible(layer.condition, states, include_unknown)) : [];
}
export function map_overlay_bounds(overlays: MapOverlay[]): MapScene['bounds'] | undefined {
    if (!overlays.length) return undefined;
    const points = overlays.flatMap(overlay => overlay.corners || overlay.bounds);
    return [{ x: Math.min(...points.map(point => point.x)), y: Math.min(...points.map(point => point.y)) },
        { x: Math.max(...points.map(point => point.x)), y: Math.max(...points.map(point => point.y)) }];
}
/** The old picker used the midpoint of each group's complete image bounds. */
export function map_group_centers(scene: Pick<MapScene, 'layers' | 'overlays'>) {
    const floorGroups = new Map(scene.layers.map(layer => [layer.id, layer.groupId]));
    const groups = new Map<string, MapOverlay[]>();
    for (const overlay of scene.overlays) {
        if (overlay.kind !== 'layer' || !overlay.layerId) continue;
        const id = floorGroups.get(overlay.layerId); if (!id) continue;
        const images = groups.get(id) || []; images.push(overlay); groups.set(id, images);
    }
    return [...groups].map(([id, images]) => {
        const bounds = map_overlay_bounds(images)!;
        return { id, position: { x: (bounds[0].x + bounds[1].x) / 2, y: (bounds[0].y + bounds[1].y) / 2 } };
    });
}
export function map_nearest_group(groups: ReturnType<typeof map_group_centers>, center: MapCoordinate | null) {
    if (!center) return null;
    let selected: string | null = null, distance = 1024;
    for (const group of groups) {
        const next = Math.hypot(center.x - group.position.x, center.y - group.position.y);
        if (next < distance) { selected = group.id; distance = next; }
    }
    return selected;
}
export function map_image_corners(overlay: MapOverlay): [MapCoordinate, MapCoordinate, MapCoordinate, MapCoordinate] {
    if (overlay.corners) return overlay.corners;
    const [a, b] = overlay.bounds;
    const low_x = Math.min(a.x, b.x), high_x = Math.max(a.x, b.x);
    const low_y = Math.min(a.y, b.y), high_y = Math.max(a.y, b.y);
    // Display convention: Leaflet latitude=x, longitude=-y.
    return [{ x: high_x, y: high_y }, { x: high_x, y: low_y }, { x: low_x, y: low_y }, { x: low_x, y: high_y }];
}
export function image_affine(corners: Array<{ x: number; y: number }>, size = 1000): string {
    const [origin, right, opposite, down] = corners;
    if (!origin || !right || !opposite || !down || corners.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error('Invalid image corners');
    const dx = right.x - origin.x, dy = right.y - origin.y, vx = down.x - origin.x, vy = down.y - origin.y;
    if (Math.abs(opposite.x - origin.x - dx - vx) > 0.02 || Math.abs(opposite.y - origin.y - dy - vy) > 0.02) throw new Error('Non-affine map image');
    return `matrix(${dx / size},${dy / size},${vx / size},${vy / size},${origin.x},${origin.y})`;
}
export function map_edge_mask(edge?: MapOverlay['edgeFade']): string {
    if (!edge) return 'none';
    const gradient = (axis: string, fraction: number) => fraction === 0 ? 'linear-gradient(#000,#000)'
        : `linear-gradient(${axis},transparent 0%,#000 ${fraction * 100}%,#000 ${(1 - fraction) * 100}%,transparent 100%)`;
    return `${gradient('to right', edge.horizontal)},${gradient('to bottom', edge.vertical)}`;
}
