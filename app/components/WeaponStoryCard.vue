<template>
    <normal-text :text="story" :border="true" />
</template>

<script setup lang="ts">
const props = defineProps<{
    story: string,
}>();
</script>