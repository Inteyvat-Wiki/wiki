<template>
    <el-image v-if="left_top_subicon" :src="left_top_subicon"
        style="width: 32.5px; height: 32.5px; position: absolute; flex-shrink: 0; margin-top: -5px; margin-left: -5px;" />
    <el-row>
        <el-col :span="24">
            <el-image :src="icon" style="width: 100%; height: auto;" />
        </el-col>
        <el-col :span="24">
            <div
                style="display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; overflow: visible;">
                <div v-if="left_subicon || right_subicon" style="width: 25px; height: 25px; display: flex; flex-shrink: 0; margin-top: 3px;">
                    <div v-if="left_subicon" style="display: flex; align-items: center">
                        <el-image :src="left_subicon" />
                    </div>
                </div>
                <span
                    style="font-weight: bold; font-size: 1.2em; white-space: nowrap; justify-content: center; flex-shrink: 0;">
                    {{ title }}
                </span>
                <div v-if="left_subicon || right_subicon" style="width: 25px; height: 25px; display: flex; flex-shrink: 0; margin-top: 3px;">
                    <div v-if="right_subicon" style="display: flex; align-items: center">
                        <el-image :src="right_subicon" />
                    </div>
                </div>
            </div>
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
const props = defineProps<{
    title: string,
    icon: string,
    left_subicon?: string,
    right_subicon?: string,
    left_top_subicon?: string,
}>()
</script>