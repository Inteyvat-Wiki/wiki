<template>
    <main class="map-workspace">
        <MapSceneCanvas v-if="scene" :key="scene.id" :scene="scene" :states="display_states" :layer="layer" :marker-kinds="marker_kinds"
            :show-regions="show_regions" :area-levels="area_levels" :show-boundaries="show_boundaries" :show-layer-extents="show_layer_extents" :show-unknown="show_unknown" :all-levels="all_levels" :target="target" :target-bounds="target_bounds"
            :inspect-height="show_heights" :height-point="height_point" :height-radius="height_radius" :height-polygon="height_hits.find(hit => hit.id === height_selected)?.polygon"
            :inspect-masks="show_map_conditions" :selected-mask="selected_mask_id" :location-point="location_point"
            @record="open_record" @center="view_center = $event" @probe="height_point = $event" @mask="open_mask" />
        <div class="map-toolbar">
            <el-select v-model="scene_id" filterable :placeholder="$t('map.select_scene')" class="scene-select" @change="change_scene">
                <el-option v-for="entry in index?.scenes" :key="entry.id" :value="entry.id" :label="entry.label" />
            </el-select>
            <el-button @click="show_settings = true">{{ $t('map.settings') }}</el-button>
            <el-button :type="show_heights ? 'primary' : 'default'" @click="show_heights = !show_heights">{{ $t('map.height.title') }}</el-button>
            <el-button :type="show_map_conditions ? 'primary' : 'default'" :aria-pressed="show_map_conditions" :disabled="!has_map_conditions" @click="show_map_conditions = !show_map_conditions">{{ $t('map.mask_groups.title') }}</el-button>
            <el-select v-if="available_layers.length" v-model="layer" clearable :placeholder="$t('map.surface')" class="floor-select">
                <el-option value="" :label="$t('map.surface')" />
                <el-option v-for="floor in available_layers" :key="floor.id" :value="floor.id" :label="map_layer_label(floor, display_states)" />
            </el-select>
        </div>
        <MapAreaHeights v-if="show_heights && scene" :point="height_point" :radius="height_radius" :levels="height_levels" :hits="height_hits" :selected="height_selected"
            @close="show_heights = false" @radius="height_radius = $event" @levels="height_levels = $event" @select="height_selected = $event" />
        <div v-if="loading || failure" class="map-status" role="status">
            <template v-if="failure">{{ $t('map.scene_failed') }} <el-button link @click="index ? load_scene() : initialize()">{{ $t('map.retry') }}</el-button></template>
            <template v-else>{{ $t('map.loading') }}</template>
        </div>
        <div v-else-if="location_request.invalid" class="map-status" role="status">{{ $t('map.location_invalid') }}</div>
        <el-drawer v-model="show_settings" :title="$t('map.settings')" size="min(520px, 95vw)">
            <template v-if="scene">
                <el-input v-model="search" clearable :placeholder="$t('map.place_search')" />
                <div v-if="search" class="map-results">
                    <button v-for="entry in search_results" :key="entry.id" @click="locate_result(entry)">
                        {{ entry.label }}
                        <small v-if="entry.area">{{ $t(entry.area.level === 1 ? 'map.primary_areas' : 'map.secondary_areas') }}</small>
                        <small v-else-if="entry.marker">{{ $t(`map.marker_kinds.${entry.marker.kind}`) }}</small>
                    </button>
                    <p v-if="!search_results.length">{{ $t('map.no_results') }}</p>
                </div>
                <h3>{{ $t('map.markers') }}</h3>
                <el-checkbox-group v-model="marker_kinds" class="map-options">
                    <el-checkbox v-for="kind in kinds" :key="kind" :value="kind">{{ $t(`map.marker_kinds.${kind}`) }}</el-checkbox>
                </el-checkbox-group>
                <div class="map-options">
                    <el-checkbox v-model="show_regions">{{ $t('map.region_ranges') }}</el-checkbox>
                    <el-checkbox v-model="show_boundaries">{{ $t('map.boundary_ranges') }}</el-checkbox>
                    <el-checkbox v-model="show_layer_extents">{{ $t('map.layer_ranges') }}</el-checkbox>
                    <el-checkbox v-model="show_unknown">{{ $t('map.include_unknown') }}</el-checkbox>
                    <el-checkbox v-model="all_levels">{{ $t('map.all_levels') }}</el-checkbox>
                </div>
                <el-checkbox-group v-if="show_regions" v-model="area_levels" class="map-options" :aria-label="$t('map.region_ranges')">
                    <el-checkbox :value="1"><span class="area-swatch primary"></span>{{ $t('map.primary_areas') }}</el-checkbox>
                    <el-checkbox :value="2"><span class="area-swatch secondary"></span>{{ $t('map.secondary_areas') }}</el-checkbox>
                </el-checkbox-group>
            </template>
        </el-drawer>
        <el-drawer v-model="show_condition_details" :title="$t('map.mask_groups.title')" direction="rtl" size="min(520px, 95vw)"
            :modal="false" :lock-scroll="false" modal-class="map-mask-drawer-overlay" destroy-on-close>
            <template v-if="scene">
                <MapMaskConditions v-model="condition_values" :groups="condition_scope.groups" :conditions="condition_scope.conditions" :all-groups="scene.maskConditions" :dependencies="task_dependencies" :states="scene.states" />
                <div v-for="choice in condition_scope.choices" :key="choice.id" class="map-state">
                    <label>{{ choice.label }}</label>
                    <el-radio-group :model-value="selections[choice.id] || ''" :aria-label="choice.label" size="small" @update:model-value="select_state(choice.id, String($event))">
                        <el-radio-button v-for="option in choice.options" :key="option.id" :value="option.id">{{ option.label }}</el-radio-button>
                    </el-radio-group>
                </div>
            </template>
            <template #footer>
                <el-button :disabled="!scene || loading" @click="reset_map_conditions">{{ $t('map.mask_groups.reset_all') }}</el-button>
            </template>
        </el-drawer>
        <el-drawer v-model="show_record" :title="$t('map.record_detail')" size="min(720px, 95vw)" destroy-on-close><MapRecordDetail v-if="record_id" :record-id="record_id" /></el-drawer>
    </main>
</template>

<script setup lang="ts">
import { map_layer_label, map_visible, valid_map_selections, valid_map_condition_values, map_group_centers, map_nearest_group, map_area_bounds } from '~~/shared/map_display';
import type { TaskConditionValues } from '~/utils/task_condition';
import { resolve_map_mask_previews } from '~/utils/map_mask_conditions';
import { map_condition_scope } from '~/utils/map_condition_scope';
import { map_height_hits } from '~~/shared/map_heights';
import { resolve_map_location, map_location_position } from '~~/shared/map_location';
import type { MapArea, MapCoordinate, MapMarker, MapRegion, MapScene, MapSceneIndex, MapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
const { locale } = useI18n();
const route = useRoute(), router = useRouter();
const index = ref<MapSceneIndex>(), scene = shallowRef<MapScene>();
const location_request = computed(() => index.value ? resolve_map_location(route.query, index.value.scenes) : { location: null, invalid: false });
const location_point = shallowRef<MapCoordinate | null>(null);
const task_dependencies = shallowRef<MapTaskDependencies>();
const scene_id = ref('teyvat'), selections = ref<Record<string, string>>({}), layer = ref(''), target = ref<MapCoordinate | null>(null);
const target_bounds = ref<MapScene['bounds'] | null>(null);
const view_center = ref<MapCoordinate | null>(null);
const show_heights = ref(false), height_point = ref<MapCoordinate | null>(null), height_radius = ref(100), height_levels = ref<number[]>([1, 2]), height_selected = ref('');
const height_hits = computed(() => scene.value && height_point.value ? map_height_hits(scene.value.areas || [], height_point.value, height_radius.value, height_levels.value) : []);
watch(height_hits, hits => { if (!hits.some(hit => hit.id === height_selected.value)) height_selected.value = ''; });
const kinds: MapMarker['kind'][] = ['label', 'place', 'teleport', 'statue', 'domain', 'viewpoint', 'point', 'npc'];
const marker_kinds = ref<string[]>(['label', 'place', 'teleport', 'statue', 'domain', 'viewpoint', 'point']);
const show_regions = ref(false), show_boundaries = ref(true), show_layer_extents = ref(false), show_unknown = ref(true), all_levels = ref(true);
const area_levels = ref<number[]>([1, 2]);
const show_settings = ref(false), show_record = ref(false), loading = ref(false), failure = ref(false);
const show_map_conditions = ref(false), show_condition_details = ref(false), selected_mask_id = ref('');
const selected_mask = computed(() => scene.value?.maskGroups?.find(group => group.id === selected_mask_id.value));
const condition_scope = computed(() => map_condition_scope(scene.value, selected_mask_id.value, layer.value));
const has_map_conditions = computed(() => !!(scene.value?.maskGroups?.length || scene.value?.maskConditions?.length
    || scene.value?.layers.some(floor => floor.condition || floor.labelVariants?.length)));
const has_scoped_conditions = computed(() => !!(condition_scope.value.conditions.length || condition_scope.value.choices.length));
watch(show_map_conditions, enabled => {
    if (!enabled) { show_condition_details.value = false; selected_mask_id.value = ''; }
    else show_condition_details.value = has_scoped_conditions.value;
});
watch(layer, () => {
    if (show_map_conditions.value) show_condition_details.value = !!selected_mask.value || has_scoped_conditions.value;
});
watch(show_condition_details, open => { if (!open) selected_mask_id.value = ''; });
const search = ref(''), record_id = ref('');
const condition_values = ref<TaskConditionValues>({});
const display_states = computed(() => resolve_map_mask_previews(scene.value?.maskConditions, selections.value, condition_values.value, task_dependencies.value, scene.value?.states).states);
let request = 0;
const state_key = () => `wiki-map-states-v1:${scene_id.value}`;
const condition_key = () => `wiki-map-source-conditions-v1:${scene.value?.id}`;
const group_centers = computed(() => scene.value ? map_group_centers(scene.value) : []);
const eligible_layers = computed(() => (scene.value?.layers || []).filter(floor => map_visible(floor.condition, display_states.value, show_unknown.value)));
const nearby_group = computed(() => {
    const eligible = new Set(eligible_layers.value.map(floor => floor.groupId));
    return map_nearest_group(group_centers.value.filter(group => eligible.has(group.id)), view_center.value);
});
const available_layers = computed(() => eligible_layers.value.filter(floor => floor.groupId === nearby_group.value).sort((a, b) => b.order - a.order));
watch(available_layers, floors => {
    // Do not keep an old highlighted floor after panning to another group or away from all groups.
    if (layer.value && !floors.some(floor => floor.id === layer.value)) layer.value = '';
});
const search_results = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase();
    if (!needle || !scene.value) return [];
    const results: Array<{ id: string; label: string; marker?: MapMarker; region?: MapRegion; area?: MapArea }> = [];
    for (const area of scene.value.areas || []) if (area.label.toLocaleLowerCase().includes(needle) || area.description.toLocaleLowerCase().includes(needle))
        results.push({ id: area.id, label: area.label, area });
    for (const marker of scene.value.markers) if (map_layer_label(marker, selections.value).toLocaleLowerCase().includes(needle)
        || marker.label.toLocaleLowerCase().includes(needle) || marker.description.toLocaleLowerCase().includes(needle)) {
        results.push({ id: marker.id, label: map_layer_label(marker, selections.value), marker });
    }
    for (const region of scene.value.regions) if (region.label.toLocaleLowerCase().includes(needle)) results.push({ id: region.id, label: region.label, region });
    return results.slice(0, 60);
});
function persist_states() {
    if (!scene.value) return;
    try { localStorage.setItem(state_key(), JSON.stringify(Object.fromEntries(scene.value.states.map(choice => [choice.id, selections.value[choice.id] ?? null])))); } catch { /* Optional storage. */ }
}
function select_state(id: string, value: string) {
    const next = { ...selections.value }; if (value) next[id] = value; else delete next[id]; selections.value = next; persist_states();
}
function reset_map_conditions() {
    if (!scene.value) return;
    selections.value = valid_map_selections(scene.value.states, null);
    condition_values.value = valid_map_condition_values(scene.value.maskConditions, null, scene.value.states);
    persist_states();
}
watch(condition_values, value => {
    if (!scene.value) return;
    try { localStorage.setItem(condition_key(), JSON.stringify(valid_map_condition_values(scene.value.maskConditions, value, scene.value.states))); } catch { /* Optional storage. */ }
});
async function load_scene() {
    if (!scene_id.value) return;
    show_condition_details.value = false; selected_mask_id.value = ''; location_point.value = null;
    const current = ++request; loading.value = true; failure.value = false;
    try {
        const value = await get_map_scene(scene_id.value); if (current !== request) return;
        let stored: unknown; try { stored = JSON.parse(localStorage.getItem(state_key()) || 'null'); } catch { stored = null; }
        selections.value = valid_map_selections(value.states, stored);
        if (scene.value?.id !== value.id) { view_center.value = null; height_point.value = null; height_selected.value = ''; }
        layer.value = ''; target.value = null; target_bounds.value = null; search.value = ''; scene.value = value;
        let conditions: unknown; try { conditions = JSON.parse(localStorage.getItem(condition_key()) || 'null'); } catch { conditions = null; }
        condition_values.value = valid_map_condition_values(value.maskConditions, conditions, value.states);
        apply_location();
    } catch { if (current === request) { failure.value = true; scene.value = undefined; } }
    finally { if (current === request) loading.value = false; }
}
async function initialize() {
    loading.value = true;
    try { [index.value, task_dependencies.value] = await Promise.all([get_map_scene_index(), get_map_task_dependencies()]);
        if (location_request.value.location) scene_id.value = location_request.value.location.scene;
        if (!index.value.scenes.some(entry => entry.id === scene_id.value)) scene_id.value = index.value.scenes[0]?.id || '';
        await load_scene();
    } catch { failure.value = true; loading.value = false; }
}
function apply_location() {
    const location = location_request.value.location;
    location_point.value = location && location.scene === scene.value?.id ? map_location_position(location) : null;
    if (location_point.value) { target_bounds.value = null; target.value = { ...location_point.value }; }
}
async function sync_location() {
    if (!index.value) return;
    const location = location_request.value.location;
    if (!location) { location_point.value = null; target.value = null; return; }
    if (scene_id.value !== location.scene || scene.value?.id !== location.scene || loading.value) {
        scene_id.value = location.scene; await load_scene();
    } else apply_location();
}
async function change_scene() {
    location_point.value = null;
    if (['scene', 'x', 'z'].some(key => route.query[key] !== undefined)) {
        const query = { ...route.query }; delete query.scene; delete query.x; delete query.z;
        await router.replace({ query });
    }
    await load_scene();
}
watch(() => [route.query.scene, route.query.x, route.query.z], sync_location);
function locate(marker: MapMarker) {
    if (!marker_kinds.value.includes(marker.kind)) marker_kinds.value.push(marker.kind);
    layer.value = marker.layerId || ''; target_bounds.value = null; target.value = { x: marker.position.x, y: marker.position.y }; show_settings.value = false;
}
function locate_result(entry: { marker?: MapMarker; region?: MapRegion; area?: MapArea }) {
    if (entry.area) {
        const bounds = map_area_bounds(entry.area);
        show_settings.value = false;
        if (!bounds) { open_record(entry.area.recordId); return; }
        show_regions.value = true;
        if (!area_levels.value.includes(entry.area.level)) area_levels.value.push(entry.area.level);
        target.value = null; target_bounds.value = bounds;
        return;
    }
    if (entry.marker) { locate(entry.marker); return; }
    const region = entry.region; if (!region) return;
    const points = [...region.rings.flat(), ...(region.mesh?.vertices || []), ...(region.circles || []).flatMap(circle => [
        { x: circle.center.x - circle.radius, y: circle.center.y - circle.radius }, { x: circle.center.x + circle.radius, y: circle.center.y + circle.radius }])];
    if (!points.length) return;
    if (region.kind === 'region') show_regions.value = true;
    else if (region.kind === 'layer-extent') show_layer_extents.value = true;
    else show_boundaries.value = true;
    layer.value = region.layerId || ''; target.value = null;
    target_bounds.value = [{ x: Math.min(...points.map(point => point.x)), y: Math.min(...points.map(point => point.y)) },
        { x: Math.max(...points.map(point => point.x)), y: Math.max(...points.map(point => point.y)) }];
    show_settings.value = false;
}
function open_record(id: string) { record_id.value = id; show_record.value = true; }
function open_mask(id: string) {
    if (!show_map_conditions.value || !scene.value?.maskGroups?.some(group => group.id === id)) return;
    selected_mask_id.value = id; show_condition_details.value = true; show_settings.value = false;
}
watch(locale, initialize); onMounted(initialize);
</script>

<style scoped>
.map-workspace { position: relative; height: 100%; width: 100%; min-height: 400px; }
.map-toolbar { position: absolute; inset: 12px 12px auto 54px; z-index: 800; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; pointer-events: none; }
.map-toolbar > * { pointer-events: auto; }
.scene-select, .floor-select { width: min(300px, 70vw); }
.map-status { position: absolute; top: 90px; left: 50%; transform: translateX(-50%); z-index: 900; background: var(--el-bg-color); padding: 12px 20px; border-radius: 6px; }
.map-options { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 12px 0; }
.area-swatch { display: inline-block; width: 16px; margin-right: 6px; vertical-align: middle; }
.area-swatch.primary { border-top: 3px solid #e4b85c; }
.area-swatch.secondary { border-top: 2px solid #70cbd4; }
.map-state { display: grid; gap: 6px; margin: 18px 0; }
.map-results { display: grid; max-height: 250px; overflow: auto; margin-top: 8px; }
.map-results button { text-align: left; background: none; border: 0; color: var(--el-text-color-primary); padding: 8px; cursor: pointer; }
.map-results button:hover { background: var(--el-fill-color); }
.map-results button small { margin-left: 8px; color: var(--el-text-color-secondary); }
:global(.map-mask-drawer-overlay) { pointer-events:none; }
:global(.map-mask-drawer-overlay .el-drawer) { pointer-events:auto; }
</style>
