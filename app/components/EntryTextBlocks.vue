<template>
    <el-card v-for="(block, index) in blocks" :key="index" class="entry-text-block">
        <template v-if="block.title || block.kind" #header>
            <inline-text v-if="block.title" :text="block.title" />
            <span v-else>{{ sectionLabel(block.kind) }}</span>
        </template>
        <normal-text v-for="(section, section_index) in block.sections" :key="section_index" :text="section.text" :border="true" />
    </el-card>
</template>

<script setup lang="ts">
import type { EntryTextBlock } from '~~/shared/archive_display';
defineProps<{ blocks: EntryTextBlock[]; sectionLabel: (kind?: string) => string }>();
</script>

<style scoped>
.entry-text-block { margin-top: 20px; }
</style>
