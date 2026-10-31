import { archive_images_enabled, archive_has_title_avatar } from '~~/shared/archive';
import { is_image_url } from '~~/shared/archive_display';

export type ArchiveListLayout = 'index' | 'compact' | 'media' | 'gallery' | 'portrait' | 'landscape' | 'text';
// Presentation only: all categories keep the same search, filters and detail contract.
const layouts: Record<string, Record<string, ArchiveListLayout>> = {
    serenitea: { furniture: 'gallery', realm: 'landscape', companion: 'index', suite: 'landscape' },
    tcg: { card: 'portrait', card_back: 'portrait', card_table: 'landscape', player: 'compact', stage: 'compact' },
    miliastra: { costume: 'gallery', suit: 'media', catalog: 'gallery', hall: 'landscape' },
    misc: { achievement: 'compact', achievement_group: 'gallery', namecard: 'landscape', profile_picture: 'portrait', profile_frame: 'portrait',
        expedition: 'media', gallant_path: 'media', loading_tip: 'text', tutorial: 'text', graeae_message: 'index' },
};

export function archive_list_icon(category: string, item: { type: string; icon: string | null }, failed = false): string | null {
    // Loading-tip icons are category markers, not illustrations of their text.
    return !failed && (archive_images_enabled(category, item.type) || archive_has_title_avatar(category, item.type)) && !(category === 'misc' && item.type === 'loading_tip')
        && is_image_url(item.icon) ? item.icon : null;
}

export function archive_list_layout(category: string, type: string, has_image: boolean): ArchiveListLayout {
    const layout = layouts[category]?.[type] || 'compact';
    return !has_image && ['gallery', 'portrait', 'landscape', 'media'].includes(layout) ? 'compact' : layout;
}
