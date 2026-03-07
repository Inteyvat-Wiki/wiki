<template>
    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">{{ image.title }}</div>
    <el-image :src="image.image" :preview-src-list="[image.image]" style="margin-top: 10px;" />
    <div v-if="image.description" v-html="image.description" style="margin-top: 8px;;"></div>
</template>

<script setup lang="ts">
const props = defineProps<{
    image: {
        title: string,
        image: string,
        description: string | null,
    }
}>();
</script>