<template>
  <el-select
    v-model="currentLocale"
    style="width: 140px"
    @change="switchLanguage"
  >
    <el-option
      v-for="locale in locales"
      :key="locale.code"
      :label="locale.name"
      :value="locale.code"
    />
  </el-select>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const currentLocale = ref(locale.value)

function switchLanguage(lang: "zh_cn" | "en") {
  locale.value = lang
  window.location.assign(switchLocalePath(lang))
}
</script>