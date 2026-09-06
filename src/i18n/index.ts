import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import th from './locales/th.json'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = ['th', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  th: 'ไทย',
  en: 'English',
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      th: { translation: th },
      en: { translation: en },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // Thai audience first: anything that isn't detected as English falls
    // back to Thai rather than to the i18next default of English.
    fallbackLng: 'th',
    // Treat 'en-US', 'th-TH' etc. as their base language.
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cg:language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
