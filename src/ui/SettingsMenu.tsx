import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListSubheader from '@mui/material/ListSubheader'
import Divider from '@mui/material/Divider'
import Check from '@mui/icons-material/Check'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'
import { useThemeMode, type ThemePreference } from '../theme/AppThemeProvider'

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
]

export function SettingsMenu() {
  const { t, i18n } = useTranslation()
  const { preference, setPreference } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const currentLanguage = i18n.resolvedLanguage as SupportedLanguage

  const open = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const close = () => setAnchorEl(null)

  return (
    <>
      <IconButton onClick={open} aria-label={t('settings.language')} size="small">
        <SettingsOutlined fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        <ListSubheader disableSticky>{t('settings.language')}</ListSubheader>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <MenuItem
            key={lang}
            selected={currentLanguage === lang}
            onClick={() => {
              void i18n.changeLanguage(lang)
              close()
            }}
          >
            <ListItemIcon>{currentLanguage === lang && <Check fontSize="small" />}</ListItemIcon>
            <ListItemText>{LANGUAGE_LABELS[lang]}</ListItemText>
          </MenuItem>
        ))}

        <Divider />

        <ListSubheader disableSticky>{t('settings.theme')}</ListSubheader>
        {THEME_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={preference === option.value}
            onClick={() => {
              setPreference(option.value)
              close()
            }}
          >
            <ListItemIcon>
              {preference === option.value && <Check fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{t(option.labelKey)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
