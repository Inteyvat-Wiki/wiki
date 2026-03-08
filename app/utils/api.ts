import type { Character } from '~/types/character';
import type { Characters } from '~/types/characters';

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
    const data = await api(`/api/character/${name}`)
    return data as Character
}

export async function getCharacters(): Promise<Characters> {
    const data = await api(`/api/characters`)
    return data as Characters
}