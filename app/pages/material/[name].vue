<template>
    <item-common :item="material" />
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type { Material } from '~/types/material';

const material = ref<Material[]>();
const page_name = ref('');

onMounted(async () => {
    const { page, items } = await get_page_data(
        useRoute().params.name as string, get_materials, get_material,
    );
    material.value = items;
    page_name.value = page.name;
});

useHead({
    title: computed(() => page_name.value || $t('normal.loading')),
});
</script>
