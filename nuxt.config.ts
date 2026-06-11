import { resolve } from 'path'

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
    defaultLocale: 'zh_cn',
    locales: [
      { code: 'zh_cn', name: '简体中文', file: 'zh_cn.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
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