import type { TaskNarration } from '@inteyvat-wiki/wiki-contracts/task';
export type * from '@inteyvat-wiki/wiki-contracts/task';
export type * from '@inteyvat-wiki/wiki-contracts/chapter_group';

// UI preferences and display adapters are local, not exported data.
export type TalkDisplayMode = 'both' | 'options_only' | 'bubbles_only';
export type TaskBubbleSubtitle = Omit<TaskNarration, 'type'> & { type: 'speech_bubble', delay_unknown?: true };
