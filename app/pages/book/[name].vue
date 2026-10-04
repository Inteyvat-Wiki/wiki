<template>
    <item-common :item="book" />
</template>

<script setup lang="ts">
import type { Book } from '~/types/book';

const book = ref<Book>();

onMounted(async () => {
    book.value = await get_book(useRoute().params.name as string);
});

useHead({
    title: computed(() => book.value?.at(-1)?.name || $t('normal.loading')),
});
</script>
