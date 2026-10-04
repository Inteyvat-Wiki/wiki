<template>
    <el-container v-if="books">
        <el-main>
            <el-row :gutter="20" style="width: 100%; row-gap: 20px; margin-bottom: 20px;">
                <el-col :xs="24" :sm="12">
                    <el-input v-model="search" :placeholder="$t('book.search')" clearable />
                </el-col>
                <el-col :xs="24" :sm="12">
                    <el-select v-model="selected_set" :placeholder="$t('book.all_collections')" clearable filterable
                        style="width: 100%;">
                        <el-option v-for="set in sets" :key="set" :label="set" :value="set" />
                    </el-select>
                </el-col>
            </el-row>
            <el-row :gutter="20" style="width: 100%; row-gap: 20px;">
                <el-col :xs="12" :sm="8" :md="6" :lg="3" v-for="book in show_book_list" :key="book.id">
                    <NuxtLink :to="localePath(`/book/${book.id}`)" style="text-decoration: none;">
                        <avatar-display-card :title="book.name" :icon="book.icon" font_size="1.0em" />
                    </NuxtLink>
                </el-col>
            </el-row>
            <el-empty v-if="show_book_list.length === 0" :description="$t('book.no_results')" />
        </el-main>
    </el-container>
</template>

<script setup lang="ts">
import type { Books } from '~/types/book';

const localePath = useLocalePath();
const books = ref<Books>();
const search = ref('');
const selected_set = ref('');
const sets = computed(() => [...new Set(books.value?.map(book => book.set).filter(Boolean) || [])]);
const show_book_list = computed(() => (books.value || []).filter(book =>
    (!selected_set.value || book.set === selected_set.value)
    && `${book.name} ${book.set}`.toLowerCase().includes(search.value.trim().toLowerCase())
));

onMounted(async () => {
    books.value = await get_books();
});

useHead({ title: $t('menu.book') });
</script>
