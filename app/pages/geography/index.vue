<template>
    <el-container v-if="geographies">
        <el-main>
            <el-container>
                <el-header>
                    <el-tab>
                        <el-tabs v-model="selected_type">
                            <el-tab-pane v-for="type in type_list" :key="type" :label="$t(`geography.${type}`)"
                                :name="type">
                            </el-tab-pane>
                        </el-tabs>
                    </el-tab>
                </el-header>
                <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                    <el-col :xs="12" :sm="12" :md="8" :lg="8" v-for="geography in show_geography_list"
                        :key="geography.id">
                        <NuxtLink :to="`/geography/${geography.id}`" style="text-decoration: none;">
                            <avatar-display-card :title="geography.name" :icon="geography.image" font_size="1.0em">
                            </avatar-display-card>
                        </NuxtLink>
                    </el-col>
                    <el-col :xs="12" :sm="12" :md="8" :lg="8" v-for="i in 24" :key="i" style="height: 0px;">
                    </el-col>
                </el-row>
            </el-container>
        </el-main>
        <el-aside width="100px" style="overflow-x: hidden;">
            <el-affix :offset="60">
                <el-checkbox-group v-model="selected_areas">
                    <el-checkbox v-for="area in area_list" :value="area" :key="area" border
                        style="height: 50px; margin-top: 10px; width: 100%;">
                        {{ $t(`geography.${area}`) }}
                    </el-checkbox>
                    <div></div>
                </el-checkbox-group>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Geographies } from '~/types/geography';

const geographies = ref<Geographies>();

const show_geography_list = computed(() => {
    if (!geographies.value) return [];
    return geographies.value.filter((geography) => {
        if (selected_type.value && selected_type.value !== geography.type) {
            return false;
        }
        if (selected_areas.value.length > 0 && !selected_areas.value.includes(geography.area)) {
            return false;
        }
        return true;
    });
});

const type_list = ['viewpoint', 'dungeon'];
const area_list = ['mondstadt', 'liyue', 'inazuma', 'sumeru', 'fontaine', 'natlan', 'nod-krai'];
const selected_type = ref<string>('viewpoint');
const selected_areas = ref<string[]>([]);

onMounted(async () => {
    geographies.value = await get_geographies();
});

onMounted(() => {
    selected_type.value = localStorage.getItem('geography_selected_types') || 'viewpoint';
});

watch(selected_type, (newType) => {
    localStorage.setItem('geography_selected_types', newType);
});

useHead({
    title: $t('menu.geography'),
})
</script>