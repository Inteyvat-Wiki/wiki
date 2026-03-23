import type { Character } from '~/types/character';
import type { Characters } from '~/types/characters';
import type { Weapon } from '~/types/weapon';
import type { Weapons } from '~/types/weapons';
import type { Artifact } from '~/types/artifact';
import type { Artifacts } from '~/types/artifacts';
import type { Material } from '~/types/material';
import type { Materials } from '~/types/materials';
import type { LivingBeing } from '~/types/living_being';
import type { LivingBeings } from '~/types/living_beings';
import type { Menu } from '~/types/menu';

const api = $fetch.create({
    async onRequest({ options }) {
        const { locale } = useI18n();
        const settings = await get_settings_value();

        options.query = {
            ...options.query,
            lang: locale.value,
            settings: JSON.stringify(settings),
        }
    }
})

export async function getCharacter(name: any): Promise<Character> {
    const data = await api(`/api/character/${name}`);
    return data as Character;
}

export async function getCharacters(): Promise<Characters> {
    const data = await api(`/api/characters`);
    return data as Characters;
}

export async function getWeapon(name: any): Promise<Weapon> {
    const data = await api(`/api/weapon/${name}`);
    return data as Weapon;
}

export async function getWeapons(): Promise<Weapons> {
    const data = await api(`/api/weapons`);
    return data as Weapons;
}

export async function getArtifact(name: any): Promise<Artifact> {
    const data = await api(`/api/artifact/${name}`);
    return data as Artifact;
}

export async function getArtifacts(): Promise<Artifacts> {
    const data = await api(`/api/artifacts`);
    return data as Artifacts;
}

export async function get_material(name: any): Promise<Material> {
    const data = await api(`/api/material/${name}`);
    return data as Material;
}

export async function get_materials(): Promise<Materials> {
    const data = await api(`/api/materials`);
    return data as Materials;
}

export async function get_living_being(name: any): Promise<LivingBeing> {
    const data = await api(`/api/living-being/${name}`);
    return data as LivingBeing;
}

export async function get_living_beings(): Promise<LivingBeings> {
    const data = await api(`/api/living-beings`);
    return data as LivingBeings;
}

export async function get_menu(): Promise<Menu> {
    const data = await api(`/api/menu`);
    return data;
}