<template>
    <el-card>
        <template #header>
            <div class="messages-header"><span>{{ $t('misc.types.graeae_message') }}</span>
                <el-button :disabled="!Object.keys(selections).length" @click="selections = {}">{{ $t('travel-log.npc_restart') }}</el-button>
                <el-button :icon="ElIconDocumentCopy" @click="copy_path">{{ $t('travel-log.copy_dialog') }}</el-button>
            </div>
        </template>
        <div class="messages-path" role="region" :aria-label="$t('misc.types.graeae_message')">
            <template v-for="(item, index) in path" :key="item.kind === 'message' ? item.node.id : item.key">
                <div v-if="item.kind === 'message'" class="message-entry"
                    :class="{ 'message-outgoing': !item.node.speaker, 'message-continuation': message_continues(path, index), 'message-with-image': !!item.node.image?.url }">
                    <talk-bubble v-if="item.node.text" :item="{ kind: 'dialog', key: index, dialog: dialog(item.node) }"
                        :hide_title="message_continues(path, index)" />
                    <span v-else-if="item.node.speaker && !message_continues(path, index)" class="attachment-speaker">{{ entry_plain_text(item.node.speaker) }}</span>
                    <el-text v-if="item.node.location" class="message-location" type="info"><inline-text :text="item.node.location" /></el-text>
                    <div v-if="item.node.image?.url" class="round_icon_with_bg message-image">
                        <el-image :src="item.node.image.url" :preview-src-list="[item.node.image.url]" fit="contain"
                            loading="lazy" preview-teleported hide-on-click-modal :alt="$t('archive.image_alt', { index: index + 1 })" />
                    </div>
                </div>
                <talk-choice-options v-else class="message-replies" :options="item.options.map((node, index) => ({ key: index + 1, dialog: dialog(node) }))"
                    :model-value="item.selected ? item.options.findIndex(node => node.id === item.selected) + 1 : undefined"
                    @update:model-value="value => select(item.key, item.options, value)" />
            </template>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import type { MiscMessageThread, MiscMessageNode } from '~~/shared/misc';
import type { TaskDialog } from '~/types/travel_log';
import { message_thread_path, message_continues, select_message_reply } from '~~/shared/message_thread';
import { entry_plain_text } from '~~/shared/archive_display';
import { copy_dialog_text } from '~/utils/dialog_copy';
const props = defineProps<{ thread: MiscMessageThread }>();
const { t } = useI18n();
const selections = ref<Record<string, string>>({});
const path = computed(() => message_thread_path(props.thread, selections.value));
function dialog(node: MiscMessageNode): TaskDialog {
    return { content: node.text, role: node.kind === 'option' || !node.speaker ? 'select' : 'npc',
        ...(node.speaker ? { speaker: entry_plain_text(node.speaker) } : {}), next_dialogs: [] };
}
function select(key: string, options: MiscMessageNode[], value: number | undefined) {
    const option = value === undefined ? undefined : options[value - 1];
    if (option) selections.value = select_message_reply(props.thread, selections.value, key, option.id);
}
async function copy_path() {
    const lines = path.value.flatMap(item => item.kind === 'message'
        ? [item.node.speaker, item.node.text, item.node.location].filter(Boolean).map(value => entry_plain_text(value!))
        : item.selected ? [entry_plain_text(item.options.find(node => node.id === item.selected)!.text)] : []);
    await copy_dialog_text(lines.join('\n'), key => t(key));
}
watch(() => props.thread, () => { selections.value = {}; });
</script>

<style scoped>
.messages-header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.messages-header > span { margin-right: auto; }
.messages-path { display: flex; flex-direction: column; gap: 18px; width: 100%; min-width: 0; }
.message-entry { display: flex; flex-direction: column; align-items: flex-start; align-self: flex-start; gap: 8px; max-width: min(85%, 52rem); min-width: 0; }
.message-outgoing { align-self: flex-end; align-items: flex-end; }
.message-with-image { width: 480px; }
.message-continuation { margin-top: -10px; }
.message-entry :deep(.dialog-line) { max-width: 100%; min-width: 0; overflow-wrap: anywhere; }
.message-entry :deep(.dialog-npc) { padding: 10px 14px; background: var(--el-fill-color-light); border-radius: 10px; }
.message-entry :deep(.dialog-select) { border-radius: 10px; }
.attachment-speaker { font-weight: bold; }
.message-location { padding: 8px 12px; background: var(--el-fill-color-light); border-radius: 6px; overflow-wrap: anywhere; }
.message-replies { align-self: flex-end; max-width: min(85%, 52rem); min-width: 0; box-sizing: border-box; }
.message-replies :deep(.dialog-choice-text) { overflow-wrap: anywhere; }
.message-image { width: 100%; max-width: 480px; aspect-ratio: 2 / 1; padding: 8px; box-sizing: border-box; border-radius: 6px; }
.message-image .el-image { width: 100%; height: 100%; cursor: zoom-in; }
@media (max-width: 600px) {
    .message-entry, .message-replies { max-width: 95%; }
    .messages-header { gap: 8px; }
    .messages-header :deep(.el-button + .el-button) { margin-left: 0; }
}
</style>
