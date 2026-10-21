import type { PageDataTrait } from "~/types/common";

export type TaskType = 'archon_quests' | 'story_quests' | 'hangout_quests'
    | 'event_quests' | 'world_quests' | 'commission_quests';

export type TalkDisplayMode = 'both' | 'options_only' | 'bubbles_only';

export type Chapter = {
    id: string,
    name: string,
    icon: string,
    tasks: string[],
};

export type ChapterGroup = {
    id: string,
    type: Exclude<TaskType, 'commission_quests'>,
    name: string,
    chapters: Chapter[],
};

export interface ChapterGroupPage extends PageDataTrait {
    type: ChapterGroup['type'];
    chapter_count: number;
    task_count: number;
}

export type ChapterGroupPages = ChapterGroupPage[];

export interface TaskPage extends PageDataTrait {
    hidden: boolean;
    description: string | null;
    chapter: string | null;
    type: TaskType;
}

export type TaskPages = TaskPage[];

export type TaskState = 'unstarted' | 'ongoing' | 'finished' | 'failed';
export type TaskComparison = 'equal' | 'not_equal' | 'greater' | 'greater_equal' | 'less' | 'less_equal';

export type TaskConditionBase = {
    id: string,
    title: string,
    subtitle: string,
};

export type TaskStepCondition = TaskConditionBase & {
    type: 'step',
    task: string | null,
    step: number,
    state?: TaskState,
};

export type TaskNumberCondition = TaskConditionBase & {
    type: 'number',
    value: number,
    comparison: TaskComparison,
};

export type TaskBooleanCondition = TaskConditionBase & {
    type: 'boolean',
    value: boolean,
};

export type TaskCondition = TaskStepCondition | TaskNumberCondition | TaskBooleanCondition;
export type TaskValueCondition = TaskNumberCondition | TaskBooleanCondition;
export type TaskConditionToken = TaskCondition | 'and' | 'or' | 'not';
export type TaskFinishConditionToken = TaskConditionToken | { type: 'talk', talk: number };

export type TaskDialogBranch = {
    id: string,
    type: 'random' | 'result',
    option: number,
};

export type TaskDialogNext = {
    dialog: number,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskVariableOperation = {
    type: 'variable',
    action: 'set' | 'input',
    id: string,
    value?: number | boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskItemOperation = {
    type: 'item',
    action: 'obtain' | 'give' | 'remove',
    items: { id: number, count: number | null, name?: string, icon?: string, page?: string }[],
    choices?: { id: number, name?: string, icon?: string, page?: string }[],
    count?: number,
    giving_id?: number,
    reward_id?: number,
    remove?: boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskOperation = TaskVariableOperation | TaskItemOperation;

export type TaskDialog = {
    actions?: { type: string, timing: 'before' | 'while' | 'after', source: string }[],
    content: string,
    role: 'npc' | 'select' | 'black_screen' | 'text',
    speaker?: string,
    speaker_subtitle?: string,
    next_dialogs: TaskDialogNext[],
    operations?: TaskOperation[],
};

export type TaskTriggerPoint = {
    scene_id: number,
    point_id?: number,
    position: [number, number, number],
};

export type TaskTalk = {
    operations?: TaskOperation[],
    priority: number,
    begin_way: 'manual' | 'auto' | null,
    next_talks: number[],
    trigger_ids: string[],
    conditions: TaskConditionToken[],
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    initial_dialogs?: TaskDialogNext[],
    dialogs: Record<string, TaskDialog>,
};

export type TaskStep = {
    operations?: TaskOperation[],
    hidden: boolean,
    description: string,
    talks: number[],
    finish_conditions: TaskFinishConditionToken[],
    fail_conditions: TaskFinishConditionToken[],
};

export type Task = {
    operations?: TaskOperation[],
    name: string | null,
    description: string | null,
    unlock_description: string | null,
    chapter: string | null,
    previous_tasks: string[],
    suggested_tasks: string[],
    steps: Record<string, TaskStep>,
    talks: Record<string, TaskTalk>,
    narrations: Record<string, TaskNarration>,
};

export type TaskNarration = {
    type: 'narration',
    step: number,
    event: 'start' | 'finish' | 'failed',
    source: string,
    delay?: number,
    after?: string,
    conditions: TaskConditionToken[],
    dialogs: Record<string, TaskDialog & { duration?: number }>,
};
