import { entry_detail_description, entry_plain_text, type EntrySection } from './archive_display';

type CopyEntry = { name: string; description: string; sections: EntrySection[];
    relations?: { name: string; role: string; count?: number }[] };

// Shared by archive and miscellaneous details; receives display text, never source keys or URLs.
export function entry_copy_text(item: CopyEntry, options: {
    scope?: string; fallback_name?: string; relation_label?: (role: string) => string;
    metadata?: string[]; dialogues?: string[];
} = {}): string {
    return [options.scope, entry_plain_text(item.name) || options.fallback_name,
        ...(options.metadata || []).map(entry_plain_text), entry_plain_text(entry_detail_description(item)),
        ...item.sections.filter(section => entry_plain_text(section.text))
            .flatMap(section => [entry_plain_text(section.title || ''), entry_plain_text(section.text)]),
        ...(item.relations || []).map(relation => {
            const name = entry_plain_text(relation.name);
            if (!name) return '';
            const label = options.relation_label?.(relation.role);
            return `${label ? `${label}: ` : ''}${name}${relation.count && relation.count > 1 ? ` × ${relation.count}` : ''}`;
        }), ...(options.dialogues || []),
    ].filter(Boolean).join('\n\n');
}
