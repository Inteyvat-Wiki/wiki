<template>
    <normal-text :text="story" />
</template>

<script setup lang="ts">
const props = defineProps<{
    story: string,
}>();
</script>