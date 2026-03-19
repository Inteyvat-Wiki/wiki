<template>
    <div style="display: flex; align-items: center;">
        <el-image src="/inteyvat.png" style="width: 100px; height: 100px;" />
        <span style="font-size: 24px; font-weight: bold; margin-left: 20px;">{{ $t('menu.title') }}</span>
    </div>
    <el-row :gutter="50" style="width: 100%; row-gap: 50px; margin-top: 50px;">
        <el-col v-for="item in menu" :key="item.name" :xs="24" :sm="24" :md="12" :lg="8">
            <NuxtLink :to="item.path" style="text-decoration: none;">
                <el-card>
                    <title-with-icon :icon="menu_icon?.[item.name as any]?.icon" :title="$t(`menu.${item.name}`)" />
                </el-card>
            </NuxtLink>
        </el-col>
    </el-row>
</template>

<script lang="ts" setup>
import type { Menu } from '~/types/menu';
import { get_menu } from '~/utils/api';

const menu = [
    { name: 'character', path: '/character' },
    { name: 'weapon', path: '/weapon' },
    { name: 'artifact', path: '/artifact' },
    { name: 'material', path: '/material' },
    { name: 'living-being', path: '/living-being' },
    { name: 'geography', path: '/geography' },
    { name: 'travel-log', path: '/travel-log' },
    { name: 'book', path: '/book' },
    { name: 'readable', path: '/readable' },
]

const menu_icon = ref<Menu>();

onMounted(async () => {
    menu_icon.value = await get_menu();
});

useHead({
    title: $t('menu.home'),
})
</script>