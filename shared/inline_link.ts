export const INLINE_LINK_CATEGORIES = {
    character: { folder: 'character', index: 'characters', path: '/character' },
    weapon: { folder: 'weapon', index: 'weapons', path: '/weapon' },
    artifact: { folder: 'artifact', index: 'artifacts', path: '/artifact' },
    material: { folder: 'material', index: 'materials', path: '/material' },
    book: { folder: 'book', index: 'books', path: '/book' },
    readable: { folder: 'readable', index: 'readables', path: '/readable' },
    'living-being': { folder: 'living_being', index: 'living_beings', path: '/living-being' },
    geography: { folder: 'geography', index: 'geographies', path: '/geography' },
    'chapter-group': { folder: 'chapter_group', index: 'chapter_groups', path: '/travel-log/chapter' },
    task: { folder: 'task', index: 'tasks', path: '/travel-log/task' },
    'quest-item': { folder: 'quest_item', index: 'quest_items', path: '/travel-log/quest-item' },
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

export function parse_inline_links(text: string): (string | InlineLinkToken)[] {
    const parts: (string | InlineLinkToken)[] = [];
    let offset = 0;
    for (const match of text.matchAll(/\\?\[\[iw:[^\]\r\n]*\]\]/g)) {
        if (match.index > offset) parts.push(text.slice(offset, match.index));
        const raw = match[0];
        const fields = /^\[\[iw:([a-z-]+)\/([a-zA-Z0-9_-]+)(?:\?style=(text|icon))?\]\]$/.exec(raw);
        if (raw.startsWith('\\')) parts.push(raw.slice(1));
        else if (fields && fields[1] && fields[2] && is_inline_link_category(fields[1])) {
            parts.push({ category: fields[1], id: fields[2], style: fields[3] === 'icon' ? 'icon' : 'text' });
        } else parts.push(raw);
        offset = match.index + raw.length;
    }
    if (offset < text.length) parts.push(text.slice(offset));
    return parts;
}
