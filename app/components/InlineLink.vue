<template>
    <NuxtLink v-if="map_target" :to="localePath(map_target)" custom v-slot="{ href, navigate }">
        <el-link :href="href ?? undefined" :underline="false" class="inline-link" @click="navigate">
            <slot>{{ $t('map.location') }}</slot>
        </el-link>
    </NuxtLink>
    <NuxtLink v-else-if="entry && info" :to="localePath(`${INLINE_LINK_CATEGORIES[entry.category].path}/${entry.id}`)" custom v-slot="{ href, navigate }">
        <el-link :href="href ?? undefined" :underline="false" class="inline-link" @click="navigate">
            <img v-if="entry.style === 'icon' && info.icon" :src="info.icon" alt="" />
            <slot><span v-html="info.name"></span></slot>
        </el-link>
    </NuxtLink>
    <span v-else><slot>{{ entry?.id }}</slot></span>
</template>

<script setup lang="ts">
import { INLINE_LINK_CATEGORIES, map_location_path } from '@inteyvat-wiki/wiki-contracts/inline_link';
import type { InlineLinkToken, InlineLinkInfo } from '@inteyvat-wiki/wiki-contracts/inline_link';

const props = defineProps<InlineLinkToken>();
const localePath = useLocalePath();
const entry = computed(() => props.category === 'map' ? null : props);
const map_target = computed(() => props.category === 'map' ? map_location_path(props) : null);
const info = ref<InlineLinkInfo>();
const { locale } = useI18n();
let request = 0;
watch(() => [entry.value?.category, entry.value?.id, locale.value], async () => {
    const current = ++request;
    info.value = undefined;
    const token = entry.value;
    if (!token) return;
    try {
        const data = await get_inline_link(token.category, token.id);
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
