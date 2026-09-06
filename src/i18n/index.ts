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
    // Thai audience first: the site opens in Thai for everyone, whatever the
    // browser is set to. Only an explicit choice from the language switcher
    // (stored in localStorage) changes it — hence 'localStorage' being the ONLY
    // detector; adding 'navigator' back would open the site in English for
    // anyone with an English browser.
    fallbackLng: 'th',
    // Treat 'en-US', 'th-TH' etc. as their base language.
    load: 'languageOnly',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'cg:language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
