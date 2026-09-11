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
        <el-scrollbar class="page-scrollbar" v-if="$route.path != '/map'">
            <div class="page-content">
                <NuxtPage :key="$route.path" />
            </div>
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

.page-scrollbar {
    width: 100%;
}

.page-content {
    min-height: 100%;
}

.page-scrollbar .el-main {
    overflow: visible;
}
</style>
