export const INLINE_LINK_CATEGORIES = {
    character: { folder: 'character', path: '/character' },
    weapon: { folder: 'weapon', path: '/weapon' },
    artifact: { folder: 'artifact', path: '/artifact' },
    material: { folder: 'material', path: '/material' },
    book: { folder: 'book', path: '/book' },
    readable: { folder: 'readable', path: '/readable' },
    'living-being': { folder: 'living_being', path: '/living-being' },
    geography: { folder: 'geography', path: '/geography' },
    'chapter-group': { folder: 'chapter_group', path: '/travel-log/chapter' },
    task: { folder: 'task', path: '/travel-log/task' },
    npc: { folder: 'npc', path: '/travel-log/npc' },
    'quest-item': { folder: 'quest_item', path: '/travel-log/quest-item' },
    serenitea: { folder: 'serenitea', path: '/serenitea' },
    tcg: { folder: 'tcg', path: '/tcg' },
    miliastra: { folder: 'miliastra', path: '/miliastra' },
    misc: { folder: 'misc', path: '/misc' },
} as const;

export type InlineLinkCategory = keyof typeof INLINE_LINK_CATEGORIES;
export type InlineLinkToken = {
    category: InlineLinkCategory,
    id: string,
    style: 'text' | 'icon',
};
export type InlineLinkInfo = { name: string, icon?: string };

export function is_inline_link_category(value: string): value is InlineLinkCategory {
    return Object.hasOwn(INLINE_LINK_CATEGORIES, value);
}

export function inline_link_category(value: string): InlineLinkCategory | null {
    const aliases: Record<string, string> = { quest_item: 'quest-item', living_being: 'living-being', chapter_group: 'chapter-group' };
    const category = Object.hasOwn(aliases, value) ? aliases[value]! : value;
    return is_inline_link_category(category) ? category : null;
}

export function is_inline_link_id(value: string): boolean {
    return /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(value);
}

export function inline_link_text(category: string, id: string, style: 'text' | 'icon' = 'text'): string | null {
    const key = inline_link_category(category);
    return key && is_inline_link_id(id) ? `[[iw:${key}/${id}?style=${style}]]` : null;
}

export function parse_inline_links(text: string): (string | InlineLinkToken)[] {
    const parts: (string | InlineLinkToken)[] = [];
    let offset = 0;
    for (const match of text.matchAll(/\\?\[\[iw:[^\]\r\n]*\]\]/g)) {
        if (match.index > offset) parts.push(text.slice(offset, match.index));
        const raw = match[0];
        const fields = /^\[\[iw:([a-z-]+)\/([a-zA-Z0-9_.-]+)(?:\?style=(text|icon))?\]\]$/.exec(raw);
        if (raw.startsWith('\\')) parts.push(raw.slice(1));
        else if (fields && fields[1] && fields[2] && is_inline_link_category(fields[1]) && is_inline_link_id(fields[2])) {
            parts.push({ category: fields[1], id: fields[2], style: fields[3] === 'icon' ? 'icon' : 'text' });
        } else parts.push(raw);
        offset = match.index + raw.length;
    }
    if (offset < text.length) parts.push(text.slice(offset));
    return parts;
}
