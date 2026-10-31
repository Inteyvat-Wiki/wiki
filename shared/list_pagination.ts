// Capacity depends on columns and presentation, never on image loading or viewport height.
const rows: Record<string, number> = { gallery: 5, portrait: 5, landscape: 4, media: 6, compact: 8, index: 10, text: 10 };

export function list_grid_columns(tracks: number, placements: readonly { start: string; end: string }[]): number {
    // A `grid-column: span N` shorthand may put the span on either longhand.
    const spans = placements.map(({ start, end }) => Number(/span\s+(\d+)/.exec(`${start} ${end}`)?.[1]) || 1);
    return Math.max(1, Math.floor(tracks / Math.max(1, ...spans)));
}

export function list_page_size(columns: number, layout: string): number {
    const count = Number.isFinite(columns) ? Math.max(1, Math.min(12, Math.floor(columns))) : 1;
    return count * (rows[layout] || 8);
}

export function list_page_anchor(page: unknown, size: unknown, total: number): number {
    const integer = (value: unknown, fallback: number, max: number) => {
        if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
        const number = Number(value);
        return Number.isSafeInteger(number) && number > 0 && number <= max ? number : fallback;
    };
    const capacity = integer(size, 48, 120);
    const last = Math.max(1, Math.ceil(total / capacity));
    return (Math.min(integer(page, 1, Number.MAX_SAFE_INTEGER), last) - 1) * capacity;
}

export function list_anchor_page(anchor: number, size: number): number {
    return Math.floor(anchor / size) + 1;
}
