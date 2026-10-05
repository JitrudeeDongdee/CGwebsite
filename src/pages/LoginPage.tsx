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
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import GoogleIcon from '@mui/icons-material/Google'
import FacebookIcon from '@mui/icons-material/Facebook'
import ChatIcon from '@mui/icons-material/Chat'
import { useAuth } from '../auth/AuthProvider'

/**
 * The CUSTOMER sign-in and sign-up, backed by Supabase Auth.
 *
 * Staff have their own page at `/admin/login`: the two audiences want opposite
 * things — a customer may create an account, a staff member never can — and
 * mixing them meant one form had to apologise for half of itself.
 *
 * A customer account unlocks the designer's save / download / send-to-team
 * actions and nothing else; it carries no role, so it cannot reach `/admin`.
 *
 * The Google/Facebook buttons are shown but DISABLED — placeholders until the
 * OAuth providers are configured in Supabase. They make the intended sign-in
 * options visible without pretending to work yet.
 */



export function LoginPage() {
  const { t } = useTranslation()
  const { signIn, signUp, resetPassword, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  /** Set once the sign-up succeeded: the person must now go to their inbox. */
  const [sentTo, setSentTo] = useState<string | null>(null)
  /** Set once a password-reset e-mail has been requested. */
  const [resetSent, setResetSent] = useState(false)

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError(t('auth.resetNeedEmail'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Where to land after signing in: back where they came from, else the house
   * home page.
   *
   * No staff special-case any more. It read `isStaff` in the same tick the user
   * appeared, and the role arrives one request LATER — so it was false for
   * everyone at that moment and sent staff to the wrong place regardless. Staff
   * have `/admin/login`, which waits for the role precisely because it needs to.
   */
  const next = params.get('next')
  useEffect(() => {
    if (user) navigate(next ?? '/home/house', { replace: true })
  }, [user, next, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'signUp' && password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signIn') {
        await signIn(email, password)
        return
      }
      const outcome = await signUp(email, password)
      // `signedIn` only happens if confirmation is turned off in Supabase; the
      // redirect effect above then takes over.
      if (outcome === 'confirmationSent') setSentTo(email.trim())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: 'signIn' | 'signUp') => {
    setMode(next)
    setError(null)
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
          {mode === 'signIn' ? t('auth.customerSignInTitle') : t('auth.signUpTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('auth.pageSubtitle')}
        </Typography>

        {params.get('confirmed') === '1' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('auth.confirmedNotice')}
          </Alert>
        )}


        {sentTo ? (
          <Stack spacing={2}>
            <Alert severity="success">
              <strong>{t('auth.confirmSentTitle')}</strong>
              <br />
              {t('auth.confirmSentBody', { email: sentTo })}
            </Alert>
            <Button variant="outlined" onClick={() => { setSentTo(null); switchMode('signIn') }}>
              {t('auth.haveAccount')}
            </Button>
          </Stack>
        ) : (
        <Stack component="form" spacing={2} onSubmit={(e) => void submit(e)}>
          {error && <Alert severity="error">{error}</Alert>}
          {resetSent && <Alert severity="success" onClose={() => setResetSent(false)}>{t('auth.resetSent')}</Alert>}
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
          {mode === 'signIn' && (
            <Button
              variant="text"
              size="small"
              onClick={() => void forgotPassword()}
              disabled={busy}
              sx={{ alignSelf: 'flex-end', mt: -1 }}
            >
              {t('auth.forgotPassword')}
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={busy || !email.trim() || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {mode === 'signIn' ? t('auth.signInTab') : t('auth.signUpSubmit')}
          </Button>
          <Button variant="text" size="small" onClick={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
            {mode === 'signIn' ? t('auth.signUpCta') : t('auth.haveAccount')}
          </Button>

          {/* Social sign-in: shown but disabled until the OAuth providers are
              wired up in Supabase. */}
          <Divider sx={{ my: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t('auth.orContinueWith')}</Typography>
          </Divider>
          <Button fullWidth variant="outlined" color="inherit" disabled startIcon={<GoogleIcon />}>
            {t('auth.continueWith')} Google
          </Button>
          <Button fullWidth variant="outlined" color="inherit" disabled startIcon={<FacebookIcon />}>
            {t('auth.continueWith')} Facebook
          </Button>
          <Button fullWidth variant="outlined" color="inherit" disabled startIcon={<ChatIcon />}>
            {t('auth.continueWith')} LINE
          </Button>
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
            {t('auth.socialSoon')}
          </Typography>
        </Stack>
        )}



        <Stack spacing={0.5} sx={{ mt: 2.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            <Link component={RouterLink} to="/design" color="inherit">
              ← {t('auth.backToApp')}
            </Link>
          </Typography>
        </Stack>
      </Paper>

    </Box>
  )
}
