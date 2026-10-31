<template>
    <el-row :gutter="20" class="npc-workspace">
        <el-col :span="24" :lg="conditions.length ? 16 : 24">
            <el-card>
                <template #header>
                    <div class="dialogue-header">
                        <span>{{ $t('travel-log.dialog') }}</span>
                        <el-button v-if="showRestart" @click="restart">{{ $t('travel-log.npc_restart') }}</el-button>
                        <el-segmented v-model="mode" :options="display_options" />
                    </div>
                </template>
                <el-empty v-if="!flow.segments.length" :description="$t('travel-log.npc_unavailable')" />
                <section v-for="segment in flow.segments" :key="segment.selector_key" class="npc-talk">
                    <talk-flow-selector :talks="npc.talks" :segment="segment" @select="select_dialog" />
                    <NuxtLink v-if="showRelatedTask && segment.talk_key !== undefined && npc.talks[segment.talk_key]!.task"
                        :to="localePath(`/travel-log/task/${npc.talks[segment.talk_key]!.task}`)">
                        {{ $t('travel-log.npc_related_task') }}
                    </NuxtLink>
                    <task-talk v-if="segment.talk_key !== undefined" :key="segment.talk_key"
                        :talk="npc.talks[segment.talk_key]!" :mode="mode" :condition_values="flow.state.values"
                        :input_values="input_values" :current_step="0" :step_keys="[]" :segment="segment"
                        @select="select_dialog" @update:input_values="input_values = $event" />
                </section>
            </el-card>
        </el-col>
        <el-col v-if="conditions.length" :span="24" :lg="8" class="conditions-column">
            <el-card class="conditions-card">
                <template #header>{{ $t('travel-log.npc_conditions') }}</template>
                <task-conditions :model-value="input_values" :conditions="conditions" @update:model-value="set_conditions" />
            </el-card>
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
import type { Npc } from '~/types/npc';
import type { TalkDisplayMode } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import type { TaskFlowSelections } from '~/utils/task_flow';
import { build_npc_flow, get_npc_conditions } from '~/utils/npc_flow';

const props = defineProps<{ npc: Npc; showRestart?: boolean; showRelatedTask?: boolean }>();
const localePath = useLocalePath();
const input_values = ref<TaskConditionValues>({});
const selections = ref<TaskFlowSelections>({});
const mode = ref<TalkDisplayMode>('both');
const conditions = computed(() => get_npc_conditions(props.npc));
const flow = computed(() => build_npc_flow(props.npc, input_values.value, selections.value));
const display_options = computed(() => [
    { label: $t('travel-log.display_mode.both'), value: 'both' },
    { label: $t('travel-log.display_mode.options'), value: 'options_only' },
    { label: $t('travel-log.display_mode.bubbles'), value: 'bubbles_only' },
]);
function restart() { selections.value = {}; }
function set_conditions(value: TaskConditionValues) {
    input_values.value = value; selections.value = { entry: selections.value.entry };
}
function select_dialog(key: string, value: number) {
    selections.value = key === 'entry' ? { entry: value } : { ...selections.value, [key]: value };
}
watch(() => props.npc, () => { input_values.value = {}; restart(); });
defineExpose({ restart });
</script>

<style scoped>
.npc-workspace { width: 100%; row-gap: 20px; }
.dialogue-header { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.dialogue-header > span { font-weight: bold; margin-right: auto; }
.npc-talk { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.npc-talk:last-child { margin-bottom: 0; }
.conditions-column { position: sticky; top: 20px; align-self: flex-start; }
.conditions-card { display: flex; flex-direction: column; max-height: calc(100vh - 40px); }
.conditions-card :deep(.el-card__body) { min-height: 0; overflow-x: hidden; overflow-y: auto; }
@media (max-width: 1199px) {
    .conditions-column { position: static; }
    .conditions-card { max-height: none; }
}
</style>
