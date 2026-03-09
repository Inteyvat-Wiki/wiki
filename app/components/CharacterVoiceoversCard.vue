<template>
    <el-collapse>
        <el-descriptions border :column="1">
            <el-descriptions-item v-for="voiceover in voiceovers" :key="voiceover.title" :label="voiceover.title">
                <normal-text :text="voiceover.content" />
            </el-descriptions-item>
        </el-descriptions>
    </el-collapse>
</template>

<script setup lang="ts">
const props = defineProps<{
    voiceovers: {
        title: string,
        content: string,
        tips: string[],
    }[]
}>();
</script>