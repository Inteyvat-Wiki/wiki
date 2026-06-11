<template>
    <el-row :gutter="50" style="width: 100%; row-gap: 10px;">
        <template v-for="(group, group_name) in conditions" :key="group_name">
            <el-col :span="24">
                <el-select :model-value="props.modelValue?.[group_name]"
                    @change="update_condition(group_name, $event)" style="width: 200px">
                    <el-option v-for="(option, option_name) of group" :key="option_name" :label="option_name"
                        :value="option_name">
                    </el-option>
                </el-select>
                <el-text v-if="props.modelValue?.[group_name] && group[props.modelValue[group_name]]?.description">
                    {{ group[props.modelValue[group_name]]?.description }}
                </el-text>
            </el-col>
        </template>
    </el-row>
</template>

<script setup lang="ts">
import type { MapConditions } from '~/types/map';

const props = defineProps<{
    modelValue: Record<string, string> | null,
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, string> | null): void,
}>()

const conditions = ref<MapConditions>();
const default_conditions = ref<Record<string, string> | null>(null);
onMounted(async () => {
    conditions.value = await get_map_conditions();
    default_conditions.value = await get_default_map_conditions() || {};
});

watchEffect(() => {
    if (!props.modelValue) {
        emit('update:modelValue', default_conditions.value);
    }
});

function update_condition(key: string, value: string) {
    const new_value = { ...(props.modelValue || {}) };
    new_value[key] = value;

    emit('update:modelValue', Object.keys(new_value).length > 0 ? new_value : null);
}

</script>