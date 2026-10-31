export type ArchiveCardTag = { id: string; name: string; order?: number; hidden?: boolean };
export const ARCHIVE_TAG_GROUPS = ['element', 'weapon', 'affiliation', 'attribute', 'other'] as const;
export type ArchiveTagGroup = typeof ARCHIVE_TAG_GROUPS[number];

// Presentation groups, not an inferred mapping of GCGCardFilter's numeric enums.
const attributes = new Set(['talent', 'weapon', 'artifact', 'vehicle',
    'place', 'ally', 'item', 'resonance', 'card_blessing',
    'food', 'legend']);
export function archive_tag_group(id: string): ArchiveTagGroup {
    if (id.startsWith('element_')) return 'element';
    if (id.startsWith('weapon_')) return 'weapon';
    if (/^(?:nation|camp)_/.test(id)) return 'affiliation';
    return attributes.has(id) ? 'attribute' : 'other';
}

export function archive_sorted_tags<T extends ArchiveCardTag>(tags: T[]): T[] {
    return tags.filter(tag => !tag.hidden).sort((a, b) =>
        ARCHIVE_TAG_GROUPS.indexOf(archive_tag_group(a.id)) - ARCHIVE_TAG_GROUPS.indexOf(archive_tag_group(b.id))
        || (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
        || a.id.localeCompare(b.id, 'en'));
}
