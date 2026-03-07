import type { Character } from '~/types/character';
import type { Characters } from '~/types/characters';
import { useFetch } from '#app'

async function fetchWithErrorHandling(url: string) {
    const { data, error } = await useFetch(url)
    if (error.value) {
        const err = error.value as any
        console.error('Fetch error:', err)
        throw err
    }
    return data.value
}

export async function getCharacter(name: any, lang: string): Promise<Character> {
  const data = await fetchWithErrorHandling(`/api/character/${name}?lang=${lang}`)
  return data as Character
}

export async function getCharacters(lang: string): Promise<Characters> {
    const data = await fetchWithErrorHandling(`/api/characters?lang=${lang}`)
    return data as Characters
}