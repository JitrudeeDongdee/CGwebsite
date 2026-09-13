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
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAuth } from '../auth/AuthProvider'
import { listProfiles, setRole, type ProfileRow } from '../admin/usersApi'
import type { StaffRole } from '../auth/AuthProvider'

/**
 * Who can sign in, and what they may do.
 *
 * Staffing changes used to mean the service-role key and a SQL editor. Who
 * works here is data that changes, not schema — so it belongs in a screen, not
 * in a migration that would commit an employee's e-mail to git and replay it
 * into every environment.
 *
 * The one thing still done by hand is the FIRST admin: only an admin can
 * appoint one, and at the start there is none.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

const ROLE_LABEL: Record<'admin' | 'staff' | 'none', string> = {
  admin: 'ผู้ดูแล',
  staff: 'พนักงาน',
  none: 'ไม่มีสิทธิ์',
}

export function AdminUsersPage() {
  const { user, role: myRole } = useAuth()
  const isAdmin = myRole === 'admin'
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listProfiles())
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

  const change = async (row: ProfileRow, next: StaffRole) => {
    setSaving(row.id)
    setError(null)
    try {
      const saved = await setRole(row.id, next)
      setRows((list) => list.map((item) => (item.id === row.id ? saved : item)))
    } catch (e) {
      // Re-read rather than trust the screen: a refused write leaves the toggle
      // showing a role the database never accepted. Order matters — `load()`
      // clears the error on success, so setting it first swallowed the very
      // message the person needs.
      await load()
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  const admins = rows.filter((row) => row.role === 'admin').length

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
            บัญชีของคุณเป็น<strong>พนักงาน</strong> ดูรายชื่อได้แต่เปลี่ยนสิทธิ์ไม่ได้ — ต้องเป็นผู้ดูแล
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>เพิ่มบัญชีใหม่</AlertTitle>
          สร้างบัญชีที่ Supabase → Authentication → Add user แล้วกลับมากำหนดสิทธิ์ที่หน้านี้ —
          เว็บไม่เปิดให้สมัครเอง เพราะบัญชีที่สมัครเองจะไม่มีสิทธิ์อะไรอยู่ดี
        </Alert>

        <Paper elevation={0} sx={{ mt: 3, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>อีเมล</TableCell>
                <TableCell sx={{ width: 120 }}>สิทธิ์ปัจจุบัน</TableCell>
                <TableCell align="right" sx={{ width: 300 }}>เปลี่ยนสิทธิ์</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3}>
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
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.email ?? row.id.slice(0, 8)}
                        </Typography>
                        {self && (
                          <Typography variant="caption" color="text.secondary">
                            บัญชีของคุณ
                          </Typography>
                        )}
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
                          // Changing your own row is refused by the database as
                          // well — a sole admin demoting themselves would lock
                          // every human out of role management for good.
                          disabled={!isAdmin || self || saving === row.id}
                          onChange={(_, next: string | null) => {
                            if (!next) return
                            void change(row, next === 'none' ? null : (next as StaffRole))
                          }}
                        >
                          <ToggleButton value="none">{ROLE_LABEL.none}</ToggleButton>
                          <ToggleButton value="staff">{ROLE_LABEL.staff}</ToggleButton>
                          <ToggleButton value="admin">{ROLE_LABEL.admin}</ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          <strong>พนักงาน</strong> แก้เนื้อหาได้ทั้งหมด (สินค้า ผลงาน ข้อความ) ·{' '}
          <strong>ผู้ดูแล</strong> ทำได้ทุกอย่างของพนักงาน บวกกับเปลี่ยนสิทธิ์คนอื่น ·{' '}
          <strong>ไม่มีสิทธิ์</strong> เข้าสู่ระบบได้แต่เปิดหลังบ้านไม่ได้
        </Typography>
      </Wrap>
    </Box>
  )
}
