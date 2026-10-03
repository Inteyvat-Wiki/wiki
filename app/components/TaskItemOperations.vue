<template>
    <div v-if="item_operations.length" class="item-operations">
        <div v-for="(operation, index) in item_operations" :key="index" class="item-operation">
            <div class="operation-label">
                <el-text type="info">{{ $t(`travel-log.item_operation.${operation.action}`) }}</el-text>
                <el-text v-if="operation.action === 'give' && operation.remove" type="info" size="small">
                    {{ $t('travel-log.item_operation.consumed') }}
                </el-text>
            </div>
            <div class="operation-items">
                <div v-for="item in operation.items" :key="item.id" class="operation-item">
                    <NuxtLink v-if="item.page" :to="localePath(`/travel-log/quest-item/${item.page}`)" custom
                        v-slot="{ href, navigate }">
                        <el-link :href="href ?? undefined" :underline="false" class="item-link" @click="navigate">
                            <img v-if="item.icon" :src="item.icon" alt="" class="item-icon" />
                            <span v-if="item.name" v-html="item.name"></span>
                            <span v-else>{{ $t('travel-log.item_operation.item_id', { id: item.id }) }}</span>
                        </el-link>
                    </NuxtLink>
                    <template v-else>
                        <img v-if="item.icon" :src="item.icon" alt="" class="item-icon" />
                        <el-text>
                            <span v-if="item.name" v-html="item.name"></span>
                            <span v-else>{{ $t('travel-log.item_operation.item_id', { id: item.id }) }}</span>
                        </el-text>
                    </template>
                    <el-text type="info" size="small">
                        {{ item.count === null ? $t('travel-log.item_operation.all') : `×${item.count}` }}
                    </el-text>
                </div>
                <template v-if="operation.choices?.length">
                    <el-text type="info" size="small">
                        {{ $t('travel-log.item_operation.choose', { count: operation.count ?? 1 }) }}
                    </el-text>
                    <div class="choice-items">
                        <template v-for="item in operation.choices" :key="item.id">
                            <NuxtLink v-if="item.page" :to="localePath(`/travel-log/quest-item/${item.page}`)" custom
                                v-slot="{ href, navigate }">
                                <el-link :href="href ?? undefined" :underline="false" class="item-link" @click="navigate">
                                    <img v-if="item.icon" :src="item.icon" alt="" class="item-icon" />
                                    <span v-if="item.name" v-html="item.name"></span>
                                    <span v-else>{{ $t('travel-log.item_operation.item_id', { id: item.id }) }}</span>
                                </el-link>
                            </NuxtLink>
                            <el-text v-else>
                                <span v-if="item.name" v-html="item.name"></span>
                                <span v-else>{{ $t('travel-log.item_operation.item_id', { id: item.id }) }}</span>
                            </el-text>
                        </template>
                    </div>
                </template>
                <el-text v-if="!operation.items.length && !operation.choices?.length" type="info" size="small">
                    {{ $t('travel-log.item_operation.giving_id', { id: operation.giving_id ?? '?' }) }}
                </el-text>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { TaskOperation, TaskItemOperation } from '~/types/travel_log';

const props = defineProps<{ operations?: TaskOperation[] }>();
const localePath = useLocalePath();
const item_operations = computed(() => (props.operations || [])
    .filter((operation): operation is TaskItemOperation => operation.type === 'item'));
</script>

<style scoped>
.item-operations {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 12px 0;
}
.item-operation {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--el-border-color-lighter);
}
.operation-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 0 0 72px;
}
.operation-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}
.operation-item, .choice-items {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    overflow-wrap: anywhere;
}
.item-icon {
    width: 28px;
    height: 28px;
    object-fit: contain;
    flex-shrink: 0;
}
.item-link {
    max-width: 100%;
    padding: 2px 4px;
    margin: -2px -4px;
    border-radius: 4px;
    font-size: inherit;
    transition: background-color 0.15s;
}
.item-link:hover {
    background-color: var(--el-fill-color-light);
}
.item-link :deep(.el-link__inner) {
    gap: 6px;
    min-width: 0;
}
.item-link :deep(.el-link__inner > span) {
    overflow-wrap: anywhere;
}
</style>
