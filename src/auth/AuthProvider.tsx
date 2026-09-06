import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'

/**
 * MOCK authentication. There is no backend yet, so a "session" is just a name
 * kept in localStorage — enough to gate download / upload / send-to-team
 * behind a sign-in step. Swap `AuthProvider` for a real provider (e.g.
 * Supabase Auth) when the backend lands; the `useAuth` surface can stay.
 */
export interface AuthUser {
  name: string
}

interface AuthContextValue {
  user: AuthUser | null
  /** Run `action` if signed in, otherwise open the sign-in dialog and run it
   *  once sign-in succeeds. Use this to gate a protected action. */
  requireAuth: (action?: () => void) => void
  /** Open the sign-in dialog with no follow-up action. */
  promptLogin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'cg:session'

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.name === 'string' ? { name: parsed.name } : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  // The protected action waiting for a successful sign-in.
  const pendingAction = useRef<(() => void) | null>(null)

  const openDialog = useCallback((action?: () => void) => {
    pendingAction.current = action ?? null
    setName('')
    setPassword('')
    setError(false)
    setDialogOpen(true)
  }, [])

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (user) {
        action?.()
        return
      }
      openDialog(action)
    },
    [user, openDialog],
  )

  const promptLogin = useCallback(() => openDialog(), [openDialog])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const submit = useCallback(() => {
    // Mock rule: any non-empty name + password is accepted. This is a gate,
    // not real security — real credential checks need the backend.
    if (!name.trim() || !password.trim()) {
      setError(true)
      return
    }
    const next: AuthUser = { name: name.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(next)
    setDialogOpen(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }, [name, password])

  const value = useMemo<AuthContextValue>(
    () => ({ user, requireAuth, promptLogin, logout }),
    [user, requireAuth, promptLogin, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('auth.loginTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Alert severity="info" variant="outlined">
              {t('auth.demoNote')}
            </Alert>
            <TextField
              label={t('auth.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              fullWidth
              size="small"
              error={error && !name.trim()}
            />
            <TextField
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              fullWidth
              size="small"
              error={error && !password.trim()}
              helperText={error ? t('auth.required') : ' '}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialogOpen(false)}>
            {t('auth.cancel')}
          </Button>
          <Button variant="contained" onClick={submit}>
            {t('auth.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
