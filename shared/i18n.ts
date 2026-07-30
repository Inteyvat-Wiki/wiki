export const DEFAULT_LOCALE = 'zh_hans' as const

export const LOCALES = [
  { code: DEFAULT_LOCALE, name: '简体中文', file: `${DEFAULT_LOCALE}.json` },
  { code: 'en', name: 'English', file: 'en.json' },
] as const

export type LocaleCode = typeof LOCALES[number]['code']

export function isLocaleCode(locale: unknown): locale is LocaleCode {
  return LOCALES.some(({ code }) => code === locale)
}
