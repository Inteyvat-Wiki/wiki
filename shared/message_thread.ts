import type { MiscMessageNode, MiscMessageThread } from './misc';

export type MessagePathItem = { kind: 'message'; node: MiscMessageNode }
    | { kind: 'choices'; key: string; options: MiscMessageNode[]; selected?: string };

export function message_continues(path: MessagePathItem[], index: number): boolean {
    const current = path[index], previous = path[index - 1];
    return current?.kind === 'message' && previous?.kind === 'message'
        && current.node.speaker === previous.node.speaker;
}

// Changing an earlier reply starts a fresh branch; never replay old later replies.
export function select_message_reply(thread: MiscMessageThread, selections: Record<string, string>, key: string, option: string): Record<string, string> {
    const kept: Record<string, string> = {};
    for (const item of message_thread_path(thread, selections)) {
        if (item.kind !== 'choices') continue;
        if (item.key === key) {
            if (!item.options.some(node => node.id === option)) throw new Error(`Invalid message reply: ${option}`);
            if (item.selected === option) return selections;
            return { ...kept, [key]: option };
        }
        if (item.selected) kept[item.key] = item.selected;
    }
    throw new Error(`Unavailable message choice: ${key}`);
}

// Follow the source graph; branch requirements are fulfilled only by choices on this path.
export function message_thread_path(thread: MiscMessageThread, selections: Record<string, string>): MessagePathItem[] {
    const nodes = new Map(thread.nodes.map(node => [node.id, node]));
    const chosen = new Set<string>(), visited = new Set<string>(), items: MessagePathItem[] = [];
    let pending = thread.initial;
    while (pending.length) {
        const eligible = pending.map(id => {
            const node = nodes.get(id);
            if (!node) throw new Error(`Missing message node: ${id}`);
            return node;
        }).filter(node => !node.requires || chosen.has(node.requires));
        if (!eligible.length) break;
        const options = eligible.filter(node => node.kind === 'option');
        let node: MiscMessageNode;
        if (options.length) {
            if (options.length !== eligible.length) throw new Error('Mixed message/option successors');
            const key = options.map(node => node.id).join('|');
            const selected = options.find(node => node.id === selections[key]);
            items.push({ kind: 'choices', key, options, selected: selected?.id });
            if (!selected) break;
            chosen.add(selected.id);
            node = selected;
        } else {
            if (eligible.length !== 1) throw new Error('Ambiguous message branch');
            node = eligible[0]!;
            if (node.kind !== 'control' && (node.text || node.image?.url || node.location)) items.push({ kind: 'message', node });
        }
        if (visited.has(node.id)) throw new Error(`Message cycle: ${node.id}`);
        visited.add(node.id);
        pending = node.next;
    }
    return items;
}
