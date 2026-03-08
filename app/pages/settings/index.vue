<template>
    <el-row style="row-gap: 50px; width: 100%;">
        <el-col :span="24">
            <title-with-icon :title="$t('settings.traveller')" style="margin-bottom: 20px;" />
            <el-radio-group v-model="settings.traveller">
                <el-radio value="aether" border style="height: 100px;">
                    <div class="round_icon">
                        <el-image src="/images/settings/aether_icon.png" style="width: 100px; height: 100px;" />
                    </div>
                </el-radio>
                <el-radio value="lumine" border style="height: 100px;">
                    <div class="round_icon">
                        <el-image src="/images/settings/lumine_icon.png" style="width: 100px; height: 100px;" />
                    </div>
                </el-radio>
            </el-radio-group>
            <el-button :icon="Delete" circle @click="settings.traveller = undefined" style="margin-left: 20px;" />
        </el-col>
        <el-col :span="24">
            <title-with-icon :title="$t('settings.traveller_name')"
                :icon="`/images/settings/${settings.traveller == 'lumine' ? 'lumine' : 'aether'}_icon.png`"
                style="margin-bottom: 20px;" />
            <el-input v-model="settings.traveller_name" :placeholder="$t('settings.default_traveller_name')"
                style="max-width: 500px" />
            <el-button :icon="Delete" circle @click="settings.traveller_name = undefined" style="margin-left: 20px;" />
        </el-col>
        <el-col :span="24">
            <title-with-icon :title="$t('settings.wanderer_name')" :icon="`/images/settings/wanderer_icon.png`"
                style="margin-bottom: 20px;" />
            <el-input v-model="settings.wanderer_name" :placeholder="$t('settings.default_wanderer_name')"
                style="max-width: 500px" />
            <el-button :icon="Delete" circle @click="settings.wanderer_name = undefined" style="margin-left: 20px;" />
        </el-col>
        <el-col :span="24">
            <title-with-icon :title="$t('settings.littleone_name')" :icon="`/images/settings/littleone_icon.png`"
                style="margin-bottom: 20px;" />
            <el-input v-model="settings.littleone_name" :placeholder="$t('settings.default_littleone_name')"
                style="max-width: 500px" />
            <el-button :icon="Delete" circle @click="settings.littleone_name = undefined" style="margin-left: 20px;" />
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
import { get_settings } from '~/utils/settings';
import { Delete } from '@element-plus/icons-vue';

const settings = get_settings();
</script>