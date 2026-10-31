import type { TaskTalk } from '../types/travel_log';

export function get_talk_first_line(talk: TaskTalk & { title?: string }): string {
    // NPC/archive titles come from the source initDialog (the menu prompt).
    // The interaction's entry can instead be the first NPC response after that prompt.
    if (talk.title) return talk.title;
    const initial = talk.initial_dialogs?.[0]?.dialog;
    return (initial === undefined ? Object.values(talk.dialogs)[0] : talk.dialogs[initial])?.content || '';
}
