<template>
    <div style="display: flex; align-items: center;">
        <div v-if="icon" :class="need_background ? 'round_icon_with_bg' : 'round_icon'" style="width: 50px; height: 50px; margin-right: 12px;" >
            <el-image :src="icon" :preview-src-list="[icon]" hide-on-click-modal fit="cover"/>
        </div>
        <span style="font-weight: bold; font-size: 1.2em; white-space: nowrap;">
            {{ title }}
        </span>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    title: string;
    icon: string | null;
    need_background?: boolean;
}>();
</script>