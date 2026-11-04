import type { ContentCategory } from '@inteyvat-wiki/wiki-contracts/registry';

// Storage categories are not URL segments (e.g. quest_item / quest-item).
// Explicit list paths also avoid guessing English plurals or archive nesting.
export const CONTENT_ROUTES = {
    character: { item: '/api/character', pages: '/api/characters' },
    weapon: { item: '/api/weapon', pages: '/api/weapons' },
    artifact: { item: '/api/artifact', pages: '/api/artifacts' },
    material: { item: '/api/material', pages: '/api/materials' },
    book: { item: '/api/book', pages: '/api/books' },
    readable: { item: '/api/readable', pages: '/api/readables' },
    living_being: { item: '/api/living-being', pages: '/api/living-beings' },
    geography: { item: '/api/geography', pages: '/api/geographies' },
    chapter_group: { item: '/api/chapter-group', pages: '/api/chapter-groups' },
    task: { item: '/api/task', pages: '/api/tasks' },
    npc: { item: '/api/npc', pages: '/api/npcs' },
    quest_item: { item: '/api/quest-item', pages: '/api/quest-items' },
    serenitea: { item: '/api/archive/serenitea', pages: '/api/archive/serenitea' },
    tcg: { item: '/api/archive/tcg', pages: '/api/archive/tcg' },
    miliastra: { item: '/api/archive/miliastra', pages: '/api/archive/miliastra' },
    misc: { item: '/api/misc', pages: '/api/misc' },
    outfit: { item: '/api/outfit', pages: '/api/outfits' },
} satisfies Record<ContentCategory, { item: string; pages: string }>;

export function content_item_path(category: ContentCategory, id: string): string {
    return `${CONTENT_ROUTES[category].item}/${encodeURIComponent(id)}`;
}
