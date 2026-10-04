<template>
    <readable-content :readable="readable" />
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { Readable } from '~/types/readable';

const readable = ref<Readable>();

onMounted(async () => {
    const { items } = await get_page_data(useRoute().params.name as string, get_readables, get_readable);
    readable.value = items[0];
});

useHead({
    title: computed(() => readable.value?.name || $t('normal.loading')),
});
</script>
