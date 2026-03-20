<template>
    <el-container v-if="weapon">
        <el-main>
            <div id="basic-info">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <weapon-basic-info-card :weapon="weapon" />
                        </el-card>
                    </el-col>
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <weapon-splash-card :weapon="weapon" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div v-if="weapon.effect" id="effect" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <weapon-effect-card :effect="weapon.effect" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div id="story" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <weapon-story-card :story="weapon.story" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div v-if="weapon.refine_material" id="refine_material" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24" :lg="16">
                        <el-card>
                            <el-descriptions border :column="1">
                                <template #title>
                                    <title-with-icon :title="weapon.refine_material.name"
                                        :icon="weapon.refine_material.icon" />
                                </template>
                                <el-descriptions-item :label="$t('weapon.refine_material_description')"
                                    :min-width="'100px'">
                                    <div v-html="weapon.refine_material.description"></div>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-card>
                    </el-col>
                    <el-col :span="24" :lg="8">
                        <el-card>
                            <div style="display: flex; justify-content: center; align-items: center;">
                                <el-image :src="weapon.refine_material.icon"
                                    :preview-src-list="[weapon.refine_material.icon]" hide-on-click-modal
                                    style="width: 100%; height: auto; display: block; object-fit: contain; max-width: 150px; " />
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
            </div>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60">
                <el-anchor :offset="70">
                    <el-anchor-link :href="`#basic-info`">
                        {{ $t('weapon.basic-info') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#effect`">
                        {{ $t('weapon.effect') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#story`">
                        {{ $t('weapon.story') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#refine_material`">
                        {{ $t('weapon.refine_material') }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Weapon } from '~/types/weapon';

const weapon = ref<Weapon>();

onMounted(async () => {
    weapon.value = await getWeapon(useRoute().params.name as string);
});

useHead({
    title: computed(() => weapon.value ? weapon.value.name : $t('normal.loading')),
})
</script>