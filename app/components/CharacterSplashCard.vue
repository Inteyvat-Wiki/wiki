<template>
    <el-image :src="character.splash" :preview-src-list="[character.splash]" hide-on-click-modal
        style="width: 100%; height: auto; display: block; object-fit: contain;" />
</template>

<script setup lang="ts">
import type { Character } from '~/types/character';

const props = defineProps<{
    character: Character;
}>();
</script>