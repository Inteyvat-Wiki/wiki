<template>
    <el-container v-if="geography">
        <el-main>
            <div id="basic-info">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <el-descriptions border :column="1">
                                <template #title>
                                    <title-with-icon :title="geography.name" />
                                </template>
                                <el-descriptions-item :label="$t('geography.type')"
                                    :min-width="'100px'">
                                    {{ $t(`geography.${geography.type}`) }}
                                </el-descriptions-item>
                                <el-descriptions-item :label="$t('geography.area')"
                                    :min-width="'100px'">
                                    {{ $t(`geography.${geography.area}`) }}
                                </el-descriptions-item>
                                <el-descriptions-item :label="$t('geography.description')">
                                    <div v-html="geography.description"></div>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-card>
                    </el-col>
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <div style="display: flex; justify-content: center; align-items: center;">
                                <el-image :src="geography.image" :preview-src-list="[geography.image]"
                                    hide-on-click-modal
                                    style="width: 100%; height: auto; display: block; object-fit: contain;" />
                            </div>
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div v-if="geography.tabs.length > 0" id="tabs" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <el-descriptions border :column="1">
                                <el-descriptions-item v-for="tab in geography.tabs" :key="tab.name" :label="tab.name">
                                    <div v-html="tab.description"></div>
                                </el-descriptions-item>
                            </el-descriptions>
                        </el-card>
                    </el-col>
                </el-row>
            </div>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60">
                <el-anchor :offset="70">
                    <el-anchor-link :href="'#basic-info'">
                        {{ $t('geography.basic-info') }}
                    </el-anchor-link>
                    <el-anchor-link v-if="geography.tabs" :href="'#tabs'">
                        {{ $t('geography.tabs') }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Geography } from '~/types/geography';

const geography = ref<Geography>();

onMounted(async () => {
    geography.value = await get_geography(useRoute().params.name as string);
});

useHead({
    title: computed(() => geography.value ? geography.value.name : $t('normal.loading')),
})
</script>