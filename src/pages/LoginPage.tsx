import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Snackbar from '@mui/material/Snackbar'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

/**
 * VISUAL-ONLY sign in / sign up page. Every button is clickable but nothing
 * authenticates yet — actions just surface a "demo mode" notice. Wiring this
 * to a real provider (Supabase Auth was chosen) is a separate, later step.
 */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.9 36.4 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"
      />
    </svg>
  )
}

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('signin')
  const [notice, setNotice] = useState(false)

  // Non-functional: every submit / provider button just flags the demo notice.
  const demo = () => setNotice(true)

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
          {mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('auth.pageSubtitle')}
        </Typography>

        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          {t('auth.demoPageNotice')}
        </Alert>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, next: Mode | null) => next && setMode(next)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="signin">{t('auth.signInTab')}</ToggleButton>
          <ToggleButton value="signup">{t('auth.signUpTab')}</ToggleButton>
        </ToggleButtonGroup>

        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault()
            demo()
          }}
        >
          {mode === 'signup' && (
            <TextField label={t('auth.name')} fullWidth size="small" autoComplete="name" />
          )}
          <TextField label={t('auth.email')} type="email" fullWidth size="small" autoComplete="email" />
          <TextField
            label={t('auth.password')}
            type="password"
            fullWidth
            size="small"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signup' && (
            <TextField label={t('auth.confirmPassword')} type="password" fullWidth size="small" />
          )}

          {mode === 'signin' && (
            <Link component="button" type="button" variant="caption" onClick={demo} sx={{ alignSelf: 'flex-start' }}>
              {t('auth.forgotPassword')}
            </Link>
          )}

          <Button type="submit" variant="contained" fullWidth>
            {mode === 'signin' ? t('auth.signInTab') : t('auth.signUpTab')}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('auth.orContinue')}
          </Typography>
        </Divider>

        <Stack spacing={1.5}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<GoogleIcon />}
            onClick={demo}
            sx={{ justifyContent: 'center', borderColor: 'divider' }}
          >
            {t('auth.continueGoogle')}
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<FacebookIcon />}
            onClick={demo}
            sx={{ bgcolor: '#1877F2', '&:hover': { bgcolor: '#0f66d0' }, color: '#fff' }}
          >
            {t('auth.continueFacebook')}
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <Link
            component="button"
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? t('auth.signUpTab') : t('auth.signInTab')}
          </Link>
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/" color="inherit">
            ← {t('auth.backToApp')}
          </Link>
        </Typography>
      </Paper>

      <Snackbar
        open={notice}
        autoHideDuration={3000}
        onClose={() => setNotice(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setNotice(false)}>
          {t('auth.demoActionNotice')}
        </Alert>
      </Snackbar>
    </Box>
  )
}
