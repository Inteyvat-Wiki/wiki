import { entry_plain_text } from '~~/shared/archive_display';
import type { ArchiveClassification } from '~~/shared/archive';
import { ARCHIVE_TAG_GROUPS, archive_tag_group, archive_sorted_tags, type ArchiveCardTag } from '~~/shared/archive_tags';
import type { CascaderProps } from 'element-plus';

export function archive_selected_type(types: readonly string[], value: unknown): string {
    return typeof value === 'string' && types.includes(value) ? value : types[0] || '';
}

type ClassifiedPage = { type: string; show: boolean; classifications?: ArchiveClassification[] };
const classified_types = new Set(['furniture', 'costume']);
type CardPage = { type: string; show: boolean; card_type?: { id: string; name: string }; tags?: ArchiveCardTag[] };

export const archive_tag_cascader_props: CascaderProps = {
    multiple: true, emitPath: false, checkStrictly: true,
    checkOnClickNode: false, checkOnClickLeaf: true,
    // In strict mode disabled non-leaf nodes can expand, but cannot be checked.
    disabled: data => !!data.children?.length,
};

export function archive_card_tag_groups(items: CardPage[], label: (key: string) => string) {
    const tags = new Map<string, ArchiveCardTag>();
    for (const item of items.filter(item => item.show && item.type === 'card')) {
        for (const tag of item.tags || []) if (!tag.hidden) tags.set(tag.id, tag);
    }
    const sorted = archive_sorted_tags([...tags.values()]);
    return ARCHIVE_TAG_GROUPS.map(group => ({ value: `tag-group:${group}`, label: label(group),
        children: sorted.filter(tag => archive_tag_group(tag.id) === group)
            .map(tag => ({ value: tag.id, label: entry_plain_text(tag.name) })),
    })).filter(group => group.children.length);
}

export function archive_card_options(items: CardPage[], field: 'card_type' | 'tags') {
    const values = new Map<string, string>();
    for (const item of items.filter(item => item.show && item.type === 'card')) {
        const labels = field === 'card_type' ? (item.card_type ? [item.card_type] : []) : (item.tags || []).filter(tag => !tag.hidden);
        for (const value of labels) values.set(value.id, entry_plain_text(value.name));
    }
    return [...values].map(([id, name]) => ({ id, name }));
}

export function filter_archive_cards<T extends CardPage>(items: T[], type: string, tags: string[]): T[] {
    return items.filter(item => item.type === 'card' && (type === 'all' || item.card_type?.id === type)
        && tags.every(id => item.tags?.some(tag => !tag.hidden && tag.id === id)));
}
export type ArchiveClassificationOption = { id: string; name: string; duplicate_name: boolean };

export function archive_classifications(item: Pick<ClassifiedPage, 'classifications'>): ArchiveClassification[] {
    return (item.classifications || []).filter(value => /^[1-9]\d*$/.test(value.id) && /^[1-9]\d*$/.test(value.group_id));
}

function classification_options(values: Map<string, string>): ArchiveClassificationOption[] {
    const names = [...values.values()];
    return [...values].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
        .map(([id, name]) => ({ id, name, duplicate_name: names.filter(value => value === name).length > 1 }));
}

export function archive_classification_groups(items: ClassifiedPage[]): ArchiveClassificationOption[] {
    const values = new Map<string, string>();
    for (const item of items.filter(item => item.show && classified_types.has(item.type))) {
        for (const value of archive_classifications(item)) values.set(value.group_id, entry_plain_text(value.group_name));
    }
    return classification_options(values);
}

export function archive_classification_children(items: ClassifiedPage[], group: string): ArchiveClassificationOption[] {
    const values = new Map<string, string>();
    for (const item of items.filter(item => item.show && classified_types.has(item.type))) {
        for (const value of archive_classifications(item)) {
            if (value.group_id === group) values.set(value.id, entry_plain_text(value.name));
        }
    }
    return classification_options(values);
}

export function filter_archive_classifications<T extends ClassifiedPage>(items: T[], group: string, child = 'all'): T[] {
    if (group === 'all') return items;
    return items.filter(item => classified_types.has(item.type) && (group === 'unclassified'
        ? archive_classifications(item).length === 0
        : archive_classifications(item).some(value => value.group_id === group && (child === 'all' || value.id === child))));
}

export function filter_archive_pages<T extends { id: string; name: string; description: string; type: string; show: boolean; source_id?: string }>(
    items: T[], search: string, type: string,
): T[] {
    const query = search.trim().toLocaleLowerCase();
    return items.filter(item => item.show && (type === 'all' || item.type === type)
        && (!query || entry_plain_text(`${item.id} ${item.source_id || ''} ${item.name} ${item.description}`).toLocaleLowerCase().includes(query)));
}

export function archive_page_number(value: unknown, count: number, size: number): number {
    const requested = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1;
    return Math.max(1, Math.min(Number.isSafeInteger(requested) ? requested : 1, Math.ceil(count / size) || 1));
}
