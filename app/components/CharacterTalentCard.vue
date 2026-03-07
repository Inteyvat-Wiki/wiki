<template>
    <title-with-icon :title="talent.title" :icon="talent.icon" :need_background="true"
        style="transform-origin: left center; transform: scale(0.8); margin-top: -10px;" />
    <div v-if="talent.sub_title" style="font-size: 14px; color: var(--el-text-color-secondary);">
        {{ talent.sub_title }}
    </div>
    <br>
    <div v-html="talent.description"></div>
</template>

<script setup lang="ts">
const props = defineProps<{
    talent: {
        title: string,
        sub_title: string | null,
        icon: string | null,
        description: string,
    }
}>();
</script>