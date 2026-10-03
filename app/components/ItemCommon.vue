<template>
    <el-container v-if="props.item" class="page-with-anchor">
        <el-main>
            <template v-for="{ item, anchorId } in anchorItems" :key="anchorId">
                <div style="margin-top: 20px; margin-bottom: 20px;">
                    <div :id="anchorId">
                        <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                            <el-col :span="24" :lg="16">
                                <el-card>
                                    <el-descriptions border :column="1">
                                        <template #title>
                                            <title-with-icon :title="item.name" :icon="item.icon" />
                                        </template>
                                        <el-descriptions-item v-if="item.star" :label="$t('item.star')"
                                            :min-width="'100px'">
                                            <el-icon v-for="i in item.star" :key="i" style="color: #f7ba2a">
                                                <StarFilled />
                                            </el-icon>
                                        </el-descriptions-item>
                                        <template v-for="info in item.info">
                                            <el-descriptions-item v-if="info.type == 'description'" :label="info.title"
                                                :min-width="'100px'">
                                                <inline-text :text="info.description" />
                                            </el-descriptions-item>
                                        </template>
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
                    <template v-for="info in item.info">
                        <div v-if="info.type == 'normal'" style="margin-top: 20px;">
                            <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                                <el-col :span="24">
                                    <el-card>
                                        <template #header v-if="info.title">
                                            <span>{{ info.title }}</span>
                                        </template>
                                        <div class="el-descriptions"><inline-text :text="info.description" /></div>
                                    </el-card>
                                </el-col>
                            </el-row>
                        </div>
                        <div v-if="info.type == 'text'" style="margin-top: 20px;">
                            <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                                <el-col :span="24">
                                    <el-card>
                                        <template #header v-if="info.title">
                                            <span>{{ info.title }}</span>
                                        </template>
                                        <normal-text :text="info.description" :border="true" />
                                    </el-card>
                                </el-col>
                            </el-row>
                        </div>
                        <div v-if="info.type == 'text-list'" style="margin-top: 20px;">
                            <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                                <el-col :span="24">
                                    <el-card>
                                        <template #header v-if="info.title">
                                            <span>{{ info.title }}</span>
                                        </template>
                                        <template v-for="(description, index) in info.description" :key="index">
                                            <normal-text :text="description" :border="true" />
                                            <hr v-if="index < info.description.length - 1" class="content-separator" />
                                        </template>
                                    </el-card>
                                </el-col>
                            </el-row>
                        </div>
                    </template>
                </div>
            </template>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60" :z-index="0">
                <el-anchor :offset="70" container=".page-scrollbar .el-scrollbar__wrap">
                    <el-anchor-link v-for="{ item, anchorId } in anchorItems" :href="`#${anchorId}`" :key="anchorId">
                        {{ item.name }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts" generic="ItemTypes extends string | null">
import type { ItemCommon } from '~/types/common';
import { StarFilled } from '@element-plus/icons-vue';

const props = defineProps<{
    item: ItemCommon<ItemTypes> | ItemCommon<ItemTypes>[] | undefined;
}>();

const items = computed(() => {
    if (!props.item) {
        return [];
    } else if (Array.isArray(props.item)) {
        return props.item;
    } else {
        return [props.item];
    }
});

const anchorItems = computed(() => items.value.map((item, index) => ({
    item,
    anchorId: getAnchorId(item.name, index),
})));

function getAnchorId(name: string, index: number) {
    const slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '');

    return slug ? `item-${index}-${slug}` : `item-${index}`;
}
</script>

<style scoped>
.content-separator {
    border: 0;
    border-top: 1px solid var(--el-border-color-light);
    margin: 20px 0;
}
</style>
