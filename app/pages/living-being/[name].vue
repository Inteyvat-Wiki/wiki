<template>
    <el-container v-if="living_being">
        <el-main>
            <div v-for="item in living_being" :id="item.name" :key="item.name" style="margin-bottom: 20px;">
                <div id="basic-info">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="16">
                            <el-card>
                                <el-descriptions border :column="1">
                                    <template #title>
                                        <title-with-icon :title="item.name" :icon="item.icon" />
                                    </template>
                                    <el-descriptions-item v-if="item.type" :label="$t('living-being.type')"
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
                    <el-anchor-link v-for="item in living_being" :href="`#${item.name}`" :key="item.name">
                        {{ item.name }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { LivingBeing } from '~/types/living_being';

const living_being = ref<LivingBeing>();

onMounted(async () => {
    living_being.value = await get_living_being(useRoute().params.name as string);
});

useHead({
    title: computed(() => living_being.value
        ? ((living_being.value[living_being.value.length - 1] as any).name + (living_being.value.length > 1 ? ` (+${living_being.value.length - 1})` : ''))
        : $t('normal.loading')),
})
</script>