<template>
    <el-container v-if="artifact">
        <el-main>
            <div id="basic-info">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <artifact-basic-info-card :artifact="artifact" />
                        </el-card>
                    </el-col>
                    <el-col :span="24" :lg="12">
                        <el-card>
                            <artifact-splash-card :artifact="artifact" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div v-if="artifact.effect" id="effect" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col :span="24">
                        <el-card>
                            <artifact-effect-card :effect="artifact.effect" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
            <div id="story" style="margin-top: 20px;">
                <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                    <el-col v-for="item in artifact_item" :span="24">
                        <el-card>
                            <artifact-story-card :artifact_item="item" />
                        </el-card>
                    </el-col>
                </el-row>
            </div>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60">
                <el-anchor :offset="70">
                    <el-anchor-link :href="`#basic-info`">
                        {{ $t('artifact.basic-info') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#effect`">
                        {{ $t('artifact.effect') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#story`">
                        {{ $t('artifact.story') }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
</template>

<script setup lang="ts">
import ArtifactBasicInfoCard from '~/components/ArtifactBasicInfoCard.vue';
import type { Artifact, ArtifactItem } from '~/types/artifact';

const artifact = ref<Artifact>();

onMounted(async () => {
    artifact.value = await getArtifact(useRoute().params.name as string);
});

const artifact_item_name = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const artifact_item = computed(() => {
    return artifact_item_name.map((item_name) => {
        return artifact.value?.[item_name as keyof Artifact] as ArtifactItem;
    });
});
</script>