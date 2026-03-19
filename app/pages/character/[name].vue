<template>
    <el-container v-if="character">
        <el-main>
            <div ref="show_links_element_container">
                <div id="basic-info">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="12">
                            <el-card>
                                <character-basic-info-card :character="character" />
                            </el-card>
                        </el-col>
                        <el-col :span="24" :lg="12">
                            <el-card>
                                <character-splash-card :character="character" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div id="skills" style="margin-top: 20px;">
                    <character-skill-cards v-for="skill in character.skills" :key="skill.title" :skill="skill"
                        style="margin-top: 20px;" />
                </div>
                <div id="talents" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="12" v-for="talent in character.talents" :key="talent.title">
                            <el-card style="height: 100%;">
                                <character-talent-card :talent="talent" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div id="constellations" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="12" v-for="constellation in character.constellations"
                            :key="constellation.title">
                            <el-card style="height: 100%;">
                                <character-talent-card :talent="constellation" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div id="stories" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24">
                            <el-card>
                                <title-with-icon :icon="null" :title="$t('character.stories')" />
                                <character-stories-card :stories="character.stories" style="margin-top: 10px;" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div id="voiceovers" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24">
                            <el-card>
                                <title-with-icon :icon="null" :title="$t('character.voiceovers')" />
                                <character-voiceovers-card :voiceovers="character.voiceovers"
                                    style="margin-top: 10px;" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
                <div id="images" style="margin-top: 20px;">
                    <el-row :gutter="20" style="row-gap: 20px; width: 100%;">
                        <el-col :span="24" :lg="12" v-for="image in character.images" :key="image.title">
                            <el-card>
                                <character-image-card :image="image" style="margin-top: 10px;" />
                            </el-card>
                        </el-col>
                    </el-row>
                </div>
            </div>
        </el-main>
        <el-aside width="100px">
            <el-affix :offset="60">
                <el-anchor :offset="70">
                    <el-anchor-link :href="`#basic-info`">
                        {{ $t('character.basic-info') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#skills`">
                        {{ $t('character.skills') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#talents`">
                        {{ $t('character.talents') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#constellations`">
                        {{ $t('character.constellations') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#stories`">
                        {{ $t('character.stories') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#voiceovers`">
                        {{ $t('character.voiceovers') }}
                    </el-anchor-link>
                    <el-anchor-link :href="`#images`">
                        {{ $t('character.images') }}
                    </el-anchor-link>
                </el-anchor>
            </el-affix>
        </el-aside>
    </el-container>
    <el-popover :visible="popover_visible" :virtual-ref="popover_ref" virtual-triggering trigger="click" placement="top"
        width="400">
        <title-with-icon :title="popover_content.title" :icon="null"
            style="transform-origin: left center; transform: scale(0.8)" />
        <br>
        <div v-html="popover_content.description"></div>
    </el-popover>
</template>

<script setup lang="ts">
import type { Character } from '~/types/character';

const character = ref<Character>();

const show_links_element_container = ref();
const popover_visible = ref(false);
const popover_ref = ref();
const popover_content = ref({
    title: '',
    description: '',
});

onMounted(async () => {
    character.value = await getCharacter(useRoute().params.name as string);
});

watch([show_links_element_container, character], () => {
    if (!character.value || !show_links_element_container.value) return;
    
    const link_contents: Record<number, any> = {}

    for (let i of character.value.skills) if (i.id) link_contents[i.id] = i;
    for (let i of character.value.talents) if (i.id) link_contents[i.id] = i;
    for (let i of character.value.constellations) if (i.id) link_contents[i.id] = i;
    for (let i of character.value.link_description) if (i.id) link_contents[i.id] = i;

    show_links_element_container.value.addEventListener('click', (event: Event) => {
        const target = (event.target as HTMLElement).closest('.linked_content') as HTMLElement;

        if (target?.dataset?.id) {
            popover_content.value = link_contents[parseInt(target.dataset.id)] || {
                title: '',
                description: '',
            };
            popover_visible.value = true;
            popover_ref.value = target;
        } else {
            popover_visible.value = false;
        }
    });
})

useHead({
    title: computed(() => character.value ? character.value.name : $t('normal.loading')),
})
</script>

<style lang="css">
.linked_content {
    text-decoration: underline;
}

.linked_content .colored_content {
    text-decoration: underline;
    text-decoration-color: currentColor;
}
</style>