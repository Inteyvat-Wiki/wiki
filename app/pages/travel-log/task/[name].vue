<template>
    <el-container v-if="task">
        <el-main>
            <el-page-header @back="navigateTo(localePath('/travel-log'))">
                <template #content>
                    <div class="page-title">
                        <span>{{ task.name || $t('travel-log.hidden_task') }}</span>
                        <el-button :icon="ElIconDocumentCopy" size="small" circle class="copy-button"
                            :title="$t('travel-log.copy_task')" :aria-label="$t('travel-log.copy_task')"
                            @click="copy_task_dialogs" />
                    </div>
                </template>
                <template #extra>
                    <div class="page-header-extra">
                        <el-tag v-if="task_list_item">{{ $t(`travel-log.type.${task_list_item.type}`) }}</el-tag>
                        <el-segmented v-model="talk_display_mode" :options="display_mode_options" />
                    </div>
                </template>
            </el-page-header>

            <el-card style="margin-top: 20px;">
                <el-descriptions border :column="1">
                    <el-descriptions-item v-if="task.chapter" :label="$t('travel-log.chapter')">
                        {{ task.chapter }}
                    </el-descriptions-item>
                    <el-descriptions-item v-if="task.description" :label="$t('travel-log.description')">
                        <div v-html="task.description"></div>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="task.unlock_description" :label="$t('travel-log.unlock_description')">
                        <div v-html="task.unlock_description"></div>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="task.previous_tasks.length > 0" :label="$t('travel-log.prev_tasks')">
                        <div class="task-links">
                            <NuxtLink v-for="task_name in task.previous_tasks" :key="task_name"
                                :to="localePath(`/travel-log/task/${task_name}`)">
                                {{ task_names[task_name] || task_name }}
                            </NuxtLink>
                        </div>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="task.suggested_tasks.length > 0" :label="$t('travel-log.suggest_tasks')">
                        <div class="task-links">
                            <NuxtLink v-for="task_name in task.suggested_tasks" :key="task_name"
                                :to="localePath(`/travel-log/task/${task_name}`)">
                                {{ task_names[task_name] || task_name }}
                            </NuxtLink>
                        </div>
                    </el-descriptions-item>
                </el-descriptions>
            </el-card>

            <el-row :gutter="20" class="task-workspace">
                <el-col :span="24" :lg="16">
                    <el-card>
                        <template #header>
                            <span style="font-weight: bold;">{{ $t('travel-log.steps') }}</span>
                        </template>
                        <el-collapse v-model="expanded_step_keys" class="task-steps">
                            <el-collapse-item v-for="item in steps" :key="item.key" :name="String(item.key)"
                                :id="`step-${item.key}`" :class="{
                                    'task-step-current': item.key === current_step_key,
                                    'task-step-hidden': item.step.hidden,
                                }">
                                <template #title>
                                    <div class="task-step-title"
                                        :class="{ 'task-step-title-hidden': item.step.hidden }">
                                        <span class="task-step-name">{{ get_step_title(item) }}</span>
                                        <el-tag v-if="item.key === current_step_key" type="primary" size="small">
                                            {{ $t('travel-log.current_step') }}
                                        </el-tag>
                                        <div style="padding-right: 10px;">
                                            <el-button :type="get_step_button_type(item.key)"
                                                :icon="get_step_button_icon(item.key)"
                                                :title="get_step_button_title(item.key)"
                                                :aria-label="get_step_button_title(item.key)" size="small" circle plain
                                                class="step-current-button" @mousedown.stop
                                                @click.stop="select_current_step(item.key)" />
                                        </div>
                                    </div>
                                </template>
                                <task-talk v-for="entry in get_narrations(item.key, 'start')" :key="entry.key"
                                    class="step-talks" :talk="entry.narration"
                                    :ref="instance => set_talk_ref(`narration-${entry.key}`, instance)"
                                    :condition_values="condition_values" :current_step="item.key" :step_keys="step_keys" />
                                <div v-for="segment in get_step_talk_state(item).segments" :key="segment.selector_key"
                                    class="step-talks">
                                    <talk-flow-selector :talks="task.talks" :segment="segment" class="step-talk-selector"
                                        @select="select_flow_option" />
                                    <task-talk v-if="segment.talk_key !== undefined" :key="segment.talk_key"
                                        :ref="instance => set_talk_ref(`step-${item.key}-${segment.talk_key}`, instance)"
                                        :talk="task.talks[segment.talk_key]!" :segment="segment"
                                        v-model:input_values="flow_input_values"
                                        :mode="talk_display_mode" :condition_values="condition_values"
                                        :current_step="item.key" :step_keys="step_keys"
                                        @select="select_flow_option" />
                                </div>
                                <task-item-operations :operations="item.step.operations" />
                                <task-talk v-for="entry in get_narrations(item.key, 'finish', 'failed')" :key="entry.key"
                                    class="step-talks" :talk="entry.narration"
                                    :ref="instance => set_talk_ref(`narration-${entry.key}`, instance)"
                                    :condition_values="condition_values" :current_step="item.key" :step_keys="step_keys" />
                            </el-collapse-item>
                        </el-collapse>
                    </el-card>
                </el-col>

                <el-col :span="24" :lg="8">
                    <el-affix :offset="20" class="side-panel-affix">
                        <div class="side-panel">
                            <el-splitter layout="vertical" class="side-panel-splitter">
                                <el-splitter-panel v-if="selectable_conditions.length > 0"
                                    v-model:size="conditions_panel_size" :min="0" collapsible
                                    class="side-panel-section">
                                    <el-card class="side-panel-card">
                                        <template #header>
                                            <span style="font-weight: bold;">{{ $t('travel-log.conditions') }}</span>
                                        </template>
                                        <task-conditions v-model="condition_values"
                                            :conditions="selectable_conditions" />
                                    </el-card>
                                </el-splitter-panel>
                                <el-splitter-panel v-model:size="extra_talks_panel_size" :min="0" collapsible
                                    class="side-panel-section">
                                    <el-card class="side-panel-card">
                                        <template #header>
                                            <div class="extra-header">
                                                <span style="font-weight: bold;">{{ $t('travel-log.optional_dialogs') }}</span>
                                                <el-tag type="info" size="small">{{ visible_extra_talks.length }}</el-tag>
                                            </div>
                                        </template>
                                        <div v-if="visible_extra_talks.length > 0" class="extra-talks">
                                            <task-talk v-for="item in visible_extra_talks" :key="item.key"
                                                :ref="instance => set_talk_ref(`extra-${item.key}`, instance)"
                                                :talk="item.talk" :extra="true"
                                                :mode="talk_display_mode" :condition_values="optional_condition_values"
                                                :current_step="current_step_key" :step_keys="step_keys"
                                                @initial_conditions="set_talk_initial_conditions(`extra-${item.key}`, $event)" />
                                        </div>
                                    </el-card>
                                </el-splitter-panel>
                            </el-splitter>
                        </div>
                    </el-affix>
                </el-col>
            </el-row>
            <el-card v-if="task.operations?.some(operation => operation.type === 'item')" style="margin-top: 20px;">
                <template #header>{{ $t('travel-log.item_operation.rewards') }}</template>
                <task-item-operations :operations="task.operations" />
            </el-card>
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import { get_page_data } from '~/utils/page';
import type {
    Task,
    TaskPage,
    TalkDisplayMode,
    TaskStep,
    TaskCondition,
    TaskTalk,
    TaskNarration,
    TaskPages,
} from '~/types/travel_log';
import type { TaskConditionValues } from '~/utils/task_condition';
import { get_step_narrations } from '~/utils/task_narration';
import { build_task_flow, type TaskFlow, type TaskFlowSelections,
    type TaskFlowState } from '~/utils/task_flow';
import { Aim, Location, Lock } from '@element-plus/icons-vue';
import TaskTalkComponent from '~/components/TaskTalk.vue';
import { copy_dialog_text } from '~/utils/dialog_copy';

const route = useRoute();
const localePath = useLocalePath();
const task = ref<Task>();
const tasks = ref<TaskPages>([]);
const current_step_key = ref(0);
const current_step_fixed = ref(false);
const expanded_step_keys = ref<string[]>([]);
const condition_values = ref<TaskConditionValues>({});
const dialog_initial_conditions = ref<Record<string, TaskCondition[]>>({});
const flow_selections = ref<TaskFlowSelections>({});
const flow_input_values = ref<TaskConditionValues>({});
const scroll_container = ref<HTMLElement>();
const talk_display_mode = ref<TalkDisplayMode>('both');
const conditions_panel_size = ref<string | number>('45%');
const extra_talks_panel_size = ref<string | number>('55%');
const talk_display_mode_storage_key = 'travel_log_talk_display_mode_v2';
const talk_refs = new Map<string, InstanceType<typeof TaskTalkComponent>>();

function set_talk_ref(scope: string, instance: unknown) {
    if (instance) talk_refs.set(scope, instance as InstanceType<typeof TaskTalkComponent>);
    else talk_refs.delete(scope);
}

async function copy_task_dialogs() {
    await nextTick();
    const scopes = [
        ...steps.value.flatMap(item => [
            ...get_narrations(item.key, 'start').map(entry => `narration-${entry.key}`),
            ...get_step_talk_state(item).segments.filter(segment => segment.talk_key !== undefined)
                .map(segment => `step-${item.key}-${segment.talk_key}`),
            ...get_narrations(item.key, 'finish', 'failed').map(entry => `narration-${entry.key}`),
        ]),
        ...visible_extra_talks.value.map(item => `extra-${item.key}`),
    ];
    const text = scopes.map(scope => talk_refs.get(scope)?.get_dialog_text())
        .filter(Boolean).join('\n\n');
    await copy_dialog_text(text);
}

const task_names = computed<Record<string, string>>(() =>
    Object.fromEntries(tasks.value.map(item => [
        item.id,
        item.name || $t('travel-log.hidden_task'),
    ])));
const task_list_item = computed<TaskPage | undefined>(() =>
    tasks.value.find(item => item.id === route.params.name));

const display_mode_options = computed(() => [
    { label: $t('travel-log.display_mode.both'), value: 'both' },
    { label: $t('travel-log.display_mode.options'), value: 'options_only' },
    { label: $t('travel-log.display_mode.bubbles'), value: 'bubbles_only' },
]);

const steps = computed(() => {
    if (!task.value) return [];
    return Object.entries(task.value.steps)
        .map(([key, step]) => ({ key: Number(key), step }))
        .sort((left, right) => left.key - right.key);
});
const step_keys = computed(() => steps.value.map(item => item.key));

const selectable_conditions = computed<TaskCondition[]>(() => {
    const result = new Map<string, TaskCondition>();
    for (const narration of Object.values(task.value?.narrations || {})) {
        for (const token of narration.conditions) {
            if (typeof token !== 'string') result.set(JSON.stringify(token), token);
        }
    }
    for (const talk of Object.values(task.value?.talks || {})) {
        for (const token of talk.conditions) {
            if (typeof token === 'string') continue;
            if (token.type === 'step' && !token.task) continue;
            result.set(JSON.stringify(token), token);
        }
    }
    for (const item of steps.value) {
        for (const token of [...item.step.finish_conditions, ...(item.step.fail_conditions || [])]) {
            if (item.key !== current_step_key.value) continue;
            if (typeof token === 'string' || token.type === 'talk') continue;
            if (token.type === 'step' && !token.task) continue;
            if (step_talk_states.value.get(item.key)?.state.assigned.has(token.id)) continue;
            result.set(JSON.stringify(token), token);
        }
        for (const condition of get_step_talk_state(item).initial_conditions) {
            if (condition.type === 'step' && !condition.task) continue;
            result.set(JSON.stringify(condition), condition);
        }
    }
    for (const scope of active_condition_scopes.value) {
        for (const condition of dialog_initial_conditions.value[scope] || []) {
            if (step_talk_states.value.get(current_step_key.value)?.state.assigned.has(condition.id)) continue;
            result.set(JSON.stringify(condition), condition);
        }
    }
    return [...result.values()];
});

function get_narrations(step: number, ...events: TaskNarration['event'][]) {
    return get_step_narrations(task.value?.narrations || {}, step_talk_states.value,
        step_keys.value, condition_values.value, step, events);
}

const active_condition_scopes = computed(() => new Set([
    ...visible_extra_talks.value.map(item => `extra-${item.key}`),
]));

function set_talk_initial_conditions(scope: string, conditions: TaskCondition[]) {
    dialog_initial_conditions.value = {
        ...dialog_initial_conditions.value,
        [scope]: conditions,
    };
}

const visible_extra_talks = computed<{ key: number, talk: TaskTalk }[]>(() => {
    if (!task.value) return [];
    const keys = step_talk_states.value.get(current_step_key.value)?.optional_talk_keys || [];
    return keys.map(key => ({ key, talk: task.value!.talks[key]! }));
});

const optional_condition_values = computed(() =>
    step_talk_states.value.get(current_step_key.value)?.state.values || condition_values.value);

const step_talk_states = computed(() => {
    const result = new Map<number, TaskFlow>();
    if (!task.value) return result;
    let state: TaskFlowState = { values: { ...condition_values.value }, assigned: new Set(), completed: new Set() };
    for (const item of steps.value) {
        const flow = build_task_flow({
            task: task.value,
            step: item.step,
            current_step: item.key,
            step_keys: step_keys.value,
            state,
            selections: flow_selections.value,
            input_values: flow_input_values.value,
            include_optional: item.key === current_step_key.value,
        });
        state = flow.state;
        result.set(item.key, flow);
    }

    return result;
});

function get_step_talk_state(item: { key: number, step: TaskStep }) {
    return step_talk_states.value.get(item.key) || { segments: [], initial_conditions: [] };
}

function select_flow_option(key: string, value: unknown) {
    if (typeof value !== 'number') return;
    flow_selections.value = { ...flow_selections.value, [key]: value };
}

function select_current_step(step_key: number) {
    if (step_key !== current_step_key.value) {
        current_step_key.value = step_key;
        current_step_fixed.value = false;
        return;
    }
    current_step_fixed.value = !current_step_fixed.value;
}

function get_step_button_type(step_key: number) {
    if (step_key !== current_step_key.value) return 'default';
    return current_step_fixed.value ? 'warning' : 'primary';
}

function get_step_button_icon(step_key: number) {
    if (step_key !== current_step_key.value) return Aim;
    return current_step_fixed.value ? Lock : Location;
}

function get_step_button_title(step_key: number) {
    if (step_key !== current_step_key.value) return $t('travel-log.set_current_step');
    return current_step_fixed.value
        ? $t('travel-log.unfix_current_step')
        : $t('travel-log.fix_current_step');
}

function update_current_step_from_scroll() {
    if (current_step_fixed.value || !task.value || !scroll_container.value) return;
    const container_top = scroll_container.value.getBoundingClientRect().top;
    const activation_line = container_top + scroll_container.value.clientHeight * 0.2;
    let current_key: number | undefined;

    for (const item of steps.value) {
        const el = document.getElementById(`step-${item.key}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= activation_line) {
            current_key = item.key;
        } else {
            break;
        }
    }

    if (current_key !== undefined && current_key !== current_step_key.value) {
        current_step_key.value = current_key;
    }
}

function get_step_title(item: { key: number, step: TaskStep }) {
    if (item.step.hidden) return $t('travel-log.hidden_step');
    return item.step.description || `${$t('travel-log.step')} ${item.key}`;
}

const task_title = computed(() => task.value
    ? task.value.name || $t('travel-log.hidden_task')
    : $t('normal.loading'));

async function set_initial_step() {
    expanded_step_keys.value = steps.value.map(item => item.key.toString());
    const query_step = Number(route.query.step);
    const key = step_keys.value.includes(query_step) ? query_step : step_keys.value[0];
    if (key === undefined) return;

    current_step_key.value = key;
    current_step_fixed.value = false;
    if (route.hash !== `#step-${key}`) return;
    await nextTick();
    document.getElementById(`step-${key}`)?.scrollIntoView({ block: 'start' });
}

onMounted(async () => {
    const saved_mode = localStorage.getItem(talk_display_mode_storage_key) as TalkDisplayMode | null;
    if (saved_mode === 'both' || saved_mode === 'options_only' || saved_mode === 'bubbles_only') {
        talk_display_mode.value = saved_mode;
    }
    tasks.value = await get_tasks();
    const { items } = await get_page_data(
        route.params.name as string, async () => tasks.value || [], get_task,
    );
    task.value = items[0];
    const container = document.querySelector<HTMLElement>('.page-scrollbar .el-scrollbar__wrap');
    if (container) {
        scroll_container.value = container;
        container.addEventListener('scroll', update_current_step_from_scroll, { passive: true });
    }
    await set_initial_step();
    await nextTick();
    update_current_step_from_scroll();
});

onBeforeUnmount(() => {
    scroll_container.value?.removeEventListener('scroll', update_current_step_from_scroll);
});

watch(() => route.query.step, () => void set_initial_step());
watch(talk_display_mode, value => localStorage.setItem(talk_display_mode_storage_key, value));

useHead({
    title: task_title,
});
</script>

<style scoped>
.page-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: bold;
    font-size: 1.2em;
}

.copy-button {
    flex-shrink: 0;
    margin: 0;
}

.page-header-extra {
    display: flex;
    align-items: center;
    gap: 10px;
}

.task-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
}

.task-links a {
    color: var(--el-color-primary);
    text-decoration: none;
}

.task-workspace {
    width: 100%;
    row-gap: 20px;
    margin-top: 20px;
}

.task-steps {
    border-top: 0;
    border-bottom: 0;
}

.task-step-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    padding-right: 8px;
    color: var(--el-text-color-primary);
}

.task-step-name {
    min-width: 0;
    flex: 1 1 auto;
    overflow-wrap: anywhere;
}

.step-current-button {
    flex: 0 0 auto;
    margin-left: auto;
}

.task-step-title-hidden {
    color: var(--el-text-color-placeholder);
}

.step-talks,
.extra-talks {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.step-talks {
    margin-top: 12px;
}

.step-talk-selector {
    margin-bottom: 12px;
}

.extra-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.side-panel {
    box-sizing: border-box;
    width: 100%;
    height: calc(100vh - 40px);
    max-height: calc(100vh - 40px);
    overflow: hidden;
    padding-right: 4px;
}

.side-panel-splitter {
    width: 100%;
    height: 100%;
    min-height: 0;
}

.side-panel-section {
    box-sizing: border-box;
    min-height: 0;
    overflow: hidden !important;
}

.side-panel-card {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
}

.side-panel-card :deep(.el-card__body) {
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: auto;
}

.side-panel-affix {
    width: 100%;
}

:deep(.el-collapse-item__content) {
    padding-bottom: 20px;
}

@media (max-width: 1199px) {
    .side-panel {
        height: auto;
        max-height: none;
        overflow: visible;
        padding-right: 0;
    }

    .side-panel-splitter {
        height: min(600px, 70vh);
        min-height: 360px;
    }
}
</style>
