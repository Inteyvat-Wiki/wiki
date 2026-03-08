import type { Character } from '~/types/character';
import type { Characters } from '~/types/characters';

const api = $fetch.create({
    onRequest({ options }) {
        const { locale } = useI18n()

        options.query = {
            ...options.query,
            lang: locale.value
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