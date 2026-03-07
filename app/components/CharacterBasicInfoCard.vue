<template>
    <el-descriptions border :column="1">
        <template #title>
            <title-with-icon :title="character.name" :icon="character.icon" />
        </template>
        <el-descriptions-item :label="$t('character.element')" :min-width="'100px'">
            {{ $t(`common.${character.element}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('character.weapon')" :min-width="'100px'">
            {{ $t(`common.${character.weapon}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('character.star')" :min-width="'100px'">
            <el-rate v-model="character.star" disabled :disabled-void-icon="'null'" />
        </el-descriptions-item>
        <el-descriptions-item v-for="item in character.info" :key="item.title" :label="item.title" :min-width="'100px'">
            {{ item.description }}
        </el-descriptions-item>
    </el-descriptions>
    <div style="margin-top: 15px; display: flex; justify-content: center;">
        <div>
            <el-button :icon="ElIconMinus" circle
                @click="() => { character_ascension = Math.max(0, character_ascension - 1); }" />
            <el-rate v-model="character_ascension" :max="7" style="margin-left: 5px; margin-right: 5px;"
                size="large" :icons="[Sparkle, Sparkle, Sparkle]"
                :colors="{6: '#73767a', 7: '#7700ff'}" :void-icon="Sparkle" />
            <el-button :icon="ElIconPlus" circle
                @click="() => { character_ascension = Math.min(7, character_ascension + 1); }" />
            <el-input-number v-model="character_level" :min="character_ascension_list[character_ascension]?.min"
                :max="character_ascension_list[character_ascension]?.max"
                :step="character_ascension_list[character_ascension]?.step"
                style="margin-left: 20px;"/>
        </div>
    </div>
    <el-descriptions border :column="character.stats.substats.length + 3" style="margin-top: 20px;" direction="vertical" label-width="1000px">
        <el-descriptions-item :label="$t('character.hp')">
            {{ character.stats.hp[character_ascension]?.[character_level] }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('character.atk')">
            {{ character.stats.atk[character_ascension]?.[character_level] }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('character.def')">
            {{ character.stats.def[character_ascension]?.[character_level] }}
        </el-descriptions-item>
        <el-descriptions-item v-for="item in character.stats.substats" :key="item.name" :label="item.name">
            {{ item.value[character_ascension] }}
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
import type { Character } from '~/types/character';
import Sparkle from '~/assets/icons/sparkle.svg';

const props = defineProps<{
    character: Character;
}>();

const character_ascension = ref(6);
const character_level = ref(90);

const character_ascension_list: { min: number; max: number; step: number }[] = [
    { min: 1, max: 20, step: 1 },
    { min: 20, max: 40, step: 1 },
    { min: 40, max: 50, step: 1 },
    { min: 50, max: 60, step: 1 },
    { min: 60, max: 70, step: 1 },
    { min: 70, max: 80, step: 1 },
    { min: 80, max: 90, step: 1 },
    { min: 90, max: 100, step: 5 },
];

watch(character_ascension, () => {
    character_level.value = character_ascension_list[character_ascension.value]?.max || 0;
});
</script>