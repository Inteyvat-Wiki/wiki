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
        <el-scrollbar>
            <el-main>
                <NuxtPage />
            </el-main>
        </el-scrollbar>
    </el-container>
</template>

<style>
body {
    overflow: hidden;
}

.layout {
    display: flex;
    height: 100vh;
}
</style>