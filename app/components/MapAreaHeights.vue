<template>
    <section class="height-panel" :aria-label="$t('map.height.title')">
        <header><strong>{{ $t('map.height.title') }}</strong><el-button text @click="emit('close')">{{ $t('map.height.close') }}</el-button></header>
        <p class="height-help">{{ $t(point ? 'map.height.explanation' : 'map.height.pick') }}</p>
        <div class="height-controls">
            <label>{{ $t('map.height.radius') }} <input type="number" min="0" max="2000" step="25" :value="radius" @change="change_radius" /></label>
            <label v-for="level in [1, 2]" :key="level"><input type="checkbox" :checked="levels.includes(level)" @change="toggle_level(level)" />{{ $t(level === 1 ? 'map.primary_areas' : 'map.secondary_areas') }}</label>
        </div>
        <template v-if="point">
            <p class="height-location">{{ $t('map.height.position') }} {{ format(point.x) }}, {{ format(point.y) }} · {{ $t('map.height.matches', { count:hits.length }) }}</p>
            <p v-if="!hits.length">{{ $t('map.height.empty') }}</p>
            <div v-else class="height-chart">
                <div class="height-scale">
                    <span class="height-axis-title">{{ $t('map.height.axis') }}</span>
                    <div class="height-scale-plot"><span v-for="tick in axis?.ticks || []" :key="tick" :style="{top:percent(tick)+'%'}">{{ format(tick) }}</span></div>
                </div>
                <div class="height-scroll">
                    <div v-for="hit in hits" :key="hit.id" class="height-column" :class="{ selected:selected === hit.id, primary:hit.area.level === 1 }">
                        <button class="height-name" :title="hit.area.label || hit.area.id" :aria-pressed="selected === hit.id" @click="emit('select', hit.id)">
                            {{ hit.area.label || $t('map.height.unnamed') }}<small>{{ $t(hit.area.level === 1 ? 'map.primary_areas' : 'map.secondary_areas') }} · {{ hit.polygonIndex + 1 }}</small>
                        </button>
                        <div class="height-plot" @click="emit('select', hit.id)">
                            <span v-for="tick in axis?.ticks || []" :key="tick" class="height-grid" :style="{top:percent(tick)+'%'}"></span>
                            <template v-if="hit.polygon.minimumHeight !== undefined && hit.polygon.maximumHeight !== undefined">
                                <button class="height-interval" :style="interval_style(hit)" :title="range(hit)" :aria-label="`${hit.area.label}: ${range(hit)}`" @click.stop="emit('select', hit.id)"></button>
                            </template>
                            <template v-else>
                                <span v-if="known_limit(hit) !== undefined" class="height-known" :style="{top:percent(known_limit(hit)!)+ '%'}"></span>
                                <span class="height-unknown">{{ $t('map.height.incomplete') }}</span>
                            </template>
                        </div>
                        <p class="height-range">{{ range(hit) }}</p>
                    </div>
                </div>
            </div>
        </template>
    </section>
</template>
<script setup lang="ts">
import type { MapCoordinate } from '@inteyvat-wiki/wiki-contracts/map';
import { map_height_axis, type MapHeightHit } from '~~/shared/map_heights';
const props = defineProps<{ point:MapCoordinate | null; radius:number; levels:number[]; hits:MapHeightHit[]; selected:string }>();
const emit = defineEmits<{ (event:'close'):void; (event:'radius', value:number):void; (event:'levels', value:number[]):void; (event:'select', value:string):void }>();
const { t, locale } = useI18n();
const axis = computed(() => map_height_axis(props.hits));
const format = (value:number) => new Intl.NumberFormat(locale.value === 'zh_hans' ? 'zh-CN' : 'en', {maximumFractionDigits:1}).format(value);
const percent = (value:number) => axis.value ? (axis.value.maximum - value) / (axis.value.maximum - axis.value.minimum) * 100 : 50;
const known_limit = (hit:MapHeightHit) => hit.polygon.minimumHeight ?? hit.polygon.maximumHeight;
const range = (hit:MapHeightHit) => `${hit.polygon.minimumHeight === undefined ? t('map.height.unknown') : format(hit.polygon.minimumHeight)} – ${hit.polygon.maximumHeight === undefined ? t('map.height.unknown') : format(hit.polygon.maximumHeight)}`;
const interval_style = (hit:MapHeightHit) => ({top:percent(hit.polygon.maximumHeight!)+'%',height:Math.max(0,percent(hit.polygon.minimumHeight!)-percent(hit.polygon.maximumHeight!))+'%'});
function change_radius(event:Event) {
    const input = event.target as HTMLInputElement, value = input.valueAsNumber;
    if (Number.isFinite(value) && value >= 0 && value <= 2000) emit('radius', value);
    else input.value = String(props.radius);
}
function toggle_level(level:number) { emit('levels',props.levels.includes(level) ? props.levels.filter(value => value !== level) : [...props.levels,level]); }
</script>
<style scoped>
.height-panel { position:absolute; right:16px; bottom:16px; z-index:800; width:min(560px, calc(100% - 32px)); max-height:65%; overflow:auto; background:var(--el-bg-color); color:var(--el-text-color-primary); border:1px solid var(--el-border-color); border-radius:8px; padding:12px; box-shadow:0 4px 20px #0004; box-sizing:border-box; }
header,.height-controls { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.height-controls { flex-wrap:wrap; font-size:13px; }
.height-controls label { display:flex; align-items:center; gap:4px; }
input[type=number] { width:65px; padding:4px; color:inherit; background:var(--el-fill-color); border:1px solid var(--el-border-color); border-radius:4px; }
.height-help,.height-location { font-size:12px; color:var(--el-text-color-secondary); margin:6px 0 10px; }
.height-chart { display:flex; margin:8px 0; }
.height-scale { flex:0 0 66px; font-size:11px; text-align:right; }
.height-axis-title { display:block; height:54px; padding:4px; box-sizing:border-box; }
.height-scale-plot,.height-plot { position:relative; height:220px; }
.height-scale-plot span { position:absolute; right:8px; transform:translateY(-50%); }
.height-scroll { display:flex; overflow-x:auto; flex:1; min-width:0; padding-bottom:6px; }
.height-column { flex:0 0 104px; --range-color:#70cbd4; border-radius:4px; }
.height-column.primary { --range-color:#e4b85c; }
.height-column.selected { background:var(--el-fill-color); outline:1px solid #c17dde; outline-offset:-1px; }
.height-name { width:100%; height:54px; padding:4px 6px; font:inherit; font-size:12px; border:0; background:none; color:inherit; cursor:pointer; overflow:hidden; }
.height-name small { display:block; color:var(--el-text-color-secondary); font-size:10px; }
.height-plot { cursor:pointer; }
.height-grid { position:absolute; left:0; right:0; border-top:1px dashed var(--el-border-color); }
.height-interval { position:absolute; left:calc(50% - 10px); width:20px; min-height:3px; padding:0; background:var(--range-color); border:1px solid var(--range-color); border-radius:3px; cursor:pointer; opacity:.85; }
.height-known { position:absolute; left:35%; right:35%; border-top:3px solid var(--range-color); }
.height-unknown { position:absolute; top:50%; left:8px; right:8px; text-align:center; font-size:11px; color:var(--el-text-color-secondary); }
.height-range { font-size:11px; text-align:center; margin:8px 2px 2px; }
</style>
