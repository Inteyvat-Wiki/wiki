<template>
    <section class="map-record">
        <p v-if="failure" role="alert">{{ $t('map.record_failed') }}</p>
        <p v-else-if="loading" role="status">{{ $t('map.loading') }}</p>
        <article v-else-if="item">
            <h3 v-if="dungeon_link(item)"><InlineLink v-bind="dungeon_link(item)!"><span v-html="item.label"></span></InlineLink></h3>
            <h3 v-else-if="item.label" v-html="item.label"></h3>
            <p v-if="item.description" v-html="item.description"></p>
        </article>
        <p v-else>{{ $t('map.record_missing') }}</p>
    </section>
</template>

<script setup lang="ts">
import type { MapCatalogueItem } from '@inteyvat-wiki/wiki-contracts/map';
import { parse_inline_links } from '@inteyvat-wiki/wiki-contracts/inline_link';

const props = defineProps<{ recordId: string }>();

const item = ref<MapCatalogueItem>();
const loading = ref(false);
const failure = ref(false);
const dungeon_link = (item: MapCatalogueItem) => {
    const relation = item.relations.find(relation => relation.target.category === 'geography');
    if (!relation) return;
    const parts = parse_inline_links(relation.label), token = parts[0];
    return parts.length === 1 && typeof token === 'object' && token.category === 'geography' && token.id === relation.target.id ? token : undefined;
};
let request = 0;
async function load() {
    const current = ++request;
    loading.value = true;
    failure.value = false;
    try {
        const result = await get_map_record(props.recordId);
        if (request === current) item.value = result;
    } catch {
        if (request === current) failure.value = true;
    } finally {
        if (request === current) loading.value = false;
    }
}
const { locale } = useI18n();
watch([locale, () => props.recordId], load);
onMounted(load);
</script>

<style scoped>
.map-record { overflow-wrap: anywhere; }
h3 { margin: 6px 0; }
p { white-space: pre-wrap; }
</style>
