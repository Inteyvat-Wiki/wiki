import { resolve } from 'path'
import { DEFAULT_LOCALE, LOCALES } from './shared/i18n'

// Avoid concurrent mkdir failures in Rollup output on Windows.
const fileOperationOptions = process.platform === 'win32' ? { maxParallelFileOps: 1 } : {}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Private, stable base for WIKI_DATA_ROOT (also when the compiled server's cwd changes).
  runtimeConfig: {
    wikiDataProjectRoot: resolve(__dirname),
  },
  modules: [
    '@nuxtjs/i18n',
    '@element-plus/nuxt',
    'nuxt-svgo',
    '@nuxtjs/leaflet'
  ],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    strategy: 'prefix_except_default',
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  vite: {
    build: { rollupOptions: fileOperationOptions },
  },
  nitro: {
    rollupConfig: fileOperationOptions,
    publicAssets: [
      { dir: 'public' },
    ]
  },
  css: [
    '~/assets/styles/global.css',
    'leaflet/dist/leaflet.css'
  ]
})
