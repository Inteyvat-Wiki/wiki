<template>
    <title-with-icon :title="artifact_item.name" :icon="artifact_item.icon" />
    <div v-html="artifact_item.description"></div>
    <normal-text :text="artifact_item.story" :border="true" />
</template>

<script setup lang="ts">
import type { ArtifactItem } from '~/types/artifact';

const props = defineProps<{
    artifact_item: ArtifactItem,
}>();
</script>