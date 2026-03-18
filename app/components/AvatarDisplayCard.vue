<template>
    <el-card shadow="hover" :style="{ border: border_star !== undefined ? `1px solid var(--star-${border_star}-color-half)` : '',
        padding: '0px'
    }">
        <el-image v-if="left_top_subicon" :src="left_top_subicon"
            style="width: 32.5px; height: 32.5px; position: absolute; flex-shrink: 0; margin-top: 15px; margin-left: 15px;" />
        <div style="position: absolute; flex-shrink: 0; margin-top: 15px; margin-left: 15px;">
            <slot name="left_top"></slot>
        </div>
        <el-row style="padding-bottom: 20px; overflow: hidden;">
            <el-col :span="24" style="padding-left: 20px; padding-right: 20px; padding-top: 20px;">
                <el-image :src="icon" style="width: 100%; height: auto;" />
            </el-col>
            <el-col :span="24">
                <div
                    style="display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; overflow: visible;">
                    <div v-if="left_subicon || right_subicon"
                        style="width: 25px; height: 25px; display: flex; flex-shrink: 0; margin-top: 3px;">
                        <div v-if="left_subicon" style="display: flex; align-items: center">
                            <el-image :src="left_subicon" />
                        </div>
                    </div>
                    <span :style="{
                        'font-weight': 'bold', 'font-size': font_size || '1.2em', 'justify-content': 'center', 'flex-shrink': 0,
                    }">
                        {{ title }}
                    </span>
                    <div v-if="left_subicon || right_subicon"
                        style="width: 25px; height: 25px; display: flex; flex-shrink: 0; margin-top: 3px;">
                        <div v-if="right_subicon" style="display: flex; align-items: center">
                            <el-image :src="right_subicon" />
                        </div>
                    </div>
                </div>
            </el-col>
        </el-row>
    </el-card>
</template>

<script setup lang="ts">
const props = defineProps<{
    title: string,
    icon: string,
    border_star?: number,
    left_subicon?: string,
    right_subicon?: string,
    left_top_subicon?: string,
    font_size?: string,
}>()
</script>

<style scoped>
:deep(.el-card__body) {
    padding: 0px !important;
}
</style>