<template>
    <item-common :item="living_being" />
</template>

<script setup lang="ts">
import type { LivingBeing } from '~/types/living_being';

const living_being = ref<LivingBeing>();

onMounted(async () => {
    living_being.value = await get_living_being(useRoute().params.name as string);
});

useHead({
    title: computed(() => living_being.value
        ? ((living_being.value[living_being.value.length - 1] as any).name + (living_being.value.length > 1 ? ` (+${living_being.value.length - 1})` : ''))
        : $t('normal.loading')),
})
</script>