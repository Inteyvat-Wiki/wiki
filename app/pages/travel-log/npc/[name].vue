<template>
    <el-container v-if="npc">
        <el-main>
            <el-page-header @back="navigateTo(localePath('/travel-log'))">
                <template #content>{{ npc.name }}</template>
                <template #extra>
                    <el-button @click="dialogue_workspace?.restart()">{{ $t('travel-log.npc_restart') }}</el-button>
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
            <npc-dialogue-workspace ref="dialogue_workspace" :npc="npc" show-related-task class="npc-workspace" />
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { Npc } from '~/types/npc';

const route = useRoute();
const localePath = useLocalePath();
const npc = ref<Npc>();
const dialogue_workspace = ref<{ restart: () => void }>();

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
    margin-top: 20px;
}
</style>
