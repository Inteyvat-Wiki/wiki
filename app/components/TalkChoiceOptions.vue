<template>
    <div class="dialog-choice">
        <el-radio-group v-model="model" class="dialog-choice-options">
            <el-radio v-for="option in options" :key="option.key" :value="option.key"
                class="dialog-choice-option">
                <span class="dialog-choice-text" v-html="option.dialog.content"></span>
                <el-icon class="dialog-choice-check"><Check /></el-icon>
            </el-radio>
        </el-radio-group>
    </div>
</template>

<script setup lang="ts">
import { Check } from '@element-plus/icons-vue';
import type { TaskTalk } from '~/types/travel_log';

defineProps<{
    options: { key: number, dialog: TaskTalk['dialogs'][string] }[],
}>();

const model = defineModel<number | undefined>();
</script>

<style scoped>
.dialog-choice {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-light);
    box-sizing: border-box;
}

.dialog-choice-options {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
}

.dialog-choice-options :deep(.el-radio) {
    height: auto;
    margin-right: 0;
    white-space: normal;
}

.dialog-choice-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    background: var(--el-bg-color);
    font-size: var(--el-font-size-small);
    line-height: 1.5;
    box-sizing: border-box;
    transition: border-color .2s, background-color .2s, box-shadow .2s;
}

.dialog-choice-option:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
}

.dialog-choice-option :deep(.el-radio__input) {
    display: none;
}

.dialog-choice-option :deep(.el-radio__label) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.dialog-choice-option.is-checked {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-8);
    box-shadow: inset 0 0 0 1px var(--el-color-primary);
}

.dialog-choice-text {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: break-word;
    word-break: break-word;
}

.dialog-choice-check {
    flex: 0 0 auto;
    color: var(--el-color-primary);
    opacity: 0;
    transform: scale(.6);
    transition: opacity .2s, transform .2s;
}

.dialog-choice-option.is-checked .dialog-choice-check {
    opacity: 1;
    transform: scale(1);
}
</style>
