<template>
    <el-table :data="rows" row-key="id" :span-method="span_method" border class="loading-situations">
        <el-table-column prop="action" :label="$t('misc.loading.action')" min-width="140">
            <template #default="{ row }">{{ $t(`misc.loading.actions.${row.action}`) }}</template>
        </el-table-column>
        <el-table-column :label="$t('misc.loading.conditions')" min-width="240">
            <template #default="{ row }">
                <div v-for="field in row.fields" :key="field.key" class="situation-field">
                    <span class="field-label">{{ field.label }}：</span>
                    <span>{{ field.text }}</span>
                </div>
            </template>
        </el-table-column>
        <el-table-column :label="$t('misc.images.loading_background')" width="144" align="center">
            <template #default="{ row }">
                <div v-if="row.image?.url" class="round_icon_with_bg situation-image">
                    <el-image :src="row.image.url" :preview-src-list="[row.image.url]" :alt="$t('misc.images.loading_background')"
                        fit="contain" loading="lazy" preview-teleported hide-on-click-modal>
                        <template #error><el-text type="info">{{ $t('archive.image_failed') }}</el-text></template>
                    </el-image>
                </div>
            </template>
        </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import type { LoadingSituation } from '~~/shared/misc';
import { loading_situation_table_rows, type LoadingSituationTableRow } from '~~/shared/loading_situations';
const props = defineProps<{ situations: LoadingSituation[] }>();
const { t } = useI18n();
const rows = computed(() => loading_situation_table_rows(props.situations, (key, values) => t(key, values || {})));
function span_method({ row, columnIndex }: { row: LoadingSituationTableRow; columnIndex: number }) {
    const span = columnIndex === 0 ? row.action_span : columnIndex === 2 ? row.image_span : 1;
    return [span, span ? 1 : 0];
}
</script>

<style scoped>
.loading-situations { width: 100%; }
.loading-situations :deep(.el-table__cell) { vertical-align: top; }
.situation-image { width: 120px; height: 120px; max-width: 100%; flex: 0 0 auto; padding: 8px; box-sizing: border-box; border-radius: 4px; }
.situation-image .el-image { width: 100%; height: 100%; cursor: zoom-in; }
.situation-field { overflow-wrap: anywhere; }
.field-label { color: var(--el-text-color-secondary); }
</style>
