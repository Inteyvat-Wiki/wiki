import { INLINE_LINK_CATEGORIES, inline_link_category, is_inline_link_id } from '@inteyvat-wiki/wiki-contracts/inline_link';

// Only resolved raster/vector URLs are display assets; source hashes/prefabs remain metadata.
export function is_image_url(value: unknown): value is string {
    if (typeof value !== 'string' || /[\s\\<>"'\u0000-\u001f]/.test(value)) return false;
    if (!/^\/(?!\/)/.test(value) && !/^https?:\/\//i.test(value)) return false;
    try {
        const url = new URL(value, 'https://wiki.invalid');
        return /^https?:$/.test(url.protocol) && !url.username && !url.password
            && /\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);
    } catch { return false; }
}

export function display_images<T extends { name: string; url: string | null; kind?: string }>(images: T[]) {
    const seen = new Set<string>();
    return images.filter((image): image is T & { url: string } => {
        if (!is_image_url(image.url) || /prefab|config|hash/i.test(image.kind || '') || seen.has(image.url)) return false;
        seen.add(image.url);
        return true;
    });
}

export function entry_relation_path(category: string, id: string): string | null {
    const key = inline_link_category(category);
    return key && is_inline_link_id(id) ? `${INLINE_LINK_CATEGORIES[key].path}/${id}` : null;
}

// Decode once, after stripping markup, so escaped source tags remain literal text.
export function entry_plain_text(html: string): string {
    const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')
        .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (raw, entity: string) => {
            if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || raw;
            const value = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
            return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : raw;
        }).trim();
}

export type EntrySection = { title?: string; kind?: string; text: string };
export type EntryTextBlock = { title?: string; kind?: string; sections: EntrySection[] };

export function entry_detail_description(item: { description: string; sections: EntrySection[] }): string {
    const text_key = (value: string) => entry_plain_text(value).split('\n').map(line => line.trimEnd()).join('\n');
    const description = text_key(item.description);
    const groups = new Map<string, string[]>();
    for (const section of item.sections) {
        const text = text_key(section.text);
        if (!text) continue;
        if (text === description) return '';
        const kind = section.kind || '';
        groups.set(kind, [...(groups.get(kind) || []), text]);
    }
    return [...groups.values()].some(texts => texts.join('\n\n') === description) ? '' : item.description;
}

const ENTRY_METADATA_KINDS = new Set(['classification', 'source', 'unlock', 'preferred_characters',
    'quality', 'body_type', 'color', 'slot', 'category', 'variant', 'ps5_title', 'sender',
    'acquisition', 'subtitle', 'alternate_title']);

export function entry_is_long_text(html: string): boolean {
    const text = entry_plain_text(html.replace(/\\n/g, '\n'));
    // Approximate displayed width, so Chinese and English use the same visual budget.
    const width = [...text].reduce((sum, char) => sum + (/[\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]/u.test(char) ? 2 : 1), 0);
    return width > 360 || width > 160 && text.split(/\n\s*\n/).filter(value => value.trim()).length >= 3;
}

export function entry_detail_content(item: { description: string; sections: EntrySection[] }) {
    const description = entry_detail_description(item);
    const entries: EntrySection[] = [
        ...(entry_plain_text(description) ? [{ kind: 'description', text: description }] : []),
        ...item.sections.filter(section => entry_plain_text(section.text)),
    ];
    const fields: EntrySection[] = [], blocks: EntryTextBlock[] = [];
    let pending: EntrySection[] = [];
    const flush = () => {
        if (!pending.length) return;
        if (entry_is_long_text(pending.map(section => section.text).join('<br><br>'))) {
            blocks.push({ title: pending[0]!.title, kind: pending[0]!.kind, sections: pending });
        } else fields.push(...pending);
        pending = [];
    };
    for (const section of entries) {
        const metadata = ENTRY_METADATA_KINDS.has((section.kind || '').split(':')[0]!.toLowerCase());
        if (metadata) { flush(); fields.push(section); continue; }
        if (pending.length && (pending[0]!.kind !== section.kind || pending[0]!.title !== section.title)) flush();
        pending.push(section);
    }
    flush();
    return { fields, blocks };
}
