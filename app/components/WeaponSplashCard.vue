<template>
    <el-row>
        <el-col :span="2" />
        <el-col :span="8">
            <el-image :src="weapon.icon" :preview-src-list="[weapon.icon]" hide-on-click-modal
                style="width: 100%; height: auto; display: block; object-fit: contain;" />
        </el-col>
        <el-col :span="4" />
        <el-col :span="8">
            <el-image :src="weapon.awaken_icon" :preview-src-list="[weapon.awaken_icon]" hide-on-click-modal
                style="width: 100%; height: auto; display: block; object-fit: contain;" />
        </el-col>
        <el-col :span="2" />
    </el-row>
</template>

<script setup lang="ts">
import type { Weapon } from '~/types/weapon';

const props = defineProps<{
    weapon: Weapon;
}>();
</script>