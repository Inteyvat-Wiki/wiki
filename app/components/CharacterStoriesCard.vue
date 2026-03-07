<template>
    <el-collapse>
        <el-tabs>
            <el-tab-pane v-for="(story, index) in stories" :key="index" :label="story.title">
                <div v-html="story.content"></div>
                <br>
            </el-tab-pane>
        </el-tabs>
    </el-collapse>
</template>

<script setup lang="ts">
const props = defineProps<{
    stories: {
        title: string,
        content: string,
        tips: string[],
    }[]
}>();
</script>