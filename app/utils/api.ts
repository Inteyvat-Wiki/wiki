import type { ContentCategory, ContentPages, DisplayResponse } from '@inteyvat-wiki/wiki-contracts/registry';
import type { ArchiveCategory } from '@inteyvat-wiki/wiki-contracts/archive';
import { DEFAULT_LOCALE, isLocaleCode } from '~~/shared/i18n';
import { CONTENT_ROUTES, content_item_path } from '~~/shared/content_routes';
import type { Mapback, Maplayer, MapList, MapConditions } from '@inteyvat-wiki/wiki-contracts/map';
import type { MapCataloguePage } from '@inteyvat-wiki/wiki-contracts/map';
import type { MapScene, MapSceneIndex, MapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
import type { Menu } from '@inteyvat-wiki/wiki-contracts/menu';
import type { InlineLinkCategory, InlineLinkInfo } from '@inteyvat-wiki/wiki-contracts/inline_link';

const api = $fetch.create({
    async onRequest({ options }) {
        const locale = useNuxtApp().$i18n.locale;
        const lang = isLocaleCode(locale.value) ? locale.value : DEFAULT_LOCALE;
        const settings = await get_settings_value();

        options.query = {
            ...options.query,
            lang,
            settings: JSON.stringify(settings),
        }
    }
})


// Transport annotations describe the same-origin server contract, NOT JSON validation.
// Export trust checks live on the server; nested response validation is not provided here.
export async function get_content_item<C extends ContentCategory>(category: C, id: string): Promise<DisplayResponse<C>> {
    return api<DisplayResponse<C>>(content_item_path(category, id));
}

export async function get_content_pages<C extends ContentCategory>(category: C): Promise<ContentPages<C>> {
    return api<ContentPages<C>>(CONTENT_ROUTES[category].pages);
}

export async function get_map_record(id: string) {
    if (!id) return undefined;
    const page = await api<MapCataloguePage>('/api/map/catalogue', { query: { id } });
    return page.items[0];
}

export async function get_map_scene_index(): Promise<MapSceneIndex> {
    return api<MapSceneIndex>('/api/map/scenes');
}
export async function get_map_task_dependencies(): Promise<MapTaskDependencies> {
    return api<MapTaskDependencies>('/api/map/task_dependencies');
}
export async function get_map_scene(id: string): Promise<MapScene> {
    return api<MapScene>(`/api/map/scenes/${encodeURIComponent(id)}`);
}

export async function get_misc_pages(): Promise<ContentPages<'misc'>> {
    return get_content_pages('misc');
}

export async function get_outfit_pages(): Promise<ContentPages<'outfit'>> {
    return get_content_pages('outfit');
}

export async function get_outfit_item(id: string): Promise<DisplayResponse<'outfit'>> {
    return get_content_item('outfit', id);
}

export async function get_misc_item(name: string): Promise<DisplayResponse<'misc'>> {
    return get_content_item('misc', name);
}

export async function get_archive_pages<C extends ArchiveCategory>(category: C): Promise<ContentPages<C>> {
    return get_content_pages(category);
}

export async function get_archive_item<C extends ArchiveCategory>(category: C, id: string): Promise<DisplayResponse<C>> {
    return get_content_item(category, id);
}

export async function get_inline_link(category: InlineLinkCategory, id: string): Promise<InlineLinkInfo> {
    const path: string = `/api/inline-link/${category}/${encodeURIComponent(id)}`;
    return await api<InlineLinkInfo>(path);
}

export async function getCharacter(name: string): Promise<DisplayResponse<'character'>> {
    return get_content_item('character', name);
}

export async function getCharacters(): Promise<ContentPages<'character'>> {
    return get_content_pages('character');
}

export async function getWeapon(name: string): Promise<DisplayResponse<'weapon'>> {
    return get_content_item('weapon', name);
}

export async function getWeapons(): Promise<ContentPages<'weapon'>> {
    return get_content_pages('weapon');
}

export async function getArtifact(name: string): Promise<DisplayResponse<'artifact'>> {
    return get_content_item('artifact', name);
}

export async function getArtifacts(): Promise<ContentPages<'artifact'>> {
    return get_content_pages('artifact');
}

export async function get_material(name: string): Promise<DisplayResponse<'material'>> {
    return get_content_item('material', name);
}

export async function get_materials(): Promise<ContentPages<'material'>> {
    return get_content_pages('material');
}

export async function get_book(name: string): Promise<DisplayResponse<'book'>> {
    return get_content_item('book', name);
}

export async function get_books(): Promise<ContentPages<'book'>> {
    return get_content_pages('book');
}

export async function get_readable(name: string): Promise<DisplayResponse<'readable'>> {
    return get_content_item('readable', name);
}

export async function get_readables(): Promise<ContentPages<'readable'>> {
    return get_content_pages('readable');
}

export async function get_living_being(name: string): Promise<DisplayResponse<'living_being'>> {
    return get_content_item('living_being', name);
}

export async function get_living_beings(): Promise<ContentPages<'living_being'>> {
    return get_content_pages('living_being');
}

export async function get_geography(name: string): Promise<DisplayResponse<'geography'>> {
    return get_content_item('geography', name);
}

export async function get_geographies(): Promise<ContentPages<'geography'>> {
    return get_content_pages('geography');
}

export async function get_mapback(name: string): Promise<Mapback> {
    return api<Mapback>(`/api/map/mapback/${encodeURIComponent(name)}`);
}

export async function get_maplayer(name: string | null): Promise<Maplayer> {
    if (name === null) throw new Error('Missing maplayer name');
    return api<Maplayer>(`/api/map/maplayer/${encodeURIComponent(name)}`);
}

export async function get_map_list(): Promise<MapList> {
    return api<MapList>('/api/maps');
}

export async function get_map_conditions(): Promise<MapConditions> {
    return api<MapConditions>('/api/map/map_conditions');
}

export async function get_menu(): Promise<Menu> {
    return api<Menu>('/api/menu');
}

export async function get_npcs(): Promise<ContentPages<'npc'>> {
    return get_content_pages('npc');
}

export async function get_npc(name: string): Promise<DisplayResponse<'npc'>> {
    return get_content_item('npc', name);
}

export async function get_chapter_groups(): Promise<ContentPages<'chapter_group'>> {
    return get_content_pages('chapter_group');
}

export async function get_chapter_group(name: string): Promise<DisplayResponse<'chapter_group'>> {
    return get_content_item('chapter_group', name);
}

export async function get_tasks(): Promise<ContentPages<'task'>> {
    return get_content_pages('task');
}

export async function get_task(name: string): Promise<DisplayResponse<'task'>> {
    return get_content_item('task', name);
}

export async function get_quest_items(): Promise<ContentPages<'quest_item'>> {
    return get_content_pages('quest_item');
}

export async function get_quest_item(name: string): Promise<DisplayResponse<'quest_item'>> {
    return get_content_item('quest_item', name);
}
