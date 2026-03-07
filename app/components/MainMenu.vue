<template>
    <el-menu
        :router="true"
    >
        <el-menu-item v-for="item in menu" :key="item.name" :index="localePath(item.path)">{{ $t(`menu.${item.name}`) }}</el-menu-item>
    </el-menu>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const menu = [
    { name: 'home', path: '/' },
    { name: 'character', path: '/character' },
    { name: 'weapon', path: '/weapon' },
    { name: 'artifact', path: '/artifact' },
    { name: 'material', path: '/material' },
    { name: 'living-being', path: '/living-being' },
    { name: 'geography', path: '/geography' },
    { name: 'travel-log', path: '/travel-log' },
    { name: 'book', path: '/book' },
    { name: 'readable', path: '/readable' },
    { name: 'settings', path: '/settings' },
]
</script>