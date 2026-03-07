<template>
    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
        <el-col :md="24" :lg="skill.details ? 12: 24">
            <el-card style="height: 100%;">
                <title-with-icon :title="skill.title" :icon="skill.icon" :need_background="true"
                    style="transform-origin: left center; transform: scale(0.8); margin-top: -10px;" />
                <div v-if="skill.sub_title" style="font-size: 14px; color: var(--el-text-color-secondary);">
                    {{ skill.sub_title }}
                </div>
                <br>
                <div v-html="skill.description"></div>
            </el-card>
        </el-col>
        <el-col :md="24" :lg="12" v-if="skill.details">
            <el-card style="height: 100%;">
                <el-descriptions border :column="1">
                    <template #title>
                        <el-input-number v-model="skill_level" :min="1" :max="15">
                            <template #prefix>Lv</template>
                        </el-input-number>
                    </template>
                    <el-descriptions-item v-for="detail in skill.details" :key="detail.title" :label="detail.title">
                        {{ detail.value[skill_level - 1] }}
                    </el-descriptions-item>
                </el-descriptions>
            </el-card>
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
const props = defineProps<{
    skill: {
        title: string,
        sub_title: string | null,
        icon: string,
        description: string,
        details: {
            title: string,
            value: string[],
        }[] | null,
    }
}>();

const skill_level = ref(10);
</script>