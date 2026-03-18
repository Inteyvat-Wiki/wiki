<template>
    <el-descriptions border :column="1">
        <template #title>
            <title-with-icon :title="artifact.name" :icon="artifact.icon"/>
        </template>
        <el-descriptions-item :label="$t('artifact.star')" :min-width="'100px'">
            <div v-for="star in artifact.stars" :key="star">
                <el-icon v-for="i in star" :key="i" style="color: #f7ba2a">
                    <StarFilled />
                </el-icon>
                <br>
            </div>
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
import type { Artifact } from '~/types/artifact';
import { StarFilled } from '@element-plus/icons-vue';

const props = defineProps<{
    artifact: Artifact;
}>();
</script>