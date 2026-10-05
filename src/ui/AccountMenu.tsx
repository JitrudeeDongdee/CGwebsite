import { useState, useEffect, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Check from '@mui/icons-material/Check'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useThemeMode, type ThemePreference } from '../theme/AppThemeProvider'
import { loadProfile, PROFILE_EVENT } from '../account/profileStore'

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
]

/**
 * The signed-in user's account menu: a profile avatar (instead of the raw email
 * in the bar) that opens the account's email, the theme preference, and sign-out.
 * This is why a logged-in header no longer needs the separate theme gear.
 */
export function AccountMenu({
  email,
  userId,
  isStaff = false,
  onLogout,
}: {
  email: string
  /** Used to load the user's locally-saved profile (avatar + display name). */
  userId: string
  /** Staff/admin see an extra "open admin" entry (the back office has no header button). */
  isStaff?: boolean
  onLogout: () => void
}) {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [profile, setProfile] = useState(() => loadProfile(userId))

  // Keep the header avatar in step with edits made on the profile page.
  useEffect(() => {
    setProfile(loadProfile(userId))
    const refresh = () => setProfile(loadProfile(userId))
    window.addEventListener(PROFILE_EVENT, refresh)
    return () => window.removeEventListener(PROFILE_EVENT, refresh)
  }, [userId])

  const open = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const close = () => setAnchorEl(null)

  const label = profile.displayName || email
  // First letter of the name/email as the avatar fallback when there's no photo.
  const initial = label.trim().charAt(0).toUpperCase() || '?'

  return (
    <>
      <Tooltip title={label}>
        <IconButton onClick={open} size="small" aria-label={label} sx={{ p: 0.25 }}>
          <Avatar src={profile.avatar || undefined} sx={{ width: 30, height: 30, fontSize: 14, bgcolor: 'primary.main' }}>
            {profile.avatar ? null : initial}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
          {profile.displayName && (
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {profile.displayName}
            </Typography>
          )}
          <Typography variant="caption" noWrap color="text.secondary" sx={{ display: 'block' }}>
            {email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={RouterLink} to="/account" onClick={close}>
          <ListItemIcon>
            <ManageAccountsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('account.settings')}</ListItemText>
        </MenuItem>
        {isStaff && (
          <MenuItem component={RouterLink} to="/admin" onClick={close}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('account.admin')}</ListItemText>
          </MenuItem>
        )}
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
            <ListItemIcon>{preference === option.value && <Check fontSize="small" />}</ListItemIcon>
            <ListItemText>{t(option.labelKey)}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            onLogout()
            close()
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('auth.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
