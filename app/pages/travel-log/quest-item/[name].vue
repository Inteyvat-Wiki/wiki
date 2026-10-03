<template>
    <item-common :item="quest_item" />
</template>

<script setup lang="ts">
import type { QuestItem } from '~/types/quest_item';

const quest_item = ref<QuestItem>();

onMounted(async () => {
    quest_item.value = await get_quest_item(useRoute().params.name as string);
});

useHead({
    title: computed(() => quest_item.value
        ? ((quest_item.value[quest_item.value.length - 1] as any).name + (quest_item.value.length > 1 ? ` (+${quest_item.value.length - 1})` : ''))
        : $t('normal.loading')),
})
</script>