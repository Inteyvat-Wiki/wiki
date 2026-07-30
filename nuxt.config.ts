import { resolve } from 'path'
import { DEFAULT_LOCALE, LOCALES } from './shared/i18n'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
  nitro: {
    publicAssets: [
      { dir: 'public' },
      {
        baseURL: '/images',
        dir: resolve(__dirname, 'data/images')
      },
    ]
  },
  css: [
    '~/assets/styles/global.css',
    'leaflet/dist/leaflet.css'
  ]
})
