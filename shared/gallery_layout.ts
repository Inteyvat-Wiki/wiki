export type GallerySize = { width: number; imageWidth: number; imageHeight: number };
export type ImageDimensions = { width: number; height: number };

const icon = { width: 204, imageWidth: 160, imageHeight: 220 };
const badge = { width: 244, imageWidth: 200, imageHeight: 260 };
const standard = { width: 320, imageWidth: 276, imageHeight: 380 };
const wide = { width: 640, imageWidth: 596, imageHeight: 420 };
const sizes: Record<string, Record<string, GallerySize>> = {
    common: { icon: { width: 194, imageWidth: 150, imageHeight: 220 } },
    serenitea: { furniture: standard, realm: wide, suite: { width: 560, imageWidth: 516, imageHeight: 360 } },
    tcg: { card: { width: 284, imageWidth: 240, imageHeight: 440 },
        card_back: { width: 324, imageWidth: 280, imageHeight: 480 }, card_table: standard },
    miliastra: { costume: standard, catalog: standard, suit: { width: 384, imageWidth: 340, imageHeight: 480 }, hall: wide },
    misc: { profile_picture: icon, profile_frame: icon, achievement: badge, achievement_group: badge,
        gallant_path: { width: 300, imageWidth: 256, imageHeight: 300 },
        loading_tip: { width: 300, imageWidth: 256, imageHeight: 300 }, namecard: wide,
        expedition: { width: 556, imageWidth: 512, imageHeight: 300 },
        tutorial: { width: 724, imageWidth: 680, imageHeight: 520 } },
};

export function gallery_size(category: string, type: string): GallerySize {
    return { ...(sizes[category]?.[type] || standard) };
}

function valid_dimensions(size: ImageDimensions): boolean {
    return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

// A small resource must not be stretched just because the viewport is large.
export function gallery_panel_width(size: GallerySize, loaded: ImageDimensions[]): number {
    const dimensions = loaded.filter(valid_dimensions);
    if (!dimensions.length) return size.width;
    const width = Math.max(...dimensions.map(image => Math.min(size.imageWidth, image.width,
        size.imageHeight * image.width / image.height)));
    return Math.min(size.width, Math.max(160, Math.ceil(width + 44)));
}

export function gallery_image_style(size: GallerySize, image?: ImageDimensions) {
    const known = image && valid_dimensions(image) ? image : undefined;
    const width = known ? Math.min(size.imageWidth, known.width, size.imageHeight * known.width / known.height) : size.imageWidth;
    return { '--gallery-image-width': `${width}px`, '--gallery-image-height': `${size.imageHeight}px`,
        '--gallery-image-ratio': known ? `${known.width} / ${known.height}` : '1' };
}
