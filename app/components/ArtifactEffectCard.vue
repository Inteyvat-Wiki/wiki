<template>
    <el-descriptions :column="1" border>
        <el-descriptions-item v-if="effect['1-piece']" :label="$t('artifact.1-piece-effect')">
            <div v-html="effect['1-piece']"></div>
        </el-descriptions-item>
        <el-descriptions-item v-if="effect['2-piece']" :label="$t('artifact.2-piece-effect')">
            <div v-html="effect['2-piece']"></div>
        </el-descriptions-item>
        <el-descriptions-item v-if="effect['3-piece']" :label="$t('artifact.3-piece-effect')">
            <div v-html="effect['3-piece']"></div>
        </el-descriptions-item>
        <el-descriptions-item v-if="effect['4-piece']" :label="$t('artifact.4-piece-effect')">
            <div v-html="effect['4-piece']"></div>
        </el-descriptions-item>
        <el-descriptions-item v-if="effect['5-piece']" :label="$t('artifact.5-piece-effect')">
            <div v-html="effect['5-piece']"></div>
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
import type { Artifact } from '~/types/artifact';

const props = defineProps<{
    effect: Artifact['effect'],
}>();
</script>