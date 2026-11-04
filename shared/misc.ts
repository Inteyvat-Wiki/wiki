import type { MiscItem, MiscImageSource, MiscRelation } from '@inteyvat-wiki/wiki-contracts/misc';
export * from '@inteyvat-wiki/wiki-contracts/misc';

// Legacy local input adapter retained for existing tooling, not a published document.
// Do not use this upstream-shaped adapter for frontend responses.
export type MiscRecord = Omit<MiscItem, 'images' | 'relations'> & {
    id: string; order: number; show: boolean; version?: string;
    images: MiscImageSource[];
    relations: (MiscRelation & { source_id?: number })[];
};

export function filter_tutorial_category<T extends object>(items: T[], category: string): T[] {
    return category === 'all' ? items : items.filter(item => 'tutorial_category' in item && item.tutorial_category === category);
}
