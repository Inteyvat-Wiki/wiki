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

export type ChapterGroups = ChapterGroup[];

export type TaskSummary = {
    id: string,
    name: string | null,
    description: string | null,
    chapter: string | null,
    type: TaskType,
};

export type Tasks = TaskSummary[];

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

export type TaskDialogSetOperation = {
    type: 'set',
    id: string,
    value: number | boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskDialogInputOperation = {
    type: 'input',
    id: string,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskDialogOperation = TaskDialogSetOperation | TaskDialogInputOperation;

export type TaskDialog = {
    content: string,
    role: 'npc' | 'select' | 'black_screen' | 'text',
    speaker?: string,
    speaker_subtitle?: string,
    next_dialogs: TaskDialogNext[],
    operations?: TaskDialogOperation[],
};

export type TaskTriggerPoint = {
    scene_id: number,
    point_id?: number,
    position: [number, number, number],
};

export type TaskTalk = {
    priority: number,
    conditions: TaskConditionToken[],
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    initial_dialogs?: TaskDialogNext[],
    dialogs: Record<string, TaskDialog>,
};

export type TaskStep = {
    hidden: boolean,
    description: string,
    talks: number[],
};

export type Task = {
    name: string | null,
    description: string | null,
    unlock_description: string | null,
    chapter: string | null,
    previous_tasks: string[],
    suggested_tasks: string[],
    steps: Record<string, TaskStep>,
    talks: Record<string, TaskTalk>,
};
