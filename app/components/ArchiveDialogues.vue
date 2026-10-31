<template>
    <npc-dialogue-workspace :npc="npc" show-restart />
</template>

<script setup lang="ts">
import type { ArchiveItem } from '~/types/archive';
import type { Npc } from '~/types/npc';

const props = defineProps<{ item: ArchiveItem }>();
const npc = computed<Npc>(() => ({ name: props.item.name, npc_id: 0, birth_points: [], diagnostics: [],
    entry_talks: props.item.entry_talks,
    talks: Object.fromEntries(Object.entries(props.item.talks).map(([key, talk]) => [key, {
        ...talk, task: null, active_mode: '', source: props.item.source.table,
    }])),
}));
</script>
