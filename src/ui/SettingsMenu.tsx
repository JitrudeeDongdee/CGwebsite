import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListSubheader from '@mui/material/ListSubheader'
import Check from '@mui/icons-material/Check'
import Brightness6Outlined from '@mui/icons-material/Brightness6Outlined'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useThemeMode, type ThemePreference } from '../theme/AppThemeProvider'

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
]

/** Language lives in the toolbar itself; this is theme only. */
export function SettingsMenu() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const open = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const close = () => setAnchorEl(null)

  return (
    <>
      <IconButton onClick={open} aria-label={t('settings.theme')} size="small">
        <Brightness6Outlined fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
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
