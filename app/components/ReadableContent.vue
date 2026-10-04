<template>
    <el-container v-if="readable">
        <el-main>
            <el-card>
                <template #header>
                    <title-with-icon :title="readable.name" />
                </template>
                <template v-for="(content, index) in readable.content" :key="index">
                    <normal-text :text="content" :border="true" />
                    <hr v-if="index < readable.content.length - 1" class="content-separator" />
                </template>
            </el-card>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { Readable } from '~/types/readable';

defineProps<{ readable: Readable | undefined }>();
</script>

<style scoped>
.content-separator {
    border: 0;
    border-top: 1px solid var(--el-border-color-light);
    margin: 20px 0;
}
</style>
