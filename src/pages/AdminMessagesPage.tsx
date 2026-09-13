import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import RefreshIcon from '@mui/icons-material/Refresh'
import PhoneIcon from '@mui/icons-material/PhoneOutlined'
import MailIcon from '@mui/icons-material/MailOutlined'
import CheckIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import UndoIcon from '@mui/icons-material/Undo'
import { db, explain } from '../admin/client'
import { formatCurrency } from '../pricing/estimate'

/**
 * Everything a customer sent us: the contact form, and the quote requests the
 * plan designer produces.
 *
 * This screen exists because those rows were unreadable in practice. RLS lets
 * only staff select from `contact_messages` and `leads`, and until sign-in
 * landed there was no staff account — so a message that arrived was stored
 * correctly and seen by nobody.
 */

interface MessageRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  message: string | null
  handled: boolean
  created_at: string
}

interface LeadRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  province: string | null
  timeline: string | null
  status: string | null
  grade: string | null
  estimate: { total?: number; currency?: string } | null
  created_at: string
}

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1000, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/** Thai-readable timestamp — the Buddhist year is what the office writes. */
function when(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Contact({ phone, email }: { phone: string | null; email: string | null }) {
  const digits = (phone ?? '').replace(/[^0-9+]/g, '')
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
      {digits.length >= 6 && (
        <Link href={`tel:${digits}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <PhoneIcon sx={{ fontSize: 16 }} />
          {phone}
        </Link>
      )}
      {email && (
        <Link href={`mailto:${email}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <MailIcon sx={{ fontSize: 16 }} />
          {email}
        </Link>
      )}
    </Stack>
  )
}

export function AdminMessagesPage() {
  const [tab, setTab] = useState(0)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [m, l] = await Promise.all([
        db().from('contact_messages').select('*').order('created_at', { ascending: false }),
        db().from('leads').select('*').order('created_at', { ascending: false }),
      ])
      if (m.error) throw explain(m.error, 'โหลดข้อความ')
      // `leads` may not exist in an older project; an empty list beats a dead screen.
      setMessages((m.data ?? []) as MessageRow[])
      setLeads(l.error ? [] : ((l.data ?? []) as LeadRow[]))
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

  const markHandled = async (row: MessageRow, handled: boolean) => {
    const { error: failure } = await db().from('contact_messages').update({ handled }).eq('id', row.id)
    if (failure) {
      setError(explain(failure, 'อัปเดตสถานะ').message)
      return
    }
    setMessages((list) => list.map((item) => (item.id === row.id ? { ...item, handled } : item)))
  }

  const waiting = messages.filter((row) => !row.handled).length

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
              ข้อความจากลูกค้า
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {loading ? 'กำลังโหลด…' : `${messages.length} ข้อความ · รอติดต่อกลับ ${waiting}`}
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
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`ฟอร์มติดต่อ (${messages.length})`} />
          <Tab label={`ขอใบเสนอราคา (${leads.length})`} />
        </Tabs>

        {loading && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        )}

        {!loading && tab === 0 && (
          <Stack spacing={1.5} sx={{ mt: 2.5 }}>
            {messages.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                ยังไม่มีข้อความจากลูกค้า
              </Typography>
            )}
            {messages.map((row) => (
              <Paper
                key={row.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: 1,
                  // An unanswered message should be obvious at a glance.
                  borderColor: row.handled ? 'divider' : 'secondary.main',
                  bgcolor: row.handled ? 'transparent' : 'background.paper',
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 600 }}>{row.name || '(ไม่ระบุชื่อ)'}</Typography>
                      {!row.handled && <Chip size="small" color="secondary" label="รอติดต่อกลับ" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {when(row.created_at)}
                    </Typography>
                    <Contact phone={row.phone} email={row.email} />
                  </Box>
                  <Button
                    size="small"
                    variant={row.handled ? 'text' : 'outlined'}
                    startIcon={row.handled ? <UndoIcon /> : <CheckIcon />}
                    onClick={() => void markHandled(row, !row.handled)}
                    sx={{ flexShrink: 0, alignSelf: 'flex-start' }}
                  >
                    {row.handled ? 'กลับเป็นรอติดต่อ' : 'ติดต่อแล้ว'}
                  </Button>
                </Stack>
                {row.message && (
                  <Typography sx={{ mt: 1.5, whiteSpace: 'pre-line', color: 'text.primary' }}>{row.message}</Typography>
                )}
              </Paper>
            ))}
          </Stack>
        )}

        {!loading && tab === 1 && (
          <Stack spacing={1.5} sx={{ mt: 2.5 }}>
            {leads.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                ยังไม่มีคำขอใบเสนอราคาจากเครื่องออกแบบ
              </Typography>
            )}
            {leads.map((row) => (
              <Paper key={row.id} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.name || '(ไม่ระบุชื่อ)'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {when(row.created_at)}
                      {row.province ? ` · ${row.province}` : ''}
                      {row.timeline ? ` · ${row.timeline}` : ''}
                    </Typography>
                    <Contact phone={row.phone} email={row.email} />
                  </Box>
                  {typeof row.estimate?.total === 'number' && (
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        ราคาประเมิน
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: 'secondary.main' }}>
                        {formatCurrency(row.estimate.total, row.estimate.currency ?? 'THB', 'th-TH')}
                      </Typography>
                      {row.grade && (
                        <Typography variant="caption" color="text.secondary">
                          เกรด {row.grade}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Wrap>
    </Box>
  )
}
