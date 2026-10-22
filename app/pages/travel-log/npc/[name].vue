<template>
    <el-container v-if="npc">
        <el-main>
            <el-page-header @back="navigateTo(localePath('/travel-log'))">
                <template #content>{{ npc.name }}</template>
                <template #extra>
                    <el-button @click="selections = {}">{{ $t('travel-log.npc_restart') }}</el-button>
                </template>
            </el-page-header>
            <el-card class="npc-info">
                <el-descriptions :column="1" border>
                    <el-descriptions-item :label="$t('travel-log.npc_name')">{{ npc.name }}</el-descriptions-item>
                    <el-descriptions-item v-if="npc.title" :label="$t('travel-log.npc_title')">
                        <span v-html="npc.title"></span>
                    </el-descriptions-item>
                </el-descriptions>
            </el-card>
            <el-text class="npc-description" type="info">{{ $t('travel-log.npc_description') }}</el-text>
            <el-row :gutter="20" class="npc-workspace">
                <el-col :span="24" :lg="conditions.length ? 16 : 24">
                    <el-card>
                        <template #header>
                            <div class="npc-dialog-header">
                                <span class="npc-panel-title">{{ $t('travel-log.dialog') }}</span>
                                <el-segmented v-model="mode" :options="display_options" />
                            </div>
                        </template>
                        <el-empty v-if="!flow.segments.length" :description="$t('travel-log.npc_unavailable')" />
                        <section v-for="segment in flow.segments" :key="segment.selector_key" class="npc-talk">
                            <talk-flow-selector :talks="npc.talks" :segment="segment" @select="select_dialog" />
                            <NuxtLink v-if="segment.talk_key !== undefined && npc.talks[segment.talk_key]!.task"
                                :to="localePath(`/travel-log/task/${npc.talks[segment.talk_key]!.task}`)">
                                {{ $t('travel-log.npc_related_task') }}
                            </NuxtLink>
                            <task-talk v-if="segment.talk_key !== undefined" :key="segment.talk_key"
                                :talk="npc.talks[segment.talk_key]!"
                                :mode="mode" :condition_values="flow.state.values" :input_values="input_values"
                                :current_step="0" :step_keys="[]" :segment="segment"
                                @select="select_dialog" @update:input_values="input_values = $event" />
                        </section>
                    </el-card>
                </el-col>
                <el-col v-if="conditions.length" :span="24" :lg="8" class="npc-conditions-column">
                    <el-card class="npc-conditions-card">
                        <template #header>
                            <span class="npc-panel-title">{{ $t('travel-log.npc_conditions') }}</span>
                        </template>
                        <task-conditions :model-value="input_values" :conditions="conditions"
                            @update:model-value="set_conditions" />
                    </el-card>
                </el-col>
            </el-row>
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

function set_conditions(value: TaskConditionValues) {
    input_values.value = value;
    selections.value = { entry: selections.value.entry };
}

function select_dialog(key: string, value: number) {
    selections.value = key === 'entry' ? { entry: value } : { ...selections.value, [key]: value };
}

onMounted(async () => { npc.value = await get_npc(String(route.params.name)); });
useHead({ title: computed(() => npc.value?.name || $t('travel-log.npcs')) });
</script>

<style scoped>
.npc-info {
    margin-top: 20px;
}

.npc-description {
    display: block;
    margin: 20px 0;
}
.npc-workspace {
    width: 100%;
    row-gap: 20px;
    margin-top: 20px;
}

.npc-talk {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}
.npc-talk:last-child {
    margin-bottom: 0;
}

.npc-dialog-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.npc-panel-title {
    font-weight: bold;
}

.npc-conditions-column {
    position: sticky;
    top: 20px;
    align-self: flex-start;
}

.npc-conditions-card {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 40px);
}

.npc-conditions-card :deep(.el-card__body) {
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
}

@media (max-width: 1199px) {
    .npc-conditions-column {
        position: static;
    }

    .npc-conditions-card {
        max-height: none;
    }
}
</style>
