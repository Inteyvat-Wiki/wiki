<template>
    <readable-content :readable="readable" />
</template>

<script setup lang="ts">
import type { Readable } from '~/types/readable';

const readable = ref<Readable>();

onMounted(async () => {
    readable.value = await get_readable(useRoute().params.name as string);
});

useHead({
    title: computed(() => readable.value?.name || $t('normal.loading')),
});
</script>
