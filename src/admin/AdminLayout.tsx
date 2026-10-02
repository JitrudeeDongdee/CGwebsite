import { Suspense, useEffect, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Fab from '@mui/material/Fab'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
import { RouteFallback } from '../ui/RouteFallback'
import { useAuth } from '../auth/AuthProvider'
import { activeModule, modulesFor } from './modules'

/**
 * Chrome for every `/admin` screen: a left sidebar that collapses to icons.
 *
 * Two different components by width, on purpose. On a desktop the sidebar is
 * permanent and shrinks to a 64px icon rail, so it never hides the page it is
 * navigating. On a phone there is no room for either, so it becomes a normal
 * overlay opened from a button — a 64px rail would eat a fifth of a 375px
 * screen and still not say what the icons mean.
 */
const FULL = 248
const RAIL = 64
const STORAGE_KEY = 'cg:admin-nav-collapsed'

export function AdminLayout() {
  const theme = useTheme()
  // `md` is where the content column still has room beside a 248px sidebar.
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const { role } = useAuth()
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // Private mode and blocked storage both throw here; the default is fine.
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* not worth failing a render over */
    }
  }, [collapsed])

  // Navigating is the signal the drawer has done its job on a phone.
  useEffect(() => setMobileOpen(false), [pathname])

  const modules = modulesFor(role)
  const current = activeModule(pathname, role)
  const width = desktop && collapsed ? RAIL : FULL

  const items = (
    <List sx={{ py: 1 }}>
      {modules.map((m) => {
        const selected = current?.to === m.to
        const button = (
          <ListItemButton
            component={RouterLink}
            to={m.to}
            selected={selected}
            sx={{
              mx: 1,
              borderRadius: 2,
              minHeight: 44,
              justifyContent: desktop && collapsed ? 'center' : 'flex-start',
              px: desktop && collapsed ? 1 : 1.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: desktop && collapsed ? 0 : 1.75, color: selected ? 'primary.main' : 'inherit' }}>
              {m.icon}
            </ListItemIcon>
            {!(desktop && collapsed) && (
              <ListItemText
                primary={m.title}
                slotProps={{
                  // Long Thai titles would otherwise push the sidebar wider
                  // than it is allowed to be.
                  primary: { noWrap: true, sx: { fontSize: 14, fontWeight: selected ? 600 : 400 } },
                }}
              />
            )}
          </ListItemButton>
        )
        return (
          <ListItem key={m.to} disablePadding>
            {/* Collapsed, the icon is all there is — the name has to come from
                somewhere, so it comes from the tooltip. */}
            {desktop && collapsed ? (
              <Tooltip title={m.title} placement="right">
                {button}
              </Tooltip>
            ) : (
              button
            )}
          </ListItem>
        )
      })}
    </List>
  )

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: desktop && collapsed ? 'center' : 'space-between', px: desktop && collapsed ? 0 : 2, py: 1.5, minHeight: 52 }}>
      {!(desktop && collapsed) && (
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.secondary' }}>หลังบ้าน</Typography>
      )}
      {desktop && (
        <Tooltip title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'} placement="right">
          <IconButton size="small" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
      {desktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width,
            flexShrink: 0,
            // `transition` on the paper as well, or the sidebar snaps while the
            // content column slides.
            '& .MuiDrawer-paper': {
              width,
              boxSizing: 'border-box',
              position: 'relative',
              borderRight: 1,
              borderColor: 'divider',
              overflowX: 'hidden',
              transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
            },
            transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
          }}
        >
          {header}
          <Divider />
          {items}
        </Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: FULL } }}>
          {header}
          <Divider />
          {items}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </Box>

      {!desktop && (
        <Fab
          color="primary"
          size="medium"
          onClick={() => setMobileOpen(true)}
          aria-label="เปิดเมนูหลังบ้าน"
          sx={{ position: 'fixed', left: 16, bottom: 16, zIndex: (t) => t.zIndex.drawer - 1 }}
        >
          <MenuIcon />
        </Fab>
      )}
    </Box>
  )
}
