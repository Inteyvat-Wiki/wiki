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
</script>