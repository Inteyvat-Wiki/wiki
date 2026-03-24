<template>
    <el-container v-if="materials">
        <el-main>
            <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                <el-col :xs="8" :sm="8" :md="6" :lg="3" v-for="material in show_material_list" :key="material.id">
                    <NuxtLink :to="`/material/${material.id}`" style="text-decoration: none;">
                        <avatar-display-card :title="material.name" :icon="material.icon" font_size="1.0em">
                            <template #left_top v-if="material.count > 1">
                                <el-tag type="primary" size="small" style="margin-top: -25px; margin-left: -10px;">{{
                                    `+${material.count - 1}`
                                }}</el-tag>
                            </template>
                        </avatar-display-card>
                    </NuxtLink>
                </el-col>
                <el-col :xs="8" :sm="8" :md="6" :lg="3" v-for="i in 24" :key="i" style="height: 0px;">
                </el-col>
            </el-row>
        </el-main>
        <el-aside width="100px" style="overflow-x: hidden;">
            <el-affix :offset="30">
                <el-radio-group v-model="selected_type">
                    <el-radio v-for="type in type_list" :value="type" :key="type" border
                        style="height: 45px; margin-top: 5px; width: 100%;">
                        <div class="round_icon">
                            <el-image :src="type_icon[type]" style="width: 40px; height: 40px;" />
                        </div>
                    </el-radio>
                    <div></div>
                </el-radio-group>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Materials } from '~/types/material';

const materials = ref<Materials>();

const show_material_list = computed(() => {
    if (!materials.value) return [];
    return materials.value.filter((material) => {
        if (selected_type.value && selected_type.value !== material.type) {
            return false;
        }
        return true;
    });
});

const type_list = [
    'forge', 'material',
    'develop',
    'character_develop', 'character_ascension', 'character_talent',
    'talent_develop',
    'weapon_ascension',
    'precious', 'chest', 'gadget',
    'wood', 'fish', 'food',
];
const selected_type = ref<string>('material');
const type_icon = ref<Record<string, string>>({});

onMounted(async () => {
    materials.value = await get_materials();

    for (let i of materials.value || []) {
        if (!type_icon.value[i.type]) {
            type_icon.value[i.type] = i.icon;
        }
    }
});

onMounted(() => {
    selected_type.value = localStorage.getItem('material_selected_types') || 'material';
});

watch(selected_type, (newType) => {
    localStorage.setItem('material_selected_types', newType);
});

useHead({
    title: $t('menu.material'),
})
</script>