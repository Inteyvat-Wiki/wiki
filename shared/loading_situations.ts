import type { LoadingSituation } from './misc';
import { entry_plain_text, is_image_url } from './archive_display';

export type LoadingTranslator = (key: string, values?: Record<string, string | number>) => string;

// Each action owns its relevant fields. Do not fill irrelevant columns with defaults.
export function loading_situation_fields(value: LoadingSituation, t: LoadingTranslator) {
    const fields: { key: string; label: string; text: string }[] = [];
    const add = (key: string, text: string) => fields.push({ key, label: t(`misc.loading.${key}`), text });
    if (value.action === 'transport') {
        if (value.areas?.length) add('areas', value.areas.map(area => entry_plain_text(area.name) || t('misc.loading.unnamed_area')).join('、'));
        if (value.terrain) add('terrain', t(`misc.loading.terrains.${value.terrain}`));
    }
    if (value.action === 'certain_dungeon') {
        if (value.dungeon_type) add('dungeon_type', t(`misc.loading.dungeon_types.${value.dungeon_type}`));
        if (value.dungeons?.length) add('dungeons', value.dungeons.map(dungeon => entry_plain_text(dungeon.name)
            || t('misc.loading.dungeon_id', { id: dungeon.id })).join('、'));
    }
    if (value.action === 'specified_room' && value.scene_ids?.length) add('scenes', value.scene_ids.join('、'));
    return fields;
}

export function loading_situation_groups(values: readonly LoadingSituation[], t: LoadingTranslator) {
    const groups = new Map<string, { action: string; columns: { key: string; label: string }[];
        rows: { id: string; fields: { key: string; text: string }[]; image?: LoadingSituation['image'] }[] }>();
    for (const value of values) {
        if (!groups.has(value.action)) groups.set(value.action, { action: value.action, columns: [], rows: [] });
        const group = groups.get(value.action)!;
        const fields = loading_situation_fields(value, t);
        for (const field of fields) if (!group.columns.some(column => column.key === field.key)) {
            group.columns.push({ key: field.key, label: field.label });
        }
        const image = value.image?.url && is_image_url(value.image.url) ? value.image : undefined;
        if (fields.length || image) group.rows.push({ id: value.id, fields, ...(image ? { image } : {}) });
    }
    return [...groups.values()];
}

export type LoadingSituationTableRow = {
    id: string; action: string; fields: { key: string; label: string; text: string }[];
    image?: LoadingSituation['image']; action_span: number; image_span: number;
};

export function loading_situation_table_rows(values: readonly LoadingSituation[], t: LoadingTranslator): LoadingSituationTableRow[] {
    const rows = loading_situation_groups(values, t).flatMap(group => {
        const entries = group.rows.length ? group.rows : [{ id: group.action, fields: [], image: undefined }];
        return entries.map((row, index) => ({
            id: `${group.action}:${row.id}`, action: group.action,
            fields: row.fields.map(field => ({ ...field, label: group.columns.find(column => column.key === field.key)!.label })),
            image: row.image, action_span: index === 0 ? entries.length : 0, image_span: 1,
        }));
    });
    for (let start = 0; start < rows.length;) {
        const row = rows[start]!;
        let end = start + 1;
        // Only contiguous identical pictures within one action may share a cell.
        if (row.image?.url) while (end < rows.length && rows[end]!.action === row.action
            && rows[end]!.image?.url === row.image.url) end++;
        row.image_span = end - start;
        for (let index = start + 1; index < end; index++) rows[index]!.image_span = 0;
        start = end;
    }
    return rows;
}
