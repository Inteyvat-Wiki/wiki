import type { MapArea, MapAreaPolygon, MapCoordinate } from '@inteyvat-wiki/wiki-contracts/map';

function segment_distance_squared(point: MapCoordinate, a: MapCoordinate, b: MapCoordinate) {
    const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
    return (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2;
}
/** Filled footprint vs a circular neighbourhood, including boundary contact. */
export function map_footprint_intersects(polygon: MapAreaPolygon, point: MapCoordinate, radius: number): boolean {
    if (!Number.isFinite(radius) || radius < 0 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Invalid map height probe');
    const points = polygon.points;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j]!, b = points[i]!;
        if (segment_distance_squared(point, a, b) <= radius * radius + 1e-10) return true;
        if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
}
export interface MapHeightHit {
    id: string; area: MapArea; polygonIndex: number; polygon: MapAreaPolygon;
}
export function map_height_hits(areas: MapArea[], point: MapCoordinate, radius: number, levels: number[] = [1, 2]): MapHeightHit[] {
    return areas.filter(area => levels.includes(area.level)).flatMap(area => area.polygons.flatMap((polygon, polygonIndex) =>
        map_footprint_intersects(polygon, point, radius) ? [{ id:`${area.id}:${polygonIndex}`, area, polygonIndex, polygon }] : []));
}
/** Missing limits are unknown, not infinity or zero. Keep disjoint parts separate. */
export function map_height_axis(hits: MapHeightHit[]) {
    const limits = hits.flatMap(hit => [hit.polygon.minimumHeight, hit.polygon.maximumHeight]).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    if (!limits.length) return null;
    const low = Math.min(...limits), high = Math.max(...limits), pad = Math.max((high - low) * 0.06, 1);
    const minimum = low - pad, maximum = high + pad;
    return { minimum, maximum, ticks:Array.from({length:5}, (_, i) => maximum - (maximum - minimum) * i / 4) };
}
