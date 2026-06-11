export function process_coordinate(coordinate: { x: number, y: number }): [number, number] {
    return [coordinate.x, -coordinate.y];
}

export function process_coordinates(coordinate: { x: number, y: number }[]): [number, number][] {
    return coordinate.map(coordinate => process_coordinate(coordinate));
}

export function deprocess_coordinate(coordinate: [number, number]): { x: number, y: number } {
    return { x: coordinate[0], y: -coordinate[1] };
}

export function deprocess_coordinates(coordinate: [number, number][]): { x: number, y: number }[] {
    return coordinate.map(coordinate => deprocess_coordinate(coordinate));
}

export function calc_distance(coord1: { x: number, y: number } | undefined, coord2: { x: number, y: number } | undefined): number {
    if (!coord1 || !coord2) return Infinity;
    const dx = coord1.x - coord2.x;
    const dy = coord1.y - coord2.y;
    return Math.sqrt(dx * dx + dy * dy);
}


export async function get_default_map_conditions(): Promise<Record<string, string>> {
    const map_conditions = await get_map_conditions();
    let res: Record<string, string> = {};
    for (const group_name in map_conditions) {
        for (const condition_name in map_conditions[group_name]) {
            if (map_conditions[group_name][condition_name]?.default) res[group_name] = condition_name;
        }
    }
    return res;
}