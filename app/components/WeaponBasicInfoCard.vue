<template>
    <el-descriptions border :column="1">
        <template #title>
            <title-with-icon :title="weapon.name" :icon="weapon.icon" />
        </template>
        <el-descriptions-item :label="$t('weapon.type')" :min-width="'100px'">
            {{ $t(`common.${weapon.type}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('weapon.star')" :min-width="'100px'">
            <el-icon v-for="i in weapon.star" :key="i" style="color: #f7ba2a">
                <StarFilled />
            </el-icon>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('weapon.description')" :min-width="'100px'">
            <div v-html="weapon.description"></div>
        </el-descriptions-item>
    </el-descriptions>
    <div style="margin-top: 15px; display: flex; justify-content: center;">
        <div>
            <el-button :icon="ElIconMinus" circle
                @click="() => { weapon_ascension = Math.max(0, weapon_ascension - 1); }" />
            <el-rate v-model="weapon_ascension" :max="weapon_max_acsension[weapon.star]"
                style="margin-left: 5px; margin-right: 5px;" size="large" :icons="[Sparkle, Sparkle, Sparkle]"
                :colors="['#73767a', '#73767a', '#73767a']" :void-icon="Sparkle" />
            <el-button :icon="ElIconPlus" circle
                @click="() => { weapon_ascension = Math.min(weapon_max_acsension[weapon.star], weapon_ascension + 1); }" />
            <el-input-number v-model="weapon_level" :min="weapon_ascension_list[weapon_ascension]?.min"
                :max="weapon_ascension_list[weapon_ascension]?.max"
                :step="weapon_ascension_list[weapon_ascension]?.step" style="margin-left: 20px;" />
        </div>
    </div>
    <el-descriptions border :column="2" style="margin-top: 20px;" direction="vertical" label-width="1000px">
        <el-descriptions-item :label="$t('weapon.base')">
            {{ weapon.stats.base[weapon_ascension]?.[weapon_level] }}
        </el-descriptions-item>
        <el-descriptions-item :label="weapon.stats.substats_name">
            {{ weapon.stats.substats[weapon_ascension]?.[weapon_level] }}
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
import type { Weapon } from '~/types/weapon';
import Sparkle from '~/assets/icons/sparkle.svg';
import { StarFilled } from '@element-plus/icons-vue';

const props = defineProps<{
    weapon: Weapon;
}>();

const weapon_ascension = ref(6);
const weapon_level = ref(90);

const weapon_max_acsension = {
    1: 4,
    2: 4,
    3: 6,
    4: 6,
    5: 6,
}
const weapon_ascension_list: { min: number; max: number; step: number }[] = [
    { min: 1, max: 20, step: 1 },
    { min: 20, max: 40, step: 1 },
    { min: 40, max: 50, step: 1 },
    { min: 50, max: 60, step: 1 },
    { min: 60, max: 70, step: 1 },
    { min: 70, max: 80, step: 1 },
    { min: 80, max: 90, step: 1 },
];

watch(weapon_ascension, () => {
    weapon_level.value = weapon_ascension_list[weapon_ascension.value]?.max || 0;
});
</script>