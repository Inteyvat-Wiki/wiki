<template>
    <el-container v-if="material">
        <el-main>
            <div v-for="item in material" :id="item.name" :key="item.name" style="margin-bottom: 20px;">
                <div id="basic-info">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="16">
                            <el-card>
                                <el-descriptions border :column="1">
                                    <template #title>
                                        <title-with-icon :title="item.name" :icon="item.icon" />
                                    </template>
                                    <el-descriptions-item v-if="item.star" :label="$t('material.star')"
                                        :min-width="'100px'">
                                        <el-icon v-for="i in item.star" :key="i" style="color: #f7ba2a">
                                            <StarFilled />
                                        </el-icon>
                                    </el-descriptions-item>
                                    <el-descriptions-item v-if="item.type" :label="$t('material.type')"
                                        :min-width="'100px'">
                                        {{ item.type }}
                                    </el-descriptions-item>
                                    <el-descriptions-item v-for="info in item.info" :key="info.title"
                                        :label="info.title" :min-width="'100px'">
                                        <div v-html="info.description"></div>
                                    </el-descriptions-item>
                                </el-descriptions>
                            </el-card>
                        </el-col>
                        <el-col :span="24" :lg="8">
                            <el-card>
                                <div style="display: flex; justify-content: center; align-items: center;">
                                    <el-image :src="item.icon" :preview-src-list="[item.icon]" hide-on-click-modal
                                        style="width: 100%; height: auto; display: block; object-fit: contain; max-width: 150px; " />
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div v-if="item.effect" id="effect" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24">
                            <el-card>
                                <div class="el-descriptions" v-html="item.effect"></div>
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div v-if="item.description_full" id="description_full" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24">
                            <el-card>
                                <normal-text :text="item.description_full" :border="true" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
            </div>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60">
                <el-anchor :offset="70">
                    <el-anchor-link v-for="item in material" :href="`#${item.name}`" :key="item.name">
                        {{ item.name }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Material } from '~/types/material';
import { StarFilled } from '@element-plus/icons-vue';

const material = ref<Material>();

onMounted(async () => {
    material.value = await get_material(useRoute().params.name as string);
});
    
useHead({
    title: computed(() => material.value
        ? ((material.value[material.value.length - 1] as any).name + (material.value.length > 1 ? ` (+${material.value.length - 1})` : ''))
        : $t('normal.loading')),
})
</script>