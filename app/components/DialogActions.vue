<template>
    <div v-if="actions?.length" class="dialog-actions">
        <el-tag v-for="(action, index) in actions" :key="index" type="info" effect="plain">
            {{ $t(`travel-log.npc_actions.${action.type}`) }}
        </el-tag>
    </div>
</template>

<script setup lang="ts">
import type { TaskDialog } from '~/types/travel_log';
defineProps<{ actions?: TaskDialog['actions'] }>();
</script>

<style scoped>
.dialog-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
