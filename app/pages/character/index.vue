<template>
    <el-container v-if="characters">
        <el-main>
            <el-row :gutter="50" style="width: 100%; row-gap: 50px;">
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="character in show_character_list" :key="character.id">
                    <NuxtLink :to="`/character/${character.id}`" style="text-decoration: none;">
                        <el-card shadow="hover" :style="`border: 1px solid var(--star-${character.star}-color-half);`">
                            <avatar-display-card :title="character.name" :icon="character.icon"
                                :left_subicon="`/images/mess/${character.element}.png`"
                                :right_subicon="`/images/mess/${character.weapon}.png`" />
                        </el-card>
                    </NuxtLink>
                </el-col>
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="i in 24" :key="i" style="height: 0px;">
                </el-col>
            </el-row>
        </el-main>
        <el-aside width="100px" style="overflow-x: hidden;">
            <el-affix :offset="30">
                <el-checkbox-group v-model="selected_elements">
                    <el-checkbox v-for="element in element_list" :value="element" :key="element" border
                        style="height: 50px; margin-top: 10px;">
                        <div class="round_icon">
                            <el-image :src="`/images/mess/${element}.png`" style="width: 40px; height: 40px;" />
                        </div>
                    </el-checkbox>
                </el-checkbox-group>
                <el-checkbox-group v-model="selected_weapons" style="margin-top: 50px;">
                    <el-checkbox v-for="weapon in weapon_list" :value="weapon" :key="weapon" border
                        style="height: 50px; margin-top: 10px;">
                        <div class="round_icon">
                            <el-image :src="`/images/mess/${weapon}.png`" style="width: 40px; height: 40px;" />
                        </div>
                    </el-checkbox>
                </el-checkbox-group>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Characters } from '~/types/characters';

const characters = ref<Characters>();

onMounted(async () => {
    characters.value = await getCharacters();
});

const show_character_list = computed(() => {
    if (!characters.value) return [];
    return characters.value.filter((character) => {
        if (selected_elements.value.length > 0 && !selected_elements.value.includes(character.element)) {
            return false;
        }
        if (selected_weapons.value.length > 0 && !selected_weapons.value.includes(character.weapon)) {
            return false;
        }
        return true;
    }).reverse();
});

const element_list = ['pyro', 'hydro', 'anemo', 'electro', 'dendro', 'cryo', 'geo'];
const weapon_list = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'];
const selected_elements = ref<string[]>([]);
const selected_weapons = ref<string[]>([]);

</script>