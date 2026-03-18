<template>
    <el-row justify="center">
        <el-col v-for="item in artifact_item" :key="item.name" :span="4">
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
    return artifact_item_name.reduce((result: ArtifactItem[], name) => {
        const item = props.artifact[name as keyof Artifact];
        if (item) {
            result.push(item as ArtifactItem);
        }
        return result;
    }, []);
});

</script>