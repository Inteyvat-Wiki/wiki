import type { OutfitItem, OutfitPage, OutfitType } from '@inteyvat-wiki/wiki-contracts/outfit';
import { isOutfitType } from '@inteyvat-wiki/wiki-contracts/outfit';
import type { WikiImage } from '@inteyvat-wiki/wiki-contracts/common';
import { entry_plain_text } from './archive_display';
import { gallery_size, type GallerySize } from './gallery_layout';

export function outfit_selected_type(value: unknown): OutfitType {
    return isOutfitType(value) ? value : 'character';
}

export function filter_outfit_pages(items: readonly OutfitPage[], type: OutfitType, search: string): OutfitPage[] {
    const query = search.trim().toLocaleLowerCase();
    return items.filter(item => item.show && item.type === type && (!query
        || entry_plain_text(`${item.name} ${item.description} ${item.character?.name || ''}`).toLocaleLowerCase().includes(query)));
}

// A single semantic variant is enough for the detail gallery; keep the richest available one.
export function outfit_detail_images(item: OutfitItem): WikiImage[] {
    const kind = (['splash', 'card', 'icon'] as const).find(kind => item.images.some(image => image.kind === kind));
    const images = kind ? item.images.filter(image => image.kind === kind) : item.icon ? [{ kind: 'icon', url: item.icon }] : [];
    return [...new Map(images.map(image => [image.url, { ...image, name: item.name }])).values()];
}

export function outfit_gallery_size(type: OutfitType, images: readonly WikiImage[]): GallerySize {
    // Even a high-resolution icon needs only a small column. Artwork keeps its category's aspect/size budget.
    return images.length && images.every(image => image.kind === 'icon')
        ? gallery_size('common', 'icon') : gallery_size('outfit', type);
}

export const OUTFIT_LIST_LAYOUT = Object.freeze({
    character: { minWidth: 190, layout: 'gallery' },
    weapon: { minWidth: 240, layout: 'media' },
    glider: { minWidth: 300, layout: 'landscape' },
} as const);
