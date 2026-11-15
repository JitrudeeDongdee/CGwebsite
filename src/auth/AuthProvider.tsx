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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { supabase, siteUrl } from '../supabase/client'

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

/** Which half of the auth dialog is showing. */
export type AuthMode = 'signIn' | 'signUp'

/** `null` means "signed in but not granted access yet", not "unknown". */
export type StaffRole = 'admin' | 'staff' | null

interface AuthContextValue {
  user: AuthUser | null
  role: StaffRole
  /** True until the first session lookup finishes — routes must wait for it,
   *  or a reload bounces a signed-in admin to the login page. */
  loading: boolean
  isStaff: boolean
  /** Run `action` if signed in, otherwise open the auth dialog and run it
   *  once a session exists. Use this to gate a protected action.
   *
   *  `prefer` picks which tab the dialog opens on. Pass `'signUp'` where the
   *  person is most likely NOT to have an account — a visitor who has just
   *  drawn a house has no reason to own one, and showing them a sign-in form
   *  asks for a password they never set. */
  requireAuth: (action?: () => void, prefer?: AuthMode) => void
  /** Open the auth dialog with no follow-up action. */
  promptLogin: () => void
  signIn: (email: string, password: string) => Promise<void>
  /** Resolves to `confirmationSent` when the account still has to be verified
   *  by e-mail, `signedIn` when Supabase handed back a session immediately. */
  signUp: (email: string, password: string) => Promise<'confirmationSent' | 'signedIn'>
  /** Sends a password-reset e-mail to the address (delivery depends on SMTP
   *  being configured in Supabase). */
  resetPassword: (email: string) => Promise<void>
  /** True while the user arrived from a password-reset OR invite link. The login
   *  page shows a "set your password" form instead of redirecting, since a
   *  temporary session is already established. Recovery is caught via the
   *  PASSWORD_RECOVERY event; invite is caught from the URL hash at module load
   *  (it only fires SIGNED_IN). */
  recovery: boolean
  /** Sets a new password for the recovery (or signed-in) session. */
  updatePassword: (password: string) => Promise<void>
  /** Verify a 6-digit reset code (OTP) from the e-mail and enter recovery mode. */
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Whether the page was opened from an e-mail link that should show the
 * "set your password" form — a password **reset** (`type=recovery`) OR an
 * **invite** (`type=invite`). Read once at module load, BEFORE supabase-js
 * strips the hash from the URL.
 *
 * Reset alone could rely on the `PASSWORD_RECOVERY` event, but an invite fires
 * `SIGNED_IN` instead — so without this the invited user is just signed in and
 * the login page redirects them to the home page before they ever set a
 * password. (Default implicit flow puts the type in the URL hash.)
 */
const ARRIVED_TO_SET_PASSWORD =
  typeof window !== 'undefined' && /[#&]type=(invite|recovery)\b/.test(window.location.hash)

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
  const [recovery, setRecovery] = useState(ARRIVED_TO_SET_PASSWORD)
  const [mode, setMode] = useState<AuthMode>('signIn')
  /** The address a confirmation e-mail just went to, or null. */
  const [sentTo, setSentTo] = useState<string | null>(null)
  // The protected action waiting for a session. A ref, not state: it is read
  // by the auth-state listener, which fires outside React's render cycle.
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      // Arriving from a reset link: show the set-new-password form, don't redirect.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '', name: session.user.email ?? '' })
        void loadRole(session.user.id)
        // A session arriving is the thing the waiting action was waiting for,
        // and it does not only arrive from this dialog: confirming the e-mail
        // in ANOTHER TAB signs this one in too, because supabase-js keeps the
        // session in localStorage and broadcasts the change. So someone can
        // press save, sign up, click the link in their mail, and come back to
        // find the save already done — which is the whole point.
        const waiting = pendingAction.current
        pendingAction.current = null
        if (waiting) {
          setDialogOpen(false)
          waiting()
        }
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

  const openDialog = useCallback((action?: () => void, prefer: AuthMode = 'signIn') => {
    pendingAction.current = action ?? null
    setEmail('')
    setPassword('')
    setError(null)
    setSentTo(null)
    setMode(prefer)
    setDialogOpen(true)
  }, [])

  const requireAuth = useCallback(
    (action?: () => void, prefer?: AuthMode) => {
      if (user) {
        action?.()
        return
      }
      openDialog(action, prefer)
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

  /**
   * Creates a customer account.
   *
   * With e-mail confirmation on (`mailer_autoconfirm = false`) Supabase returns
   * a user but NO session, so the caller must say "check your inbox" rather
   * than behave as if the person is signed in.
   *
   * ⚠️ Supabase deliberately does NOT reveal that an address is already
   * registered — it answers with a user whose `identities` array is EMPTY,
   * which otherwise looks exactly like a fresh sign-up. We keep that privacy
   * property (no account enumeration from the form) and still return
   * `confirmationSent`, so the message is the same either way: whoever owns
   * that inbox gets an e-mail, and nobody else learns anything.
   */
  const signUp = useCallback(async (address: string, secret: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
    const { data, error: failure } = await supabase.auth.signUp({
      email: address.trim(),
      password: secret,
      // Where the link in the e-mail lands. Uses the real site origin (not a
      // local dev host) and must be on Supabase's redirect allow-list, or the
      // link bounces to the project's Site URL.
      options: { emailRedirectTo: `${siteUrl()}/login?confirmed=1` },
    })
    if (failure) throw failure
    return data.session ? 'signedIn' : 'confirmationSent'
  }, [])

  const resetPassword = useCallback(async (address: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
    const { error: failure } = await supabase.auth.resetPasswordForEmail(address.trim(), {
      // Where the reset link lands (real site origin). Must be on Supabase's
      // redirect allow-list.
      redirectTo: `${siteUrl()}/login`,
    })
    if (failure) throw failure
  }, [])

  const updatePassword = useCallback(async (secret: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
    const { error: failure } = await supabase.auth.updateUser({ password: secret })
    if (failure) throw failure
    // Password set — leave recovery mode so the normal signed-in flow resumes.
    setRecovery(false)
  }, [])

  /**
   * Verify the 6-digit code from a reset e-mail and enter set-password mode.
   *
   * This is the OTP alternative to the reset LINK: a code is plain text in the
   * email, so email security scanners / ESP click-tracking can't consume it the
   * way they break a one-time link. On success a recovery session exists and we
   * flip `recovery` so the login page shows the "set new password" form.
   */
  const verifyRecoveryOtp = useCallback(async (address: string, token: string) => {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
    const { error: failure } = await supabase.auth.verifyOtp({
      email: address.trim(),
      token: token.trim(),
      type: 'recovery',
    })
    if (failure) throw failure
    setRecovery(true)
  }, [])

  /** Supabase's own minimum is 6; 8 is what the login page already asks for,
      and the two forms must not disagree about what a valid password is. */
  const tooShort = mode === 'signUp' && password.length < 8

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signUp') {
        const outcome = await signUp(email, password)
        if (outcome === 'confirmationSent') {
          // No session yet, so the waiting action CANNOT run — Supabase has
          // only created the account. It stays pending: the listener above
          // runs it the moment the confirmation lands.
          setSentTo(email.trim())
          return
        }
      } else {
        await signIn(email, password)
      }
      // Signed in. The listener fires on the same session and runs the
      // waiting action, so there is nothing to do here but get out of the way.
      setDialogOpen(false)
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
      signUp,
      resetPassword,
      recovery,
      updatePassword,
      verifyRecoveryOtp,
      logout,
    }),
    [user, role, loading, requireAuth, openDialog, signIn, signUp, resetPassword, recovery, updatePassword, verifyRecoveryOtp, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: sentTo ? undefined : 0 }}>
          {sentTo
            ? t('auth.confirmSentTitle')
            : mode === 'signUp'
              ? t('auth.signUpTitle')
              : t('auth.loginTitle')}
        </DialogTitle>

        {/* The account has been created but there is no session yet. The form
            is REPLACED rather than left on screen, so a second submit cannot
            fire a second e-mail. */}
        {sentTo ? (
          <>
            <DialogContent>
              <Alert severity="success" variant="outlined">
                {t('auth.confirmSentBody', { email: sentTo })}
              </Alert>
              <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
                {t('auth.confirmThenSaves')}
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)} variant="contained">
                {t('plans.gotIt')}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <Tabs
              value={mode}
              onChange={(_, next: AuthMode) => {
                setMode(next)
                setError(null)
              }}
              variant="fullWidth"
              sx={{ px: 3, minHeight: 40 }}
            >
              <Tab value="signUp" label={t('auth.signUpTab')} sx={{ minHeight: 40 }} />
              <Tab value="signIn" label={t('auth.signInTab')} sx={{ minHeight: 40 }} />
            </Tabs>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {/* Why they are being asked at all. Without this the dialog is
                    a password prompt that appeared for no stated reason. */}
                {pendingAction.current && (
                  <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
                    {t('plans.whySignUp')}
                  </Alert>
                )}
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
                    if (e.key === 'Enter' && !tooShort) void submit()
                  }}
                  // A new password must not be offered from the password
                  // manager's saved sign-ins, and a saved one must be.
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  helperText={mode === 'signUp' ? t('auth.passwordMin') : undefined}
                  error={mode === 'signUp' && password.length > 0 && tooShort}
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
                disabled={busy || !email.trim() || !password || tooShort}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {mode === 'signUp' ? t('auth.signUpSubmit') : t('auth.submit')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
