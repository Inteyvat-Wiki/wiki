<template>
    <el-container v-if="npc">
        <el-main>
            <el-page-header @back="navigateTo(localePath('/travel-log'))">
                <template #content>{{ npc.name }}</template>
                <template #extra>
                    <el-button @click="selections = {}">{{ $t('travel-log.npc_restart') }}</el-button>
                </template>
            </el-page-header>
            <el-text class="npc-description" type="info">{{ $t('travel-log.npc_description') }}</el-text>
            <el-collapse v-if="conditions.length" class="npc-conditions">
                <el-collapse-item :title="$t('travel-log.npc_conditions')" name="conditions">
                    <task-conditions :model-value="input_values" :conditions="conditions"
                        @update:model-value="set_conditions" />
                </el-collapse-item>
            </el-collapse>
            <div class="npc-controls">
                <el-select v-if="flow.entry_keys.length" :model-value="flow.entry_key"
                    :aria-label="$t('travel-log.npc_version')" @update:model-value="select_entry">
                    <el-option v-for="key in flow.entry_keys" :key="key" :value="key" :label="npc.talks[key]!.title" />
                </el-select>
                <el-segmented v-model="mode" :options="display_options" />
            </div>
            <el-empty v-if="!flow.segments.length" :description="$t('travel-log.npc_unavailable')" />
            <section v-for="part in flow.segments" :key="part.segment.selector_key" class="npc-talk">
                <NuxtLink v-if="npc.talks[part.talk_key]!.task"
                    :to="localePath(`/travel-log/task/${npc.talks[part.talk_key]!.task}`)">
                    {{ $t('travel-log.npc_related_task') }}
                </NuxtLink>
                <task-talk :talk="npc.talks[part.talk_key]!" :title="npc.talks[part.talk_key]!.title"
                    :mode="mode" :condition_values="flow.state.values" :input_values="input_values"
                    :current_step="0" :step_keys="[]" :segment="part.segment"
                    @select="select_dialog" @update:input_values="input_values = $event" />
                <div v-if="part.menu_keys.length" class="npc-topics">
                    <el-text type="info">{{ $t('travel-log.npc_topics') }}</el-text>
                    <el-radio-group :model-value="selections[part.menu_selector_key]"
                        @update:model-value="value => select_dialog(part.menu_selector_key, Number(value))">
                        <el-radio v-for="key in part.menu_keys" :key="key" :value="key" border>
                            {{ npc.talks[key]!.title }}
                        </el-radio>
                    </el-radio-group>
                </div>
            </section>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { Npc } from '~/types/npc';
import type { TalkDisplayMode } from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import type { TaskFlowSelections } from '~/utils/task_flow';
import { build_npc_flow, get_npc_conditions } from '~/utils/npc_flow';

const route = useRoute();
const localePath = useLocalePath();
const npc = ref<Npc>();
const input_values = ref<TaskConditionValues>({});
const selections = ref<TaskFlowSelections>({});
const mode = ref<TalkDisplayMode>('both');
const conditions = computed(() => npc.value ? get_npc_conditions(npc.value) : []);
const flow = computed(() => npc.value ? build_npc_flow(npc.value, input_values.value, selections.value)
    : { entry_keys: [], entry_key: undefined, segments: [], state: { values: {} } });
const display_options = computed(() => [
    { label: $t('travel-log.display_mode.both'), value: 'both' },
    { label: $t('travel-log.display_mode.options'), value: 'options_only' },
    { label: $t('travel-log.display_mode.bubbles'), value: 'bubbles_only' },
]);

function select_entry(value: number) {
    selections.value = { entry: value };
}

function set_conditions(value: TaskConditionValues) {
    input_values.value = value;
    selections.value = { entry: selections.value.entry };
}

function select_dialog(key: string, value: number) {
    // 修改先前选择时丢弃后续路径，避免旧分支的选择污染新路径。
    const keys = Object.keys(selections.value);
    const index = keys.indexOf(key);
    selections.value = { ...Object.fromEntries(keys.slice(0, index < 0 ? keys.length : index)
        .map(key => [key, selections.value[key]])), [key]: value };
}

onMounted(async () => { npc.value = await get_npc(String(route.params.name)); });
useHead({ title: computed(() => npc.value?.name || $t('travel-log.npcs')) });
</script>

<style scoped>
.npc-description {
    display: block;
    margin: 20px 0;
}
.npc-controls,
.npc-topics,
.npc-talk {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}
.npc-controls {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
}
.npc-controls .el-select {
    width: 320px;
    max-width: 100%;
}
.npc-topics :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.npc-topics :deep(.el-radio) {
    margin-right: 0;
    height: auto;
    min-height: 36px;
    padding: 8px 12px;
    white-space: normal;
}
</style>
