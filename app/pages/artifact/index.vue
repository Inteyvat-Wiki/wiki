<template>
    <el-container v-if="artifacts">
        <el-main>
            <el-row :gutter="50" style="width: 100%; row-gap: 50px;">
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="artifact in show_artifact_list" :key="artifact.id">
                    <NuxtLink :to="`/artifact/${artifact.id}`" style="text-decoration: none;">
                        <avatar-display-card :title="artifact.name" :icon="artifact.icon" :border_star="Math.max(...artifact.stars)" />
                    </NuxtLink>
                </el-col>
                <el-col :xs="12" :sm="12" :md="8" :lg="4" v-for="i in 24" :key="i" style="height: 0px;">
                </el-col>
            </el-row>
        </el-main>
        <el-aside width="100px" style="overflow-x: hidden;">
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import type { Artifacts } from '~/types/artifacts';

const artifacts = ref<Artifacts>();

onMounted(async () => {
    artifacts.value = await getArtifacts();
});

const show_artifact_list = computed(() => {
    if (!artifacts.value) return [];
    return artifacts.value.filter((artifact) => {
        return true;
    }).reverse();
});

</script>