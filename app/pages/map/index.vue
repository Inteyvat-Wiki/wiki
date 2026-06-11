<template>
    <div style="position: relative; height: 100%; width: 100%;">
        <world-map :region="region" :focused_layer_group_name="focused_layer_group_name"
            :focused_layer_name="focused_layer_name" :current_conditions="current_conditions"
            @update_center="center = $event"></world-map>
        <div style="position: absolute; left: 10px; bottom: 20px; z-index: 1000;">
            <el-button @click="show_settings = !show_settings">{{ $t('map.settings') }}</el-button>
            <transition name="el-fade-in-linear">
                <el-select v-show="show_layer_select" v-model="focused_layer_name" :placeholder="$t(`map.${region}`)"
                    style="margin-left: 10px; width: 300px;">
                    <el-option v-for="layer in focused_layer_group" :key="layer.name" :value="layer.name">
                        <span style="float: left">{{ layer.name == '' ? $t(`map.${region}`) : layer.name }}</span>
                        <el-popover v-if="layer.name_old" placement="right" width="auto">
                            <template #reference>
                                <el-icon size="80%" style="margin-left: 2.5px;">
                                    <InfoFilled />
                                </el-icon>
                            </template>
                            <span style="white-space: nowrap;">{{ layer.name_old }}</span>
                        </el-popover>
                    </el-option>
                </el-select>
            </transition>
        </div>
    </div>
    <el-drawer v-model="show_settings" :size="'20%'" :with-header="false">
        <el-container style="padding: 0px; height: 100%;">
            <el-main style="padding: 0px">
                <div style="display: flex; flex-direction: column;">
                    <el-radio-group v-model="region">
                        <el-radio v-for="(map, map_name) in map_list" :key="map_name" :label="$t(`map.${map_name}`)"
                            :value="map_name" style="width: 100%;" />
                    </el-radio-group>
                    <el-button @click="show_conditions = !show_conditions, show_settings = false"
                        style="margin-top: 50px;">{{
                            $t('map.map_condition')
                        }}</el-button>
                </div>
            </el-main>
            <el-footer>
                <el-text type="danger">{{ $t('map.warn') }}</el-text>
            </el-footer>
        </el-container>
    </el-drawer>
    <el-drawer v-model="show_conditions" direction="ltr" :with-header="false" :z-index="1001" :resizable="true">
        <el-scrollbar style="height: 100%;">
            <map-condition-selector v-model="current_conditions"></map-condition-selector>
        </el-scrollbar>
    </el-drawer>
</template>

<script setup lang="ts">
import type { MapList } from '~/types/map';
import { InfoFilled } from '@element-plus/icons-vue';

const map_list = ref<MapList>();

const region = ref('teyvat');
const current_conditions = ref<Record<string, string> | null>(null);

onMounted(async () => {
    map_list.value = await get_map_list();
    current_conditions.value = await get_default_map_conditions();
});

const show_settings = ref(false);
const show_conditions = ref(false);

const center = ref<{ x: number, y: number } | null>(null);
const focused_layer_group_name = ref<string | null>(null);
const focused_layer_group = computed(() => {
    if (!focused_layer_group_name.value) return [];
    let group = map_list.value?.[region.value]?.[focused_layer_group_name.value]?.layers;
    group = group?.concat({ name: "", name_old: null, floor: 0 });
    return group?.sort((a, b) => b.floor - a.floor);
});
const focused_layer_name = ref<string>("");

watchEffect(() => {
    if (!map_list.value || !region.value || !center.value) {
        focused_layer_group_name.value = null;
        focused_layer_name.value = "";
        return;
    }

    let new_focused_layer_group: string | null = null, dis = Infinity;
    for (const group_name in map_list.value[region.value]) {
        let group_dis = calc_distance(center.value, map_list.value[region.value]?.[group_name]?.coordinate);
        if (group_dis < 1024 && group_dis < dis) {
            dis = group_dis;
            new_focused_layer_group = group_name;
        }
    }

    if (focused_layer_group_name.value != new_focused_layer_group) {
        focused_layer_group_name.value = new_focused_layer_group;
        focused_layer_name.value = "";
    }
});

const show_layer_select = ref(false);
watch(() => focused_layer_group_name.value, () => {
    show_layer_select.value = false;
    if (focused_layer_group_name.value) {
        setTimeout(() => {
            show_layer_select.value = true;
        }, 200);
    }
});

</script>