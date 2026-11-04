import { parse_map_location, type MapLinkLocation } from '@inteyvat-wiki/wiki-contracts/inline_link';
import type { MapCoordinate, MapSceneIndex } from '@inteyvat-wiki/wiki-contracts/map';

/** An unknown scene never lends its coordinates to whichever scene is currently open. */
export function resolve_map_location(query: Record<string, unknown>, scenes: MapSceneIndex['scenes']): { location: MapLinkLocation | null; invalid: boolean } {
    if (!['scene', 'x', 'z'].some(key => query[key] !== undefined)) return { location: null, invalid: false };
    const location = parse_map_location(query);
    if (!location || !scenes.some(scene => scene.id === location.scene)) return { location: null, invalid: true };
    return { location, invalid: false };
}
export function map_location_position(location: MapLinkLocation): MapCoordinate {
    return { x: location.x, y: location.z };
}
