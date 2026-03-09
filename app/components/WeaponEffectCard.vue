<template>
    <el-descriptions direction="vertical" border>
        <el-descriptions-item :label="effect.name">
            <div v-html="effect.description"></div>
        </el-descriptions-item>
    </el-descriptions>
</template>

<script setup lang="ts">
const props = defineProps<{
    effect: {
        name: string,
        description: string,
    };
}>();
</script>