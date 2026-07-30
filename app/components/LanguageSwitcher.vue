<template>
  <el-select
    v-model="currentLocale"
    style="width: 140px"
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
import type { LocaleCode } from '~~/shared/i18n'

const { locale, locales, setLocale } = useI18n()

const currentLocale = computed({
  get: () => locale.value as LocaleCode,
  set: (lang: LocaleCode) => {
    void setLocale(lang)
  },
})
</script>
