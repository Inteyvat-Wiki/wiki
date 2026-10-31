<template>
    <el-radio-group v-if="segment.candidate_keys.length > 1" :model-value="segment.talk_key"
        class="talk-flow-options" @update:model-value="select">
        <el-radio v-for="key in segment.candidate_keys" :key="key" :value="key" border>
            <inline-text v-if="segment.selector_type === 'successor'" :text="get_first_line(talks[key]!)" />
            <template v-else>
                <inline-text :text="get_title(talks[key]!)" />
                <el-text v-if="get_description(key)" type="info" size="small">
                    <inline-text :text="get_description(key)" />
                </el-text>
            </template>
        </el-radio>
    </el-radio-group>
</template>

<script setup lang="ts">
import type { TaskTalk } from '~/types/travel_log';
import type { TaskFlowSegment } from '~/utils/task_flow';
import { get_talk_first_line } from '~/utils/talk_title';

const props = defineProps<{ talks: Record<string, TaskTalk>, segment: TaskFlowSegment }>();
const emit = defineEmits<{ select: [key: string, value: number] }>();

function get_title(talk: TaskTalk) {
    return talk.objects.join(' / ') || $t('travel-log.dialog');
}

function get_first_line(talk: TaskTalk) {
    return get_talk_first_line(talk) || get_title(talk);
}

function get_description(key: number) {
    const talk = props.talks[key]!;
    const title = get_title(talk);
    const same_title = props.segment.candidate_keys.some(candidate => candidate !== key
        && get_title(props.talks[candidate]!) === title);
    const content = get_first_line(talk);
    return same_title && content !== title ? content : '';
}

function select(value: string | number | boolean | undefined) {
    if (typeof value === 'number') emit('select', props.segment.selector_key, value);
}
</script>

<style scoped>
.talk-flow-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.talk-flow-options :deep(.el-radio) {
    height: auto;
    max-width: 100%;
    min-height: 30px;
    margin-right: 0;
    white-space: normal;
}
.talk-flow-options :deep(.el-radio__label) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
}
</style>
