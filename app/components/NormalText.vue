<template>
    <div :class="props.border ? 'quote-box' : ''" style="position: relative; padding-right: 25px;">
        <el-text>
            <div ref="content" v-html="text"></div>
        </el-text>
        <el-button :icon="ElIconDocumentCopy" size="small" circle
            :style="`position: absolute; top: ${props.border ? 10 : 0}px; right: ${props.border ? 10 : 0}px;`"
            @click="copy" />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    text: string,
    border?: boolean,
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

<style lang="css" scoped>
.quote-box {

    border-left: 4px solid var(--el-color-info-light-7);
    background: var(--el-fill-color-light);
    padding: 10px 14px;
    margin: 10px 0;
    border-radius: 4px;
}
</style>