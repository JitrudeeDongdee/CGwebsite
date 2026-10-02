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
import { unfurlAvailable } from '../admin/client'

/**
 * The back-office dashboard.
 *
 * Shows what is actually in the database and what needs attention. The GA4 half
 * is a placeholder on purpose — see the card at the bottom: the measurement ID
 * is not set on the deployed site, so there is no traffic data to show yet, and
 * reading the GA4 Data API needs a Google service-account key that cannot live
 * in a browser bundle.
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

          {/* Honest placeholder. Two separate things block it, and both are
              named so nobody has to rediscover them. */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon sx={{ color: 'text.disabled' }} />
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>สถิติผู้เข้าชม (GA4)</Typography>
              <Chip size="small" label="ยังไม่เชื่อม" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีข้อมูลให้แสดง เพราะ:
            </Typography>
            <Stack component="ol" sx={{ m: 0, mt: 1, pl: 2.5 }} spacing={0.5}>
              <Typography component="li" variant="body2" color="text.secondary">
                ยังไม่ได้ตั้ง <code>VITE_GA_ID</code> ใน Cloudflare Pages — เว็บจริงจึงยังไม่เก็บสถิติเลย
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                การอ่านตัวเลขจาก GA4 ต้องใช้คีย์ของ Google ที่ห้ามอยู่ในเบราว์เซอร์ ต้องผ่าน Edge Function
              </Typography>
            </Stack>
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
