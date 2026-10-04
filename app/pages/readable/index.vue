<template>
    <el-container v-if="readables">
        <el-main>
            <el-input v-model="search" :placeholder="$t('readable.search')" clearable
                style="margin-bottom: 20px;" />
            <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="readable in show_readable_list" :key="readable.id">
                    <NuxtLink :to="localePath(`/readable/${readable.id}`)" style="text-decoration: none;">
                        <el-card shadow="hover">
                            <inline-text :text="readable.name" />
                        </el-card>
                    </NuxtLink>
                </el-col>
            </el-row>
            <el-empty v-if="show_readable_list.length === 0" :description="$t('readable.no_results')" />
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { Readables } from '~/types/readable';

const localePath = useLocalePath();
const readables = ref<Readables>();
const search = ref('');
const show_readable_list = computed(() => (readables.value || []).filter(readable =>
    readable.name.toLowerCase().includes(search.value.trim().toLowerCase())
));

onMounted(async () => {
    readables.value = await get_readables();
});

useHead({ title: $t('menu.readable') });
</script>
