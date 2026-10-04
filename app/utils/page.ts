import type { PageDataTrait } from '~/types/common';

export async function get_page_data<P extends PageDataTrait, T>(
    id: string,
    get_pages: () => Promise<P[]>,
    get_item: (id: string) => Promise<T>,
): Promise<{ page: P; items: T[] }> {
    const pages = await get_pages();
    const page = pages.find(page => page.id === id);
    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' });
    const ids = [...new Set([...page.items, ...page.related_items])];
    const items: T[] = [];
    for (const item_id of ids) items.push(await get_item(item_id));
    return { page, items };
}
