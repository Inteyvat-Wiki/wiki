<template>
    <div v-if="total > size" class="list-pagination">
        <span class="page-range">{{ (page - 1) * size + 1 }}–{{ Math.min(page * size, total) }} / {{ total }}</span>
        <el-pagination :current-page="page" :page-size="size" :total="total" :pager-count="5"
            layout="prev, pager, next, jumper" background @update:current-page="$emit('change', $event)" />
    </div>
</template>

<script setup lang="ts">
defineProps<{ page: number; size: number; total: number }>();
defineEmits<{ change: [page: number] }>();
</script>

<style scoped>
.list-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0; }
.page-range { color: var(--el-text-color-secondary); font-size: 13px; font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
    .list-pagination { justify-content: center; }
    .page-range { width: 100%; text-align: center; }
    .list-pagination :deep(.el-pagination__jump) { display: none; }
}
</style>
