<template>
    <section class="task-talk">
        <el-collapse v-model="expanded_keys" class="talk-collapse">
            <el-collapse-item name="talk">
                <template #title>
                    <div class="talk-title">
                        <span v-if="is_narration" class="narration-title">
                            <el-tag type="success" effect="plain">{{ $t('travel-log.narration') }}</el-tag>
                            <el-text type="info" size="small">{{ narration_context }}</el-text>
                        </span>
                        <span v-else class="talk-title-text">{{ talk_title }}</span>
                        <el-button :icon="ElIconDocumentCopy" size="small" circle class="copy-button"
                            :title="$t('travel-log.copy_dialog')" :aria-label="$t('travel-log.copy_dialog')"
                            @mousedown.stop @keydown.stop @click.stop="copy_dialog" />
                    </div>
                </template>
                <talk-dialogs ref="dialogs" :talk="dialog_talk" :mode="mode" :condition_values="condition_values"
                    :current_step="current_step" :step_keys="step_keys"
                    :segment="dialog_segment" :input_values="input_values"
                    @initial_conditions="$emit('initial_conditions', $event)"
                    @select="(key, value) => $emit('select', key, value)"
                    @update:input_values="$emit('update:input_values', $event)" />
            </el-collapse-item>
        </el-collapse>
    </section>
</template>

<script setup lang="ts">
import type { TalkDisplayMode, TaskTalk, TaskNarration } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import { copy_dialog_text } from '~/utils/dialog_copy';
import TalkDialogs from '~/components/TalkDialogs.vue';
import type { TaskFlowSegment } from '~/utils/task_flow';

const props = defineProps<{
    talk: TaskTalk | TaskNarration,
    extra?: boolean,
    mode?: TalkDisplayMode,
    condition_values: TaskConditionValues,
    current_step: number,
    step_keys: number[],
    segment?: TaskFlowSegment,
    input_values?: TaskConditionValues,
}>();
defineEmits<{
    initial_conditions: [conditions: import('~/types/travel_log').TaskCondition[]],
    select: [key: string, value: number],
    'update:input_values': [value: TaskConditionValues],
}>();

const expanded_keys = ref(props.extra ? [] : ['talk']);
const dialogs = ref<InstanceType<typeof TalkDialogs>>();
const is_narration = computed(() => 'type' in props.talk && props.talk.type === 'narration');
const talk_title = computed(() =>
    'objects' in props.talk ? props.talk.objects.join(' / ') || $t('travel-log.dialog') : '');
const narration_context = computed(() => {
    if (!('event' in props.talk)) return '';
    const event = $t(`travel-log.narration_event.${props.talk.event}`);
    return props.talk.delay ? `${event} · ${$t('travel-log.narration_delay', { seconds: props.talk.delay })}` : event;
});
const dialog_talk = computed<TaskTalk>(() => 'objects' in props.talk ? props.talk : {
    priority: 0, begin_way: null, next_talks: [], trigger_ids: [], conditions: [],
    objects: [], trigger_points: [], dialogs: props.talk.dialogs,
});
const dialog_segment = computed<TaskFlowSegment | undefined>(() => {
    if (!('source' in props.talk)) return props.segment;
    return {
        selector_key: props.talk.source, candidate_keys: [],
        items: Object.entries(props.talk.dialogs).map(([key, dialog]) => ({ kind: 'dialog', key: Number(key), dialog })),
    };
});

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

.narration-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
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
