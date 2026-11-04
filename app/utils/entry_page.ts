import type { PageDataTrait } from '@inteyvat-wiki/wiki-contracts/common';
import { get_page_data } from '~/utils/page';
import { merge_entry_page, resolve_page_relations } from '~~/shared/entry_page';
import { createError } from 'h3';

export async function get_entry_page<P extends PageDataTrait & { source_id?: string },
    T extends Parameters<typeof merge_entry_page>[1][number] & { type: string }>(
    id: string, get_pages: () => Promise<P[]>, get_item: (id: string) => Promise<T>, category?: string,
): Promise<T> {
    const pages = await get_pages();
    const loaded = new Map<string, T>();
    let page = pages.find(page => page.id === id);
    if (!page) {
        // The item endpoint already resolves maintained aliases and stable source IDs.
        const item = await get_item(id);
        page = pages.find(page => page.source_id === `${item.type}-${item.source.id}`);
        if (page) loaded.set(page.id, item);
    }
    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' });
    if (page.group) {
        const canonical = page.group.id;
        page = pages.find(value => value.id === canonical);
        if (!page) throw new Error('Missing canonical group page');
    }
    const result = await get_page_data(page.id, async () => pages, async key => loaded.get(key) || get_item(key));
    const merged = merge_entry_page(result.page, result.items);
    return category ? resolve_page_relations(merged, pages, category) : merged;
}
