import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LockIcon from '@mui/icons-material/LockOutlined'
import { useAuth } from '../auth/AuthProvider'

/**
 * Staff sign-in, kept apart from the customer one at `/login`.
 *
 * ⚠️ **Separate pages, not separate accounts.** Both sign in against the same
 * Supabase Auth pool; what keeps a customer out of the back office is their
 * profile having no role, enforced by `public.is_staff()` in RLS. So this page
 * is about not confusing two audiences — a customer should never be shown a
 * staff login, and staff should never be offered a sign-up — and NOT about
 * security. Signing in here with a customer account lands on the "no access"
 * card, exactly as it would anywhere else.
 *
 * Deliberately no sign-up and no social buttons: accounts are created by an
 * administrator, so a sign-up here could only ever produce an account that
 * cannot do anything.
 */
export function AdminLoginPage() {
  const { t } = useTranslation()
  const { signIn, user, isStaff, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const next = params.get('next')

  useEffect(() => {
    // Wait for the role before deciding where to go: `isStaff` is false for a
    // moment after sign-in while the profile loads, and acting on it too early
    // sends a real admin to the wrong place.
    if (loading || !user) return
    if (isStaff) navigate(next ?? '/admin', { replace: true })
  }, [user, isStaff, loading, next, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  // Signed in, but this account is not staff. Saying so here is kinder than
  // bouncing them to the guard's card with no idea why the form "failed".
  const wrongAccount = Boolean(user) && !isStaff && !loading

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: 'background.default' }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <LockIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="h2" component="h1" sx={{ fontSize: 22, fontWeight: 600 }}>
            {t('auth.adminTitle')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('auth.adminSubtitle')}
        </Typography>

        {wrongAccount && (
          // Signing in again as someone else works, but only if you realise the
          // form below is still live — the warning alone reads like a dead end.
          // An explicit sign-out is the obvious move and it was missing.
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={logout}>
                {t('auth.logout')}
              </Button>
            }
          >
            {t('auth.noAccessBody')}
            <br />
            {t('auth.signedInAs')} {user?.email}
            <br />
            {t('auth.switchAccount')}
          </Alert>
        )}

        <Stack component="form" spacing={2} onSubmit={(e) => void submit(e)}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            autoComplete="email"
            autoFocus
          />
          <TextField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy || !email.trim() || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('auth.submit')}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
          {t('auth.adminNoSignup')}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <RouterLink to="/home/contracting" style={{ fontSize: 13 }}>
            {t('auth.backToSite')}
          </RouterLink>
          <RouterLink to="/login" style={{ fontSize: 13 }}>
            {t('auth.customerLogin')}
          </RouterLink>
        </Stack>
      </Paper>
    </Box>
  )
}
