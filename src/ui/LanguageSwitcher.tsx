import { useTranslation } from 'react-i18next'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'

/** Short codes rather than full names — this sits in the toolbar permanently. */
const SHORT_LABELS: Record<SupportedLanguage, string> = {
  th: 'ไทย',
  en: 'EN',
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage as SupportedLanguage

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={current}
      onChange={(_, next: SupportedLanguage | null) => {
        if (next) void i18n.changeLanguage(next)
      }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <ToggleButton key={lang} value={lang} sx={{ px: 1.5, py: 0.25 }}>
          {SHORT_LABELS[lang]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
