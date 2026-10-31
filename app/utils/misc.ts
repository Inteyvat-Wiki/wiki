import type { MiscItem, MiscRelation, MiscImage, MiscType, MiscPageData } from '~/types/misc';
import { is_misc_id } from '~~/shared/misc';
import { entry_plain_text, entry_relation_path, entry_detail_description } from '~~/shared/archive_display';
import { entry_copy_text } from '~~/shared/entry_copy';
import { loading_situation_groups, type LoadingTranslator } from '~~/shared/loading_situations';

export function is_misc_collection_member(item: Pick<MiscItem, 'type'>, relation: MiscRelation): boolean {
    return item.type === 'achievement_group' && relation.category === 'misc'
        && relation.role === 'achievement' && is_misc_id(relation.id);
}

export function misc_collection_members(item: MiscItem, pages: MiscPageData[]) {
    const index = new Map(pages.filter(page => page.type === 'achievement').map(page => [page.id, page]));
    const seen = new Set<string>();
    return item.relations.filter(relation => is_misc_collection_member(item, relation)).flatMap(relation => {
        const id = index.get(relation.id)?.group?.id || relation.id;
        if (seen.has(id)) return [];
        seen.add(id);
        const page = index.get(id);
        return [{ id, source_id: page?.source_id || '', name: page?.name || relation.name, description: page?.description || '' }];
    });
}

export function misc_relation_path(relation: Pick<MiscRelation, 'category' | 'id'>): string | null {
    if (relation.category === 'misc') return is_misc_id(relation.id) ? `/misc/${relation.id}` : null;
    return entry_relation_path(relation.category, relation.id);
}

export function misc_copy_text(item: MiscItem, scope = '', relation_label?: (role: string) => string, fallback_name = '', translate?: LoadingTranslator): string {
    const text = entry_copy_text(item, { scope, fallback_name, relation_label,
        dialogues: item.message_thread?.nodes.filter(node => node.kind !== 'control').map(node => [
            entry_plain_text(node.speaker || ''), entry_plain_text(node.text), entry_plain_text(node.location || ''),
        ].filter(Boolean).join('：')).filter(Boolean),
    });
    if (!item.loading_situations?.length || !translate) return text;
    const groups = loading_situation_groups(item.loading_situations, translate);
    const situations = groups.map(group => [translate(`misc.loading.actions.${group.action}`),
        ...group.rows.filter(row => row.fields.length).map(row => row.fields.map(field => `${group.columns.find(column => column.key === field.key)!.label}：${field.text}`).join(' · '))].join('\n'));
    return `${text}\n\n${translate('misc.loading.title')}\n${situations.join('\n\n')}`;
}

export function misc_detail_description(item: Pick<MiscItem, 'description' | 'sections'>): string {
    return entry_detail_description(item);
}

export function misc_relation_label_key(role: string): string | null {
    if (['group', 'region', 'outfit', 'achievement', 'tutorial', 'namecard', 'profile_picture', 'profile_frame',
        'expedition', 'gallant_path', 'previous_stage', 'next_stage', 'monster', 'stage', 'lore',
        'unlock_avatar', 'unlock_costume', 'unlock_material', 'unlock_quest'].includes(role)) {
        return `misc.roles.${role}`;
    }
    if (role === 'unlock' || role.startsWith('unlock_')) return 'misc.roles.unlock';
    return null;
}

export function misc_section_label_key(kind: string): string | null {
    const key = kind.toLowerCase();
    return ['pc', 'mobile', 'ps', 'ps5_title', 'acquisition', 'sender', 'alternate_title', 'subtitle'].includes(key)
        ? `misc.sections.${key}` : null;
}

export function misc_visible_sections(item: Pick<MiscItem, 'sections'>) {
    return item.sections.filter(section => entry_plain_text(section.text));
}

export function misc_placeholder_name(type_label: string, id: string): string {
    return `${type_label} · ${id}`;
}

export function misc_image_label_key(type: MiscType, image: Pick<MiscImage, 'kind'>): string {
    if (image.kind === 'monster_icon') return 'misc.images.monster_icon';
    if (type === 'namecard' && ['icon', 'banner', 'background'].includes(image.kind || '')) {
        return `misc.images.namecard_${image.kind}`;
    }
    if (image.kind === 'icon' && type === 'profile_picture') return 'misc.images.profile_picture';
    if (image.kind === 'icon' && type === 'profile_frame') return 'misc.images.profile_frame';
    return 'archive.image_alt';
}
