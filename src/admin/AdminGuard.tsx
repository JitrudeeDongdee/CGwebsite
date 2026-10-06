import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import LockIcon from '@mui/icons-material/LockOutlined'
import { useAuth } from '../auth/AuthProvider'
import { supabaseEnabled } from '../supabase/client'

/**
 * Gates the `/admin/*` screens on a staff role.
 *
 * **This is UX, not the security boundary.** Anyone can edit their own
 * JavaScript, so the only thing that actually stops a non-staff visitor writing
 * to the catalog is RLS: every policy on products/projects and every write to
 * the `catalog` bucket goes through `public.is_staff()`. What this component
 * buys is that a signed-out visitor sees a sign-in prompt instead of a screen
 * full of failed requests.
 *
 * Three states, deliberately distinct — conflating them is what makes an admin
 * area confusing to debug:
 *   - still checking the session → spinner (NOT a redirect; a reload would
 *     otherwise bounce a signed-in admin straight back out)
 *   - signed out → straight to /login, carrying `?next=` so sign-in returns
 *     here rather than dumping the person on a generic landing page
 *   - signed in, no role → ask an administrator (a different problem from
 *     being signed out, so it must not look like one)
 */
function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center', p: 3 }}>
      <Paper
        elevation={0}
        sx={{ p: 4, borderRadius: 3, border: 1, borderColor: 'divider', maxWidth: 460, textAlign: 'center' }}
      >
        {children}
      </Paper>
    </Box>
  )
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { user, isStaff, loading } = useAuth()
  const location = useLocation()

  if (!supabaseEnabled) {
    return (
      <Centered>
        <LockIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="h2" sx={{ mt: 1.5, fontSize: 20, fontWeight: 600 }}>
          ยังไม่ได้ตั้งค่า Supabase
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          หลังบ้านต้องใช้ <code>VITE_SUPABASE_URL</code> และ <code>VITE_SUPABASE_ANON_KEY</code>
        </Typography>
      </Centered>
    )
  }

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center', p: 6 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (!user) {
    // `replace`, so Back from the login page leaves the admin area instead of
    // bouncing between the two. `next` carries the whole path including any
    // query, which is what makes a deep link like /admin/products/edit/<id>
    // survive a sign-in.
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (!isStaff) {
    return (
      <Centered>
        <LockIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography variant="h2" sx={{ mt: 1.5, fontSize: 20, fontWeight: 600 }}>
          {t('auth.noAccessTitle')}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>{t('auth.noAccessBody')}</Typography>
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.disabled' }}>
          {t('auth.signedInAs')} {user.email}
        </Typography>
        <Button component={RouterLink} to="/home/contracting" variant="outlined" sx={{ mt: 3 }}>
          กลับหน้าแรก
        </Button>
      </Centered>
    )
  }

  return <>{children}</>
}
