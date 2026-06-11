<template>
    <el-container class="layout">
        <el-aside width="200px">
            <el-container class="layout">
                <el-header>
                    <p>Inteyvat Wiki</p>
                </el-header>
                <el-main>
                    <MainMenu />
                </el-main>
                <el-footer>
                    <LanguageSwitcher />
                </el-footer>
            </el-container>
        </el-aside>
        <el-scrollbar style="width: 100%;" v-if="$route.path != '/map'">
            <el-main>
                <NuxtPage :key="$route.path" />
            </el-main>
        </el-scrollbar>
        <template v-else>
            <NuxtPage :key="$route.path" />
        </template>
    </el-container>
</template>

<script setup lang="ts">
import { init_settings } from '~/utils/settings';

onMounted(() => {
    init_settings();
});
</script>

<style>
body {
    overflow: hidden;
}

.layout {
    display: flex;
    height: 100vh;
}
</style>