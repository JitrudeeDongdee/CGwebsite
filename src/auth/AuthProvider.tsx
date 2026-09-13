import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import CircularProgress from '@mui/material/CircularProgress'
import { supabase } from '../supabase/client'

/**
 * Real authentication, backed by Supabase Auth.
 *
 * Two things are deliberately separate here:
 *   - **signed in** (`user`) — anybody with an account. Gates the designer's
 *     download / upload / send-to-team actions, which is all it ever did.
 *   - **staff** (`role`) — read from `public.profiles`, which starts NULL for
 *     every new account. Only this opens `/admin`.
 *
 * The client-side role check is UX, not security: it decides what to render.
 * The real boundary is RLS in the database — `is_staff()` guards every write to
 * products/projects and every object in the `catalog` bucket, so a signed-in
 * visitor who forges their way to an admin screen still cannot change anything.
 *
 * With no Supabase project configured (`supabase === null`) the app runs
 * signed-out and `/admin` is unreachable, which keeps a fresh checkout working.
 */
export interface AuthUser {
  /** Display name — the profile e-mail, which is all we ask for at sign-up. */
  name: string
  id: string
  email: string
}

/** `null` means "signed in but not granted access yet", not "unknown". */
export type StaffRole = 'admin' | 'staff' | null

interface AuthContextValue {
  user: AuthUser | null
  role: StaffRole
  /** True until the first session lookup finishes — routes must wait for it,
   *  or a reload bounces a signed-in admin to the login page. */
  loading: boolean
  isStaff: boolean
  /** Run `action` if signed in, otherwise open the sign-in dialog and run it
   *  once sign-in succeeds. Use this to gate a protected action. */
  requireAuth: (action?: () => void) => void
  /** Open the sign-in dialog with no follow-up action. */
  promptLogin: () => void
  signIn: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<StaffRole>(null)
  const [loading, setLoading] = useState(supabase !== null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // The protected action waiting for a successful sign-in.
  const pendingAction = useRef<(() => void) | null>(null)

  /**
   * Reads the caller's own profile row. `profiles_self_read` lets a signed-in
   * user read their own row, so this needs no elevated rights — and a missing
   * row (the trigger has not fired yet) is a no-role user, not an error.
   */
  const loadRole = useCallback(async (id: string) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle()
    setRole((data?.role as StaffRole) ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    void supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (cancelled) return
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '', name: session.user.email ?? '' })
        await loadRole(session.user.id)
      }
      if (!cancelled) setLoading(false)
    })

    // Keeps every tab in step, and picks up the token refresh Supabase runs on
    // its own — without this a long-open admin tab silently loses its session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '', name: session.user.email ?? '' })
        void loadRole(session.user.id)
      } else {
        setUser(null)
        setRole(null)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadRole])

  const openDialog = useCallback((action?: () => void) => {
    pendingAction.current = action ?? null
    setEmail('')
    setPassword('')
    setError(null)
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

  const signIn = useCallback(async (address: string, secret: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
    const { error: failure } = await supabase.auth.signInWithPassword({
      email: address.trim(),
      password: secret,
    })
    if (failure) throw failure
  }, [])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      setDialogOpen(false)
      pendingAction.current?.()
      pendingAction.current = null
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  const logout = useCallback(() => {
    void supabase?.auth.signOut()
    setUser(null)
    setRole(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isStaff: role === 'admin' || role === 'staff',
      requireAuth,
      promptLogin: () => openDialog(),
      signIn,
      logout,
    }),
    [user, role, loading, requireAuth, openDialog, signIn, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('auth.loginTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              autoComplete="current-password"
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={busy}>
            {t('auth.cancel')}
          </Button>
          <Button
            onClick={() => void submit()}
            variant="contained"
            disabled={busy || !email.trim() || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
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
