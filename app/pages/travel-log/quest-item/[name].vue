<template>
    <item-common :item="quest_item" />
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { QuestItem } from '~/types/quest_item';

const quest_item = ref<QuestItem[]>();
const page_name = ref('');

onMounted(async () => {
    const { page, items } = await get_page_data(
        useRoute().params.name as string, get_quest_items, get_quest_item,
    );
    quest_item.value = items;
    page_name.value = page.name;
});

useHead({
    title: computed(() => page_name.value || $t('normal.loading')),
});
</script>
