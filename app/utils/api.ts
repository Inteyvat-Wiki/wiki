import type { Character } from '~/types/character';
import type { Characters } from '~/types/characters';
import type { Weapon } from '~/types/weapon';
import type { Weapons } from '~/types/weapons';
import type { Artifact } from '~/types/artifact';
import type { Artifacts } from '~/types/artifacts';

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