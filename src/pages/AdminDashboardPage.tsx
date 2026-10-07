import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { loadAdminStats, loadRecentEdits, type AdminStats, type RecentEdit } from '../admin/statsApi'
import { loadGaStats, type GaStats, type GaStatsResult } from '../admin/gaApi'
import { unfurlAvailable } from '../admin/client'

/**
 * The back-office dashboard.
 *
 * Shows what is actually in the database and what needs attention, plus live
 * GA4 visitor numbers read through the `/api/ga-stats` Pages Function (the
 * Google service-account key stays server-side). The GA card degrades to an
 * honest "what's still missing" state when the GA env vars aren't set yet.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

function Stat({
  label,
  value,
  caption,
  to,
  tone = 'default',
  loading,
}: {
  label: string
  value: number
  caption?: string
  to: string
  tone?: 'default' | 'warning'
  loading: boolean
}) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: 1,
        borderColor: tone === 'warning' && value > 0 ? 'warning.main' : 'divider',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        transition: 'border-color .15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {loading ? (
        <Skeleton width={56} height={44} />
      ) : (
        <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: tone === 'warning' && value > 0 ? 'warning.main' : 'text.primary' }}>
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
      )}
    </Paper>
  )
}

function GaMetric({ label, value, loading }: { label: string; value: number | null; loading?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      {loading ? (
        <Skeleton width={48} height={30} />
      ) : (
        <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
          {value == null ? '—' : value.toLocaleString('th-TH')}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

/**
 * GA4 visitor stats.
 *
 * The card ALWAYS renders its full structure — the three metric boxes and the
 * top-products section — so it reads as a dashboard panel whether or not GA is
 * reachable. Numbers fill in when live; otherwise the boxes show "—" and a short
 * note says why (not configured, or an error). `loadGaStats` resolves to
 * `{ configured: false, reason }` for the normal not-set-up states and only
 * throws on real failures, so "no data yet" and "something broke" stay distinct.
 */
function GaCard() {
  const [data, setData] = useState<GaStatsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await loadGaStats()
        if (!cancelled) setData(r)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const live = data?.configured === true ? (data as GaStats) : null
  // One status line, in priority order: an error, else the not-configured
  // reason, else the live date-range caption.
  const note = error ?? (data && !data.configured ? data.reason : null)
  const topProducts = live?.topProducts ?? []

  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: live ? 'background.paper' : 'background.default' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <TrendingUpIcon sx={{ color: live ? 'primary.main' : 'text.disabled' }} />
        <Typography sx={{ fontWeight: 600, fontSize: 15, flexGrow: 1 }}>สถิติผู้เข้าชม (GA4)</Typography>
        {loading ? (
          <Skeleton width={70} height={24} />
        ) : live ? (
          <Chip size="small" color="success" variant="outlined" label={`${live.activeUsers} กำลังออนไลน์`} />
        ) : (
          <Chip size="small" label="ยังไม่เชื่อม" variant="outlined" />
        )}
      </Stack>

      {/* Structure is always present — numbers when live, "—" otherwise. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        <GaMetric label="ผู้ใช้" value={live?.last28.users ?? null} loading={loading} />
        <GaMetric label="เซสชัน" value={live?.last28.sessions ?? null} loading={loading} />
        <GaMetric label="เพจวิว" value={live?.last28.views ?? null} loading={loading} />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        28 วันล่าสุด{live ? ` · 7 วัน: ${live.last7.users.toLocaleString('th-TH')} ผู้ใช้` : ''}
      </Typography>

      <Divider sx={{ my: 1.5 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>สินค้าที่คนดูมากสุด (28 วัน)</Typography>
      {loading ? (
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={20} />)}</Stack>
      ) : topProducts.length > 0 ? (
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {topProducts.slice(0, 5).map((p) => (
            <Stack key={p.name} direction="row" sx={{ gap: 1 }}>
              <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{p.name}</Typography>
              <Typography variant="body2" color="text.secondary">{p.views.toLocaleString('th-TH')}</Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>— ยังไม่มีข้อมูล</Typography>
      )}

      {!loading && note && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: error ? 'warning.main' : 'text.secondary' }}>
          {note}
        </Typography>
      )}

      <Button
        href="https://analytics.google.com"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        endIcon={<ArrowForwardIcon />}
        sx={{ mt: 1.5 }}
      >
        เปิด Google Analytics
      </Button>
    </Paper>
  )
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<RecentEdit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [s, r] = await Promise.all([loadAdminStats(), loadRecentEdits()])
        if (cancelled) return
        setStats(s)
        setRecent(r)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const draftProjects = stats ? stats.projects.total - stats.projects.published : 0
  const when = (iso: string) =>
    new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          ภาพรวม
        </Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>สรุปข้อมูลในเว็บและสิ่งที่ต้องจัดการ</Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}

        {/* What needs doing, before the raw totals — a dashboard that leads with
            counts makes you hunt for the one number that is a task. */}
        {!loading && stats && (stats.messages.unhandled > 0 || draftProjects > 0 || stats.projects.noYear > 0 || stats.products.noPhoto > 0) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>ต้องจัดการ</AlertTitle>
            <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
              {stats.messages.unhandled > 0 && <li>ข้อความลูกค้ายังไม่ได้ตอบ {stats.messages.unhandled} รายการ</li>}
              {draftProjects > 0 && <li>ผลงานยังเป็นดราฟต์ {draftProjects} รายการ</li>}
              {stats.projects.noYear > 0 && <li>ผลงานยังไม่ได้ใส่ปี {stats.projects.noYear} รายการ</li>}
              {stats.products.noPhoto > 0 && <li>สินค้ายังไม่มีรูปปก {stats.products.noPhoto} รายการ</li>}
            </Stack>
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <Stat
            label="ข้อความยังไม่ได้ตอบ"
            value={stats?.messages.unhandled ?? 0}
            caption={`จากทั้งหมด ${stats?.messages.total ?? 0}`}
            to="/admin/messages"
            tone="warning"
            loading={loading}
          />
          <Stat
            label="สินค้าเผยแพร่"
            value={stats?.products.published ?? 0}
            caption={`จากทั้งหมด ${stats?.products.total ?? 0}`}
            to="/admin/products"
            loading={loading}
          />
          <Stat
            label="ผลงานเผยแพร่"
            value={stats?.projects.published ?? 0}
            caption={`จากทั้งหมด ${stats?.projects.total ?? 0}`}
            to="/admin/portfolio"
            loading={loading}
          />
          <Stat
            label="งานเพื่อสังคม"
            value={stats?.community.published ?? 0}
            caption={`จากทั้งหมด ${stats?.community.total ?? 0}`}
            to="/admin/community"
            loading={loading}
          />
        </Box>

        <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>แก้ไขล่าสุด</Typography>
            {loading && [0, 1, 2].map((i) => <Skeleton key={i} height={28} />)}
            {!loading && recent.length === 0 && (
              <Typography variant="body2" color="text.secondary">ยังไม่มีการแก้ไข</Typography>
            )}
            <Stack divider={<Divider flexItem />} spacing={0}>
              {recent.map((r) => (
                <Stack
                  key={`${r.table}-${r.id}`}
                  component={RouterLink}
                  to={r.table === 'products' ? `/admin/products/edit/${r.id}` : `/admin/portfolio/edit/${r.id}`}
                  direction="row"
                  sx={{ alignItems: 'center', gap: 1, py: 1, textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                    {r.title}
                  </Typography>
                  {!r.published && <Chip size="small" label="ดราฟต์" variant="outlined" />}
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {when(r.updatedAt)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <GaCard />
        </Box>

        {!unfurlAvailable && (
          <Alert severity="info" sx={{ mt: 3 }}>
            แก้ไขเนื้อหาได้ครบจากที่นี่ — ยกเว้นปุ่ม <strong>"ดึงข้อมูลจากโพสต์ Facebook"</strong>{' '}
            ที่ใช้ได้เฉพาะตอนรัน <code>pnpm run dev</code> บนเครื่อง เพราะเบราว์เซอร์เรียก facebook.com ตรงๆ ไม่ได้
          </Alert>
        )}
      </Wrap>
    </Box>
  )
}
