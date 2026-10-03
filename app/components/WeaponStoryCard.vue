<template>
    <template v-for="(text, index) in story" :key="index">
        <normal-text :text="text" :border="true" />
        <hr v-if="index < story.length - 1" class="content-separator" />
    </template>
</template>

<script setup lang="ts">
const props = defineProps<{
    story: string[],
}>();
</script>

<style lang="css" scoped>
.content-separator {
    border: 0;
    border-top: 1px solid var(--el-border-color-light);
    margin: 20px 0;
}
</style>
