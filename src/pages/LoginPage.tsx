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
import Link from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../auth/AuthProvider'

/**
 * Sign in, backed by Supabase Auth.
 *
 * Sign-up, the password reset and the Google/Facebook buttons are gone rather
 * than left as decoration: accounts are created by an administrator, who then
 * grants a role, so a self-service sign-up could only ever produce an account
 * that cannot do anything — a dead end dressed up as a door.
 */



export function LoginPage() {
  const { t } = useTranslation()
  const { signIn, user, isStaff } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Where to land after signing in: back where the guard sent them, else the
  // back office for staff and the designer for everyone else.
  const next = params.get('next')
  useEffect(() => {
    if (user) navigate(next ?? (isStaff ? '/admin' : '/design'), { replace: true })
  }, [user, isStaff, next, navigate])

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

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, border: 1, borderColor: 'divider' }}
      >
        <Typography variant="h2" component="h1" sx={{ mb: 0.5 }}>
          {t('auth.signInTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('auth.pageSubtitle')}
        </Typography>

        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t('auth.demoPageNotice')}
        </Alert>


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
            fullWidth
            disabled={busy || !email.trim() || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('auth.signInTab')}
          </Button>
        </Stack>



        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/design" color="inherit">
            ← {t('auth.backToApp')}
          </Link>
        </Typography>
      </Paper>

    </Box>
  )
}
