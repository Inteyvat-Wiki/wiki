<template>
    <item-common :item="living_being" />
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { LivingBeing } from '~/types/living_being';

const living_being = ref<LivingBeing[]>();
const page_name = ref('');

onMounted(async () => {
    const { page, items } = await get_page_data(
        useRoute().params.name as string, get_living_beings, get_living_being,
    );
    living_being.value = items;
    page_name.value = page.name;
});

useHead({
    title: computed(() => page_name.value || $t('normal.loading')),
});
</script>
