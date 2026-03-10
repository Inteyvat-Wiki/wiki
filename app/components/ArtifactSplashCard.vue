<template>
    <el-row justify="center">
        <el-col v-for="item in artifact_item" :key="item.name" :span="Math.floor(24 / artifact_item.length)">
            <el-image :src="item.icon" :preview-src-list="[item.icon]" hide-on-click-modal
                style="width: 100%; height: auto; display: block; object-fit: contain;" />
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
import type { Artifact, ArtifactItem } from '~/types/artifact';

const props = defineProps<{
    artifact: Artifact;
}>();

const artifact_item_name = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const artifact_item = computed(() => {
    return artifact_item_name.map((item_name) => {
        return props.artifact[item_name as keyof Artifact] as ArtifactItem;
    });
});

</script>