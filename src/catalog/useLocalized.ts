import { useTranslation } from 'react-i18next'
import type { Localized } from './types'

/** Returns a picker that resolves a `Localized` value to the active language. */
export function useLocalized() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  return (value: Localized) => value[lang]
}
