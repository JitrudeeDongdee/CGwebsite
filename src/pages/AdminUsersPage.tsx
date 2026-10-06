import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Snackbar from '@mui/material/Snackbar'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useAuth } from '../auth/AuthProvider'
import {
  listProfiles,
  listAuthUsers,
  setRole,
  inviteUser,
  sendPasswordReset,
  updateUserEmail,
  updateUserName,
  type AuthUser,
} from '../admin/usersApi'
import type { StaffRole } from '../auth/AuthProvider'

/**
 * Who can sign in, and what they may do.
 *
 * Role changes go straight to `profiles` (RLS enforces admin-only). The richer
 * actions — invite, change email, set/reset password, rename — need the
 * service-role key and therefore the `/api/admin-users` Pages Function; the
 * page still renders (and roles still work) if that function isn't deployed
 * yet, it just disables those buttons and says why.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 980, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

const ROLE_LABEL: Record<'admin' | 'staff' | 'none', string> = {
  admin: 'ผู้ดูแล',
  staff: 'พนักงาน',
  none: 'ไม่มีสิทธิ์',
}

type Dialogs =
  | { kind: 'invite' }
  | { kind: 'email'; user: AuthUser }
  | { kind: 'name'; user: AuthUser }
  | null

export function AdminUsersPage() {
  const { user, role: myRole } = useAuth()
  const isAdmin = myRole === 'admin'
  const [rows, setRows] = useState<AuthUser[]>([])
  const [authReady, setAuthReady] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [menu, setMenu] = useState<{ anchor: HTMLElement; user: AuthUser } | null>(null)
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [field, setField] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Prefer the auth-admin list (names, last sign-in, confirmed state); fall
      // back to the plain profiles table if the function isn't deployed.
      try {
        setRows(await listAuthUsers())
        setAuthReady(true)
      } catch {
        const profiles = await listProfiles()
        setRows(
          profiles.map((p) => ({
            id: p.id,
            email: p.email,
            name: null,
            role: p.role,
            createdAt: p.created_at,
            lastSignInAt: null,
            confirmed: true,
          })),
        )
        setAuthReady(false)
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const changeRole = async (row: AuthUser, next: StaffRole) => {
    setSaving(row.id)
    setError(null)
    try {
      const saved = await setRole(row.id, next)
      setRows((list) => list.map((item) => (item.id === row.id ? { ...item, role: saved.role } : item)))
    } catch (e) {
      await load()
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  const runAction = async (fn: () => Promise<void>, okMessage: string) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setDialog(null)
      setInfo(okMessage)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (u: AuthUser) => {
    if (!u.email) return
    await runAction(() => sendPasswordReset(u.email as string), `ส่งอีเมลตั้ง/รีเซ็ตรหัสผ่านไปที่ ${u.email} แล้ว`)
  }

  const admins = rows.filter((row) => row.role === 'admin').length
  const canManage = isAdmin && authReady

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
              ผู้ใช้และสิทธิ์
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {loading ? 'กำลังโหลด…' : `${rows.length} บัญชี · ผู้ดูแล ${admins} คน`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => {
                setField('')
                setDialog({ kind: 'invite' })
              }}
              startIcon={<PersonAddIcon />}
              variant="contained"
              disabled={!canManage}
            >
              เชิญผู้ใช้
            </Button>
            <Button onClick={() => void load()} startIcon={<RefreshIcon />} disabled={loading}>
              รีเฟรช
            </Button>
            <Button component={RouterLink} to="/admin" variant="text">
              กลับหน้าหลัก
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!isAdmin && (
          <Alert severity="info" sx={{ mt: 2 }}>
            บัญชีของคุณเป็น<strong>พนักงาน</strong> ดูรายชื่อได้แต่จัดการผู้ใช้ไม่ได้ — ต้องเป็นผู้ดูแล
          </Alert>
        )}

        {isAdmin && !authReady && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>ยังจัดการผู้ใช้ไม่ได้ (เชิญ / เปลี่ยนอีเมล / รีเซ็ตรหัสผ่าน / เปลี่ยนชื่อ)</AlertTitle>
            ต้องตั้งค่า <strong>SUPABASE_SERVICE_ROLE_KEY</strong> เป็น secret ใน Cloudflare Pages → โปรเจกต์ →
            Settings → Environment variables (Production) แล้ว deploy ใหม่หนึ่งครั้ง · การเปลี่ยนสิทธิ์ (role) ด้านล่างยังใช้ได้ปกติ
          </Alert>
        )}

        <Paper elevation={0} sx={{ mt: 3, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ผู้ใช้</TableCell>
                <TableCell sx={{ width: 110 }}>สิทธิ์</TableCell>
                <TableCell align="right" sx={{ width: 290 }}>เปลี่ยนสิทธิ์</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
                      <CircularProgress size={20} />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((row) => {
                  const self = row.id === user?.id
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        {row.name && (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.name}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontWeight: row.name ? 400 : 500, color: row.name ? 'text.secondary' : 'text.primary' }}>
                          {row.email ?? row.id.slice(0, 8)}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.25, alignItems: 'center' }}>
                          {self && (
                            <Typography variant="caption" color="text.secondary">
                              บัญชีของคุณ
                            </Typography>
                          )}
                          {authReady && !row.confirmed && (
                            <Chip size="small" variant="outlined" color="warning" label="ยังไม่ยืนยันอีเมล" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant={row.role ? 'filled' : 'outlined'}
                          color={row.role === 'admin' ? 'primary' : row.role === 'staff' ? 'secondary' : 'default'}
                          label={ROLE_LABEL[row.role ?? 'none']}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={row.role ?? 'none'}
                          // Changing your own row is refused by the database too —
                          // a sole admin demoting themselves would lock everyone out.
                          disabled={!isAdmin || self || saving === row.id}
                          onChange={(_, next: string | null) => {
                            if (!next) return
                            void changeRole(row, next === 'none' ? null : (next as StaffRole))
                          }}
                        >
                          <ToggleButton value="none">{ROLE_LABEL.none}</ToggleButton>
                          <ToggleButton value="staff">{ROLE_LABEL.staff}</ToggleButton>
                          <ToggleButton value="admin">{ROLE_LABEL.admin}</ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          aria-label="จัดการผู้ใช้"
                          disabled={!canManage}
                          onClick={(e) => setMenu({ anchor: e.currentTarget, user: row })}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          <strong>พนักงาน</strong> แก้เนื้อหาได้ทั้งหมด (สินค้า ผลงาน ข้อความ) ·{' '}
          <strong>ผู้ดูแล</strong> ทำได้ทุกอย่างของพนักงาน บวกกับจัดการผู้ใช้ ·{' '}
          <strong>ไม่มีสิทธิ์</strong> เข้าสู่ระบบได้แต่เปิดหลังบ้านไม่ได้
        </Typography>
      </Wrap>

      {/* Per-row actions */}
      <Menu anchorEl={menu?.anchor ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            const u = menu!.user
            setMenu(null)
            setField(u.name ?? '')
            setDialog({ kind: 'name', user: u })
          }}
        >
          เปลี่ยนชื่อที่แสดง
        </MenuItem>
        <MenuItem
          onClick={() => {
            const u = menu!.user
            setMenu(null)
            setField(u.email ?? '')
            setDialog({ kind: 'email', user: u })
          }}
        >
          เปลี่ยนอีเมล
        </MenuItem>
        <MenuItem
          disabled={!menu?.user.email}
          onClick={() => {
            const u = menu!.user
            setMenu(null)
            void resetPassword(u)
          }}
        >
          ส่งอีเมลตั้ง/รีเซ็ตรหัสผ่าน
        </MenuItem>
      </Menu>

      {/* Invite / edit dialogs */}
      <Dialog open={dialog?.kind === 'invite'} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>เชิญผู้ใช้ใหม่</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ระบบจะส่งอีเมลเชิญพร้อมลิงก์ให้ผู้ใช้ตั้งรหัสผ่านเอง · หลังเข้าใช้ได้ กำหนดสิทธิ์ให้ที่หน้านี้
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="อีเมล"
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={busy}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={busy || !field.includes('@')}
            onClick={() => void runAction(() => inviteUser(field.trim()), `ส่งคำเชิญไปที่ ${field.trim()} แล้ว`)}
          >
            {busy ? 'กำลังส่ง…' : 'ส่งคำเชิญ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog?.kind === 'email'} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>เปลี่ยนอีเมล</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="อีเมลใหม่"
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={busy}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={busy || !field.includes('@')}
            onClick={() =>
              dialog?.kind === 'email' &&
              void runAction(() => updateUserEmail(dialog.user.id, field.trim()), 'เปลี่ยนอีเมลแล้ว')
            }
          >
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog?.kind === 'name'} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>เปลี่ยนชื่อที่แสดง</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="ชื่อที่แสดง"
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={busy}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() =>
              dialog?.kind === 'name' &&
              void runAction(() => updateUserName(dialog.user.id, field.trim()), 'เปลี่ยนชื่อแล้ว')
            }
          >
            {busy ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(info)}
        autoHideDuration={4000}
        onClose={() => setInfo(null)}
        message={info ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
