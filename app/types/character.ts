import type { ElementType, WeaponType } from "~/types/common";

export type Character = {
    name: string,
    icon: string,
    splash: string,
    element: ElementType,
    weapon: WeaponType,
    star: 4 | 5,
    info: {
        title: string,
        description: string,
    }[],
    stats: {
        hp: Record<number, string>[],
        atk: Record<number, string>[],
        def: Record<number, string>[],
        substats: {
            name: string,
            value: string[],
        }[],
    },
    skills: {
        id: number | null,
        title: string,
        sub_title: string | null,
        icon: string,
        description: string,
        details: {
            title: string,
            value: string[],
        }[] | null,
    }[],
    talents: {
        id: number | null,
        title: string,
        sub_title: string | null,
        icon: string | null,
        description: string,
    }[],
    constellations: {
        id: number | null,
        title: string,
        sub_title: string | null,
        icon: string,
        description: string,
    }[],
    link_description: {
        id: number,
        title: string,
        description: string,
    }[],
    stories: {
        title: string,
        content: string,
        tips: string[],
    }[],
    voiceovers: {
        title: string,
        type: string,
        content: string,
        tips: string[],
    }[],
    images: {
        title: string,
        image: string,
        description: string | null,
    }[],
};