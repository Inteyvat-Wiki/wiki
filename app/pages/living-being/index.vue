<template>
    <el-container v-if="living_beings">
        <el-main>
            <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                <el-col :xs="8" :sm="8" :md="6" :lg="3" v-for="living_being in show_living_being_list"
                    :key="living_being.id">
                    <NuxtLink :to="`/living-being/${living_being.id}`" style="text-decoration: none;">
                        <avatar-display-card :title="living_being.name" :icon="living_being.icon" font_size="1.0em">
                            <template #left_top v-if="living_being.count > 1">
                                <el-tag type="primary" size="small" style="margin-top: -25px; margin-left: -10px;">{{
                                    `+${living_being.count - 1}`
                                    }}</el-tag>
                            </template>
                        </avatar-display-card>
                    </NuxtLink>
                </el-col>
                <el-col :xs="8" :sm="8" :md="6" :lg="3" v-for="i in 24" :key="i" style="height: 0px;">
                </el-col>
            </el-row>
        </el-main>
        <el-aside width="150px" style="overflow-x: hidden;">
            <el-affix :offset="30">
                <el-radio-group v-model="selected_types">
                    <el-radio v-for="type in type_list" :value="type" :key="type" border
                        style="height: 45px; margin-top: 5px; width: 100%;">
                        {{ $t(`living-being.${type}`) }}
                    </el-radio>
                    <div></div>
                </el-radio-group>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { LivingBeings } from '~/types/living_beings';

const living_beings = ref<LivingBeings>();

const show_living_being_list = computed(() => {
    if (!living_beings.value) return [];
    return living_beings.value.filter((living_being) => {
        if (selected_types.value && selected_types.value !== living_being.type) {
            return false;
        }
        return true;
    });
});

const type_list = [
    'enemy_elemental', 'enemy_hilichurl', 'enemy_abyss', 'enemy_fatui', 'enemy_automaton', 'enemy_human', 'enemy_others', 'enemy_boss',
    'animal_bird', 'animal_beast', 'animal_fish', 'animal_others'
];
const selected_types = ref<string>('living_being');
const type_icon = ref<Record<string, string>>({});

onMounted(async () => {
    living_beings.value = await get_living_beings();

    for (let i of living_beings.value) {
        if (!type_icon.value[i.type]) {
            type_icon.value[i.type] = i.icon;
        }
    }
});

onMounted(() => {
    selected_types.value = localStorage.getItem('living_being_selected_types') || 'enemy_elemental';
});

watch(selected_types, (newType) => {
    localStorage.setItem('living_being_selected_types', newType);
});

useHead({
    title: $t('menu.living-being'),
})
</script>