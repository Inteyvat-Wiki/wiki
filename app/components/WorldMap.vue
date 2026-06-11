<template>
    <client-only>
        <LMap :use-global-leaflet="false" crs="Simple" :center="[0, 0]" :zoom="-2" :min-zoom="-5" :max-bounds="process_coordinates([
            { x: index_scope.min_x, y: index_scope.min_y },
            { x: index_scope.max_x, y: index_scope.max_y },
        ])" :options="{
            attributionControl: false
        }" style="height: 100%; width: 100%; background-color: #000;" @update:center="update_center"
            @ready="onMapReady">
            <template v-if="isFinite(index_scope.min_x)">
                <LPolygon v-for="rect in frame_rects" :key="rect.key" :lat-lngs="process_coordinates(rect.points)"
                    :pane="'dim-pane'" :color="'#000'" :fill-color="'#000'" :fill-opacity="1" :interactive="false" />
            </template>
            <template v-for="image in mapback?.images">
                <LImageOverlay v-if="check_condition(image.shown_condition)" :key="image.image" :url="image.image"
                    :bounds="process_coordinates(image.coordinate)" :z-index="image.z_index" />
            </template>
            <template v-if="focused_layer_name">
                <LPolygon :lat-lngs="process_coordinates([
                    { x: index_scope.min_x, y: index_scope.min_y },
                    { x: index_scope.max_x, y: index_scope.min_y },
                    { x: index_scope.max_x, y: index_scope.max_y },
                    { x: index_scope.min_x, y: index_scope.max_y }
                ])" :pane="'dim-pane'" :color="'#000'" :fill-color="'#000'" :fill-opacity="0.5" :interactive="false" />
            </template>
            <template v-if="maplayer && focused_layer_name">
                <template v-for="layer of maplayer.layers">
                    <template v-for="image in layer.images">
                        <LImageOverlay v-if="check_condition(image.shown_condition)"
                            :key="image.image + (layer.name == focused_layer_name ? '_focus' : '')" :url="image.image"
                            :bounds="process_coordinates(image.coordinate)"
                            :pane="layer.name == focused_layer_name ? 'focus-pane' : undefined"
                            :z-index="image.z_index" />
                    </template>
                </template>
            </template>
        </LMap>
    </client-only>
</template>


<script setup lang="ts">
import type { MapList, Mapback, Maplayer } from '~/types/map';


const props = defineProps<{
    region: string,
    focused_layer_name: string | null,
    current_conditions: Record<string, string> | null,
}>();

const emit = defineEmits<{
    (e: 'update_center', value: { x: number, y: number } | null): void,
}>();

const map_list = ref<MapList>();
const layer_group_names = ref<Record<string, string>>({});
const default_conditions = ref<Record<string, string> | null>(null);

onMounted(async () => {
    map_list.value = await get_map_list();
    default_conditions.value = await get_default_map_conditions() || {};

    for (const region in map_list.value) {
        for (const group_name in map_list.value[region]) {
            for (const layer of map_list.value[region][group_name]?.layers || []) {
                if (layer.name) {
                    layer_group_names.value[layer.name] = group_name;
                }
            }
        }
    }
});

function get_group_name(layer_name: string | null): string | null {
    return layer_name ? layer_group_names.value[layer_name] || null : null;
}

function check_condition(condition: string | undefined): boolean {
    if (!condition) return true;
    return RegExp(condition).test(JSON.stringify(props.current_conditions || default_conditions.value || {}));
}

const mapback = ref<Mapback>();
const maplayer = ref<Maplayer | null>();
onMounted(async () => {
    mapback.value = await get_mapback(props.region);
    maplayer.value = get_group_name(props.focused_layer_name) ? await get_maplayer(get_group_name(props.focused_layer_name)) : null;
});
watch(() => props.region, async () => {
    mapback.value = await get_mapback(props.region);
});
watch(() => get_group_name(props.focused_layer_name), async () => {
    maplayer.value = get_group_name(props.focused_layer_name) ? await get_maplayer(get_group_name(props.focused_layer_name)) : null;
});

const index_scope = computed(() => {
    let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity, max_z = 0;

    if (mapback.value?.coordinate) {
        min_x = mapback.value.coordinate[0].x;
        max_x = mapback.value.coordinate[1].x;
        min_y = mapback.value.coordinate[0].y;
        max_y = mapback.value.coordinate[1].y;
    } else {
        for (const image of mapback.value?.images || []) {
            for (const coordinate of image.coordinate) {
                if (coordinate.x < min_x) min_x = coordinate.x;
                if (coordinate.x > max_x) max_x = coordinate.x;
                if (coordinate.y < min_y) min_y = coordinate.y;
                if (coordinate.y > max_y) max_y = coordinate.y;
            }
        }
    }
    for (const image of mapback.value?.images || []) {
        if (image.z_index > max_z) max_z = image.z_index;
    }
    return {
        min_x, max_x, min_y, max_y, max_z,
    };
});

const frame_rects = computed(() => {
    const { min_x, max_x, min_y, max_y } = index_scope.value;
    if (!isFinite(min_x)) return [];
    const hw = (max_x - min_x) / 2;
    const hh = (max_y - min_y) / 2;
    return [
        { key: 'top',    points: [{ x: min_x - hw, y: max_y }, { x: max_x + hw, y: max_y }, { x: max_x + hw, y: max_y + hh }, { x: min_x - hw, y: max_y + hh }] },
        { key: 'bottom', points: [{ x: min_x - hw, y: min_y - hh }, { x: max_x + hw, y: min_y - hh }, { x: max_x + hw, y: min_y }, { x: min_x - hw, y: min_y }] },
        { key: 'left',   points: [{ x: min_x - hw, y: min_y }, { x: min_x, y: min_y }, { x: min_x, y: max_y }, { x: min_x - hw, y: max_y }] },
        { key: 'right',  points: [{ x: max_x, y: min_y }, { x: max_x + hw, y: min_y }, { x: max_x + hw, y: max_y }, { x: max_x, y: max_y }] },
    ];
});

function onMapReady(map: any) {
    map.createPane('dim-pane');
    map.getPane('dim-pane')!.style.zIndex = '405';
    map.createPane('focus-pane');
    map.getPane('focus-pane')!.style.zIndex = '410';
}

function update_center(coordinate: { lat: number, lng: number }) {
    emit('update_center', deprocess_coordinate([coordinate.lat, coordinate.lng]));
}

</script>