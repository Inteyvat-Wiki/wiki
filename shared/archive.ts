import { entry_relation_path } from './archive_display';

export { ARCHIVE_CATEGORIES, is_archive_category } from '@inteyvat-wiki/wiki-contracts/archive';
export type { ArchiveCategory, ArchiveClassification } from '@inteyvat-wiki/wiki-contracts/archive';

export function is_serenitea_companion(category: string, type: string): boolean {
    return category === 'serenitea' && type === 'companion';
}

export function archive_has_title_avatar(category: string, type: string): boolean {
    return category === 'tcg' && ['player', 'stage'].includes(type) || is_serenitea_companion(category, type);
}

export function archive_images_enabled(category: string, type: string): boolean {
    return !is_serenitea_companion(category, type) && !(category === 'tcg' && type === 'stage');
}

export function archive_detail_images<T extends { url: string | null; kind?: string; name?: string }>(category: string, type: string, images: T[]) {
    if (!archive_images_enabled(category, type)) return [];
    const title_image = archive_title_image(category, type, images);
    return archive_images(images.filter(image => !title_image || image.url !== title_image.url));
}

export function archive_title_image<T extends { url: string | null; kind?: string }>(category: string, type: string, images: T[]) {
    if (!archive_has_title_avatar(category, type)) return undefined;
    const kind = is_serenitea_companion(category, type) ? 'portrait' : type === 'stage' ? 'opponent' : 'player';
    return archive_images(images.filter(image => image.kind === kind))[0];
}

export function archive_images<T extends { url: string | null; kind?: string }>(images: T[]): (T & { url: string })[] {
    const seen = new Set<string>();
    return images.filter((image): image is T & { url: string } => {
        if (!image.url || /prefab|config/i.test(image.kind || '') || seen.has(image.url)) return false;
        seen.add(image.url);
        return true;
    });
}

export function archive_relation_path(category: string, id: string): string | null {
    return entry_relation_path(category, id);
}
