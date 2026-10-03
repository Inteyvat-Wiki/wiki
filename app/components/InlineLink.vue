<template>
    <NuxtLink v-if="info" :to="localePath(`${config.path}/${props.id}`)" custom v-slot="{ href, navigate }">
        <el-link :href="href ?? undefined" :underline="false" class="inline-link" @click="navigate">
            <img v-if="props.style === 'icon' && info.icon" :src="info.icon" alt="" />
            <span v-html="info.name"></span>
        </el-link>
    </NuxtLink>
    <span v-else>{{ props.id }}</span>
</template>

<script setup lang="ts">
import { INLINE_LINK_CATEGORIES } from '~~/shared/inline_link';
import type { InlineLinkToken, InlineLinkInfo } from '~~/shared/inline_link';

const props = defineProps<InlineLinkToken>();
const localePath = useLocalePath();
const config = computed(() => INLINE_LINK_CATEGORIES[props.category]);
const info = ref<InlineLinkInfo>();
const { locale } = useI18n();
let request = 0;
watch(() => [props.category, props.id, locale.value], async () => {
    const current = ++request;
    info.value = undefined;
    try {
        const data = await get_inline_link(props.category, props.id);
        if (current === request) info.value = data;
    } catch {
        // Unavailable targets remain plain text rather than broken links.
    }
}, { immediate: true });
</script>

<style scoped>
.inline-link {
    font-size: inherit;
    vertical-align: baseline;
    border-radius: 4px;
}
.inline-link:hover {
    background-color: var(--el-fill-color-light);
}
.inline-link :deep(.el-link__inner) {
    gap: 4px;
}
.inline-link img {
    width: 1.4em;
    height: 1.4em;
    object-fit: contain;
}
</style>
