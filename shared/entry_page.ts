import type { PageDataTrait } from '@inteyvat-wiki/wiki-contracts/common';
import type { EntrySection } from './archive_display';

type PageItem = { name: string; description: string; sections: EntrySection[];
    images: { name: string; url: string | null; kind?: string }[];
    relations: { category: string; id: string; name: string; role: string }[];
    source: { table: string; id: string; hashes: string[]; references?: string[] } };

/** Combine display content only. Exported item records retain their original identities. */
export function merge_entry_page<T extends PageItem>(page: PageDataTrait, items: T[]): T {
    const first = items[0];
    if (!first) throw new Error(`Empty page: ${page.id}`);
    if (!page.group || items.length < 2) return first;
    const stages = page.group.mode === 'stages';
    const seen = new Set<string>();
    const relations = (stages ? first.relations : items.flatMap(item => item.relations)).filter(relation => {
        if (stages && ['previous_stage', 'next_stage'].includes(relation.role)) return false;
        const key = `${relation.category}:${relation.role}:${relation.id}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
    return { ...first, name: page.name, description: '', relations,
        sections: items.flatMap((item, index) => [
            { title: stages ? `${index + 1}. ${item.name}` : item.name,
                kind: stages ? 'achievement_stage' : 'hall_description', text: item.description }, ...item.sections,
        ]),
        images: stages ? first.images : items.flatMap(item => item.images),
        source: { ...first.source, hashes: [...new Set(items.flatMap(item => item.source.hashes))],
            references: [...new Set(items.flatMap(item => [...(item.source.references || []), `${item.source.table}:${item.source.id}`]))] },
    };
}

export function resolve_page_relations<T extends PageItem>(item: T, pages: PageDataTrait[], category: string): T {
    const index = new Map(pages.map(page => [page.id, page]));
    const seen = new Set<string>();
    const relations = item.relations.map(relation => ({ ...relation,
        id: relation.category === category ? index.get(relation.id)?.group?.id || relation.id : relation.id,
    })).filter(relation => {
        const key = `${relation.category}:${relation.role}:${relation.id}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
    return { ...item, relations };
}
