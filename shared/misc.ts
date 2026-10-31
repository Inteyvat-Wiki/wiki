export const MISC_TYPES = ['achievement', 'achievement_group', 'namecard', 'profile_picture', 'profile_frame', 'expedition',
    'gallant_path', 'loading_tip', 'tutorial', 'graeae_message'] as const;
export type MiscType = typeof MISC_TYPES[number];
export const TUTORIAL_CATEGORIES = ['element', 'enemy', 'system', 'adventure', 'activity', 'other'] as const;
export function filter_tutorial_category<T extends { tutorial_category?: string }>(items: T[], category: string): T[] {
    return category === 'all' ? items : items.filter(item => item.tutorial_category === category);
}
export type MiscSection = { title?: string; kind?: string; text: string };
export type MiscImageSource = { name: string; kind?: string };
export type MiscRelation = { category: string; id: string; name: string; role: string; source_id?: number };
export type MiscSource = { table: string; id: string; hashes: string[]; references?: string[] };
export type MiscMessageNode = { id: string; kind: string; text: string; preview?: string; speaker?: string;
    next: string[]; requires?: string; location?: string; image?: MiscImageSource & { url: string | null } };
export type MiscMessageThread = { initial: string[]; nodes: MiscMessageNode[] };
export type LoadingSituation = { id: string; action: string; areas?: { id: string; name: string }[]; terrain?: string;
    scene_ids?: string[]; dungeon_type?: string; dungeons?: { id: string; name: string }[];
    image?: MiscImageSource & { url: string | null } };

// IDs and TextMap uint32 hashes are strings; 64-bit resource references also remain exact strings.
export type MiscRecord = {
    id: string; order: number; show: boolean; type: MiscType; name: string; description: string;
    sections: MiscSection[]; images: MiscImageSource[]; relations: MiscRelation[]; source: MiscSource;
    diagnostics?: string[]; version?: string;
    loading_situations?: LoadingSituation[];
    tutorial_category?: string;
    message_thread?: MiscMessageThread;
};

export function is_misc_type(value: unknown): value is MiscType {
    return MISC_TYPES.some(type => type === value);
}

export function is_misc_id(value: unknown): value is string {
    // Identity/type membership is checked against the generated ID index, not inferred from a Wiki slug.
    return typeof value === 'string' && !value.startsWith('mail_template-')
        && /^(?=.*[a-z])(?:[a-z][a-z0-9]*(?:_[a-z0-9]+)*-)?[a-z0-9]+(?:_[a-z0-9]+)*(?:-\d+)?$/.test(value);
}
