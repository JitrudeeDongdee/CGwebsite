import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LogoutIcon from '@mui/icons-material/Logout'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SettingsMenu } from './SettingsMenu'
import { useAuth } from '../auth/AuthProvider'
import { LogoMark } from './Logo'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

/**
 * Show the Admin entry in the header? Off until sign-in carries real roles —
 * the mock auth in `AuthProvider` has no permissions, so a visible link would
 * just advertise a page nobody should reach. Flip this to a role check
 * (e.g. `user?.role === 'admin'`) once auth is real.
 */
const SHOW_ADMIN_LINK = false

/** One header for the whole site — the marketing pages and the designer/admin
 *  app both mount this, so the top bar is identical everywhere. Dense (48px) to
 *  match the designer's `calc(100vh - 48px)` editor layout. */

const NAV: { to: string; key: string }[] = [
  { to: '/home', key: 'mkt.nav.home' },
  { to: '/products', key: 'mkt.nav.products' },
  { to: '/portfolio', key: 'mkt.nav.work' },
  { to: '/about', key: 'mkt.nav.about' },
  { to: '/contact', key: 'mkt.nav.contact' },
]

export function Brand() {
  return (
    <Stack
      component={RouterLink}
      to="/home"
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', textDecoration: 'none', color: 'text.primary', flexShrink: 0 }}
    >
      <LogoMark size={30} />
      <Stack sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: '0.01em', fontSize: 15, lineHeight: 1.05 }}>
          THAI DONGDEE
        </Typography>
        <Typography sx={{ fontSize: 9, letterSpacing: '0.24em', fontWeight: 600, color: 'text.secondary' }}>
          ENGINEERING
        </Typography>
      </Stack>
    </Stack>
  )
}

export function SiteHeader() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [drawer, setDrawer] = useState(false)

  const designActive = pathname === '/design'

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar variant="dense" sx={{ gap: 1.5 }}>
        <Brand />

        <Stack direction="row" spacing={0.25} sx={{ ml: 2, display: { xs: 'none', lg: 'flex' } }}>
          {NAV.map((item) => {
            // Highlight the section on its own page and on detail pages under it.
            const active = pathname === item.to || pathname.startsWith(item.to + '/')
            return (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                size="small"
                color={active ? 'primary' : 'inherit'}
              >
                {t(item.key)}
              </Button>
            )
          })}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto' }}>
          <Button
            component={RouterLink}
            to="/design"
            variant={designActive ? 'contained' : 'outlined'}
            color="secondary"
            size="small"
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {t('mkt.nav.designCta')}
          </Button>

          {/* Hidden until auth carries roles — see SHOW_ADMIN_LINK at the top of the file. */}
          {SHOW_ADMIN_LINK && (
            <Button
              component={RouterLink}
              to="/admin"
              size="small"
              color={pathname === '/admin' ? 'primary' : 'inherit'}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {t('app.navAdmin')}
            </Button>
          )}

          {user ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', display: { xs: 'none', sm: 'flex' } }}>
              <Typography variant="body2" color="text.secondary">{user.name}</Typography>
              <Tooltip title={t('auth.logout')}>
                <IconButton size="small" onClick={logout} aria-label={t('auth.logout')}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Button
              size="small"
              variant="text"
              component={RouterLink}
              to="/login"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              {t('auth.login')}
            </Button>
          )}

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}><LanguageSwitcher /></Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}><SettingsMenu /></Box>

          <IconButton onClick={() => setDrawer(true)} sx={{ display: { lg: 'none' } }} aria-label="menu">
            <MenuIcon />
          </IconButton>
        </Stack>
      </Toolbar>

      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 264 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Brand />
            <IconButton onClick={() => setDrawer(false)} aria-label="close"><CloseIcon /></IconButton>
          </Stack>
          <Divider />
          <List>
            {NAV.map((item) => (
              <ListItemButton key={item.to} component={RouterLink} to={item.to} onClick={() => setDrawer(false)}>
                <ListItemText primary={t(item.key)} />
              </ListItemButton>
            ))}
            {SHOW_ADMIN_LINK && (
              <ListItemButton component={RouterLink} to="/admin" onClick={() => setDrawer(false)}>
                <ListItemText primary={t('app.navAdmin')} />
              </ListItemButton>
            )}
            {user ? (
              <ListItemButton onClick={() => { logout(); setDrawer(false) }}>
                <ListItemText primary={t('auth.logout')} secondary={user.name} />
              </ListItemButton>
            ) : (
              <ListItemButton component={RouterLink} to="/login" onClick={() => setDrawer(false)}>
                <ListItemText primary={t('auth.login')} />
              </ListItemButton>
            )}
          </List>
          <Divider />
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Button component={RouterLink} to="/design" variant="contained" color="secondary" onClick={() => setDrawer(false)}>
              {t('mkt.nav.designCta')}
            </Button>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LanguageSwitcher />
              <SettingsMenu />
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  )
}
