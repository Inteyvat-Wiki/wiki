<template>
    <el-container v-if="weapons">
        <el-main>
            <el-row :gutter="20" style="width: 100%; row-gap: 50px;">
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="weapon in show_character_list" :key="weapon.id">
                    <NuxtLink :to="`/weapon/${weapon.id}`" style="text-decoration: none;">
                        <el-card shadow="hover" :style="{ border: `1px solid var(--star-${weapon.star}-color-half)` }">
                            <avatar-display-card :title="weapon.name" :icon="weapon.icon"
                                :left_top_subicon="`/images/mess/${weapon.type}.png`" />
                        </el-card>
                    </NuxtLink>
                </el-col>
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="i in 24" :key="i" style="height: 0px;">
                </el-col>
            </el-row>
        </el-main>
        <el-aside width="100px" style="overflow-x: hidden;">
            <el-affix :offset="30">
                <el-checkbox-group v-model="selected_types">
                    <el-checkbox v-for="type in type_list" :value="type" :key="type" border
                        style="height: 50px; margin-top: 10px;">
                        <div class="round_icon">
                            <el-image :src="`/images/mess/${type}.png`" style="width: 40px; height: 40px;" />
                        </div>
                    </el-checkbox>
                </el-checkbox-group>
                <el-checkbox-group v-model="selected_stars" style="margin-top: 50px;">
                    <el-checkbox v-for="star in star_list" :value="star" :key="star" border
                        style="height: 50px; margin-top: 10px;">
                        <el-icon v-for="i in star" :key="i" :style="{ color: `var(--star-${star}-color)` }">
                            <StarFilled />
                        </el-icon>
                    </el-checkbox>
                </el-checkbox-group>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Weapons } from '~/types/weapons';
import { StarFilled } from '@element-plus/icons-vue';

const weapons = ref<Weapons>();

onMounted(async () => {
    weapons.value = await getWeapons();
});

const show_character_list = computed(() => {
    if (!weapons.value) return [];
    return weapons.value.filter((weapon) => {
        if (selected_types.value.length > 0 && !selected_types.value.includes(weapon.type)) {
            return false;
        }
        if (selected_stars.value.length > 0 && !selected_stars.value.includes(weapon.star)) {
            return false;
        }
        return true;
    }).reverse();
});

const type_list = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'];
const star_list = [5, 4, 3, 2, 1];
const selected_types = ref<string[]>([]);
const selected_stars = ref<number[]>([]);

</script>