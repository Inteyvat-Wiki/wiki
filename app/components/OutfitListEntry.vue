<template>
    <NuxtLink :to="localePath(`/outfit/${item.id}`)" class="outfit-entry" :class="`entry-${item.type}`">
        <el-card shadow="hover">
            <el-image v-if="item.icon && !image_failed" :src="item.icon" :alt="name" fit="contain" loading="lazy"
                class="entry-image" @error="image_failed = true" />
            <div class="entry-content">
                <h3><inline-text :text="item.name" /></h3>
                <div v-if="item.description" class="entry-summary"><inline-text :text="item.description" /></div>
            </div>
        </el-card>
    </NuxtLink>
</template>

<script setup lang="ts">
import type { OutfitPage } from '@inteyvat-wiki/wiki-contracts/outfit';
import { entry_plain_text } from '~~/shared/archive_display';
const props = defineProps<{ item: OutfitPage }>();
const localePath = useLocalePath();
const name = computed(() => entry_plain_text(props.item.name));
const image_failed = ref(false);
watch(() => props.item.icon, () => { image_failed.value = false; });
</script>

<style scoped>
.outfit-entry { display: block; min-width: 0; color: inherit; text-decoration: none; }
.outfit-entry :deep(.el-card) { height: 100%; box-sizing: border-box; }
.outfit-entry :deep(.el-card__body) { padding: 16px; }
.entry-image { display: block; width: 100%; margin: 0 auto 12px; background: var(--el-fill-color-extra-light); border-radius: 4px; }
.entry-character .entry-image { width: min(100%, 112px); aspect-ratio: 1; max-height: 112px; }
.entry-glider .entry-image { aspect-ratio: 2 / 1; max-height: 220px; }
.entry-weapon :deep(.el-card__body) { display: flex; gap: 12px; align-items: start; }
.entry-weapon .entry-image { width: 80px; height: 100px; flex: 0 0 80px; margin: 0; }
.entry-content { min-width: 0; }
h3 { margin: 0; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; }
.entry-summary { margin-top: 6px; font-size: 14px; line-height: 1.6; color: var(--el-text-color-regular);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.outfit-entry:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 4px; border-radius: var(--el-border-radius-base); }
</style>
