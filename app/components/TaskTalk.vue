<template>
    <section class="task-talk">
        <el-collapse v-model="expanded_keys" class="talk-collapse">
            <el-collapse-item name="talk">
                <template #title>
                    <div class="talk-title">
                        <span class="talk-title-text">{{ talk_title }}</span>
                        <el-button :icon="ElIconDocumentCopy" size="small" circle class="copy-button"
                            :title="$t('travel-log.copy_dialog')" :aria-label="$t('travel-log.copy_dialog')"
                            @mousedown.stop @keydown.stop @click.stop="copy_dialog" />
                    </div>
                </template>
                <talk-dialogs ref="dialogs" :talk="talk" :mode="mode" :condition_values="condition_values"
                    :current_step="current_step" :step_keys="step_keys"
                    @initial_conditions="$emit('initial_conditions', $event)" />
            </el-collapse-item>
        </el-collapse>
    </section>
</template>

<script setup lang="ts">
import type { TalkDisplayMode, TaskTalk } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import { copy_dialog_text } from '~/utils/dialog_copy';
import TalkDialogs from '~/components/TalkDialogs.vue';

const props = defineProps<{
    talk: TaskTalk,
    extra?: boolean,
    mode?: TalkDisplayMode,
    condition_values: TaskConditionValues,
    current_step: number,
    step_keys: number[],
}>();
defineEmits<{
    initial_conditions: [conditions: import('~/types/travel_log').TaskCondition[]],
}>();

const expanded_keys = ref(props.extra ? [] : ['talk']);
const dialogs = ref<InstanceType<typeof TalkDialogs>>();
const talk_title = computed(() =>
    props.talk.objects.join(' / ') || $t('travel-log.dialog'));

function get_dialog_text() {
    return dialogs.value?.get_dialog_text() || '';
}

async function copy_dialog() {
    await copy_dialog_text(get_dialog_text());
}

defineExpose({ get_dialog_text });
</script>

<style scoped>
.talk-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    width: 100%;
    padding-right: 12px;
    box-sizing: border-box;
    min-height: 30px;
    font-size: var(--el-font-size-medium);
    line-height: 1.5;
    font-weight: bold;
}

.talk-title-text {
    min-width: 0;
    overflow-wrap: anywhere;
}

.copy-button {
    flex-shrink: 0;
    margin: 0;
}

.task-talk {
    padding: 14px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
}

.talk-collapse {
    border-top: 0;
    border-bottom: 0;
}

:deep(.el-collapse-item__header) {
    height: auto;
    min-height: 42px;
    padding: 6px 0;
}

:deep(.el-collapse-item__content) {
    padding-top: 12px;
    padding-bottom: 0;
}
</style>
