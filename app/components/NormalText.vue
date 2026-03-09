<template>
    <div style="position: relative; padding-right: 25px;">
        <el-text>
            <div ref="content" v-html="text"></div>
        </el-text>
        <el-button :icon="ElIconDocumentCopy" size="small" circle style="position: absolute; top: 0px; right: 0px;"
            @click="copy" />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    text: string,
}>();

const content = ref();
const copy = () => {
    const text = content.value.innerText;
    navigator.clipboard.writeText(text);
    ElMessage({
        message: $t("normal.copied"),
        type: 'success',
        plain: true,
    })
};
</script>