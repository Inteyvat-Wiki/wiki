<template>
    <item-common :item="book" />
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { Book } from '~/types/book';

const book = ref<Book[]>();
const page_name = ref('');

onMounted(async () => {
    const { page, items } = await get_page_data(
        useRoute().params.name as string, get_books, get_book,
    );
    book.value = items;
    page_name.value = page.name;
});

useHead({
    title: computed(() => page_name.value || $t('normal.loading')),
});
</script>
