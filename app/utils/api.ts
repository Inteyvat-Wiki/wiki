import type { Character, CharacterPages } from '~/types/character';
import type { Weapon, WeaponPages } from '~/types/weapon';
import type { Artifact, ArtifactPages } from '~/types/artifact';
import type { Material, MaterialPages } from '~/types/material';
import type { Book, BookPages } from '~/types/book';
import type { Readable, ReadablePages } from '~/types/readable';
import type { LivingBeing, LivingBeingPages } from '~/types/living_being';
import type { Geography, GeographyPages } from '~/types/geography';
import type { Mapback, Maplayer, MapList, MapConditions } from '~/types/map';
import type { ChapterGroup, ChapterGroupPages, Task, TaskPages } from '~/types/travel_log';
import type { QuestItem, QuestItemPages } from '~/types/quest_item';
import type { Menu } from '~/types/menu';
import type { LocaleCode } from '~~/shared/i18n';
import type { InlineLinkCategory, InlineLinkInfo } from '~~/shared/inline_link';

const api = $fetch.create({
    async onRequest({ options }) {
        const locale = useNuxtApp().$i18n.locale;
        const lang: LocaleCode = locale.value as LocaleCode;
        const settings = await get_settings_value();

        options.query = {
            ...options.query,
            lang,
            settings: JSON.stringify(settings),
        }
    }
})

export async function get_inline_link(category: InlineLinkCategory, id: string): Promise<InlineLinkInfo> {
    const path: string = `/api/inline-link/${category}/${id}`;
    return await api<InlineLinkInfo>(path);
}

export async function getCharacter(name: any): Promise<Character> {
    const data = await api(`/api/character/${name}`);
    return data as Character;
}

export async function getCharacters(): Promise<CharacterPages> {
    const data = await api(`/api/characters`);
    return data as CharacterPages;
}

export async function getWeapon(name: any): Promise<Weapon> {
    const data = await api(`/api/weapon/${name}`);
    return data as Weapon;
}

export async function getWeapons(): Promise<WeaponPages> {
    const data = await api(`/api/weapons`);
    return data as WeaponPages;
}

export async function getArtifact(name: any): Promise<Artifact> {
    const data = await api(`/api/artifact/${name}`);
    return data as Artifact;
}

export async function getArtifacts(): Promise<ArtifactPages> {
    const data = await api(`/api/artifacts`);
    return data as ArtifactPages;
}

export async function get_material(name: any): Promise<Material> {
    const data = await api(`/api/material/${name}`);
    return data as Material;
}

export async function get_materials(): Promise<MaterialPages> {
    const data = await api(`/api/materials`);
    return data as MaterialPages;
}

export async function get_book(name: string): Promise<Book> {
    return await api<Book>(`/api/book/${name}`);
}

export async function get_books(): Promise<BookPages> {
    return await api<BookPages>('/api/books');
}

export async function get_readable(name: string): Promise<Readable> {
    return await api<Readable>(`/api/readable/${name}`);
}

export async function get_readables(): Promise<ReadablePages> {
    return await api<ReadablePages>('/api/readables');
}

export async function get_living_being(name: any): Promise<LivingBeing> {
    const data = await api(`/api/living-being/${name}`);
    return data as LivingBeing;
}

export async function get_living_beings(): Promise<LivingBeingPages> {
    const data = await api(`/api/living-beings`);
    return data as LivingBeingPages;
}

export async function get_geography(name: any): Promise<Geography> {
    const data = await api(`/api/geography/${name}`);
    return data as Geography;
}

export async function get_geographies(): Promise<GeographyPages> {
    const data = await api(`/api/geographies`);
    return data as GeographyPages;
}

export async function get_mapback(name: any): Promise<Mapback> {
    const data = await api(`/api/map/mapback/${name}`);
    return data as Mapback;
}

export async function get_maplayer(name: any): Promise<Maplayer> {
    const data = await api(`/api/map/maplayer/${name}`);
    return data as Maplayer;
}

export async function get_map_list(): Promise<MapList> {
    const data = await api(`/api/maps`);
    return data as MapList;
}

export async function get_map_conditions(): Promise<MapConditions> {
    const data = await api(`/api/map/map_conditions`);
    return data as MapConditions;
}

export async function get_menu(): Promise<Menu> {
    const data = await api(`/api/menu`);
    return data;
}

export async function get_npcs(): Promise<import('~/types/npc').NpcPages> {
    return await api<import('~/types/npc').NpcPages>('/api/npcs');
}

export async function get_npc(name: string): Promise<import('~/types/npc').Npc> {
    const path: string = `/api/npc/${name}`;
    return await api<import('~/types/npc').Npc>(path);
}

export async function get_chapter_groups(): Promise<ChapterGroupPages> {
    const data = await api('/api/chapter-groups');
    return data as ChapterGroupPages;
}

export async function get_chapter_group(name: string): Promise<ChapterGroup> {
    const data = await api(`/api/chapter-group/${name}`);
    return data as ChapterGroup;
}

export async function get_tasks(): Promise<TaskPages> {
    const data = await api('/api/tasks');
    return data as TaskPages;
}

export async function get_task(name: string): Promise<Task> {
    const data = await api(`/api/task/${name}`);
    return data as Task;
}

export async function get_quest_items(): Promise<QuestItemPages> {
    const data = await api('/api/quest-items');
    return data as QuestItemPages;
}

export async function get_quest_item(name: string): Promise<QuestItem> {
    const data = await api(`/api/quest-item/${name}`);
    return data as QuestItem;
}
