<template>
    <item-common :item="material" />
</template>

<script setup lang="ts">
import type { Material } from '~/types/material';

const material = ref<Material>();

onMounted(async () => {
    material.value = await get_material(useRoute().params.name as string);
});

useHead({
    title: computed(() => material.value
        ? ((material.value[material.value.length - 1] as any).name + (material.value.length > 1 ? ` (+${material.value.length - 1})` : ''))
        : $t('normal.loading')),
})
</script>