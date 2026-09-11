<template>
    <div :data-dialog-key="item.key"
        :class="['dialog-line', `dialog-${item.dialog.role}`,
            { 'dialog-line-clickable': clickable }]">
        <template v-if="item.dialog.role === 'black_screen'">
            <div class="black-screen-text" v-html="item.dialog.content"></div>
        </template>
        <template v-else>
            <div v-if="!hide_title && item.dialog.speaker" class="speaker">
                <span>{{ item.dialog.speaker }}</span>
                <el-text v-if="item.dialog.speaker_subtitle" type="info" size="small">
                    {{ item.dialog.speaker_subtitle }}
                </el-text>
            </div>
            <div class="dialog-content" v-html="item.dialog.content"></div>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { TaskTalk } from '~/types/travel_log';

defineProps<{
    item: { kind: 'dialog', key: number, dialog: TaskTalk['dialogs'][string] },
    clickable?: boolean,
    hide_title?: boolean,
}>();
</script>

<style scoped>
.dialog-line {
    max-width: 85%;
}

.dialog-line-clickable {
    cursor: pointer;
}

.dialog-line-clickable:hover {
    background: var(--el-fill-color-light);
    border-radius: 6px;
}

.dialog-select {
    align-self: flex-end;
    padding: 10px 12px;
    border-radius: 4px;
    background: var(--el-color-primary-light-9);
}

.dialog-npc {
    align-self: flex-start;
}

.dialog-black_screen {
    align-self: stretch;
    max-width: none;
}

.speaker {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: bold;
}

.dialog-content {
    font-size: inherit;
    line-height: 1.75;
}

.black-screen-text {
    padding: 14px 18px;
    border-radius: 4px;
    background: var(--el-text-color-primary);
    color: var(--el-bg-color);
    text-align: center;
    line-height: 1.75;
}
</style>
