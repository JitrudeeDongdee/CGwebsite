import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import StarIcon from '@mui/icons-material/Star'
import StarOutlineIcon from '@mui/icons-material/StarBorder'
import { deleteProject, listProjects, setFeatured, setPublished, type ProjectRow } from '../admin/portfolioApi'
import { imageUrl } from '../supabase/storage'
import { CATEGORY_META } from '../catalog/categories'

/**
 * Everything in the portfolio, at a glance: publish or unpublish, open the
 * public page, jump to the editor, delete.
 *
 * Adding and editing live on `/admin/portfolio/edit` — a list you can scan is a
 * different job from a form you fill in, and mixing them made both worse.
 *
 * NO ACCESS CONTROL YET, and the API behind it is development-only. See
 * `vite-dev-api.mts`.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function AdminPortfolioListPage() {
  const { t } = useTranslation()
  // Same screen serves both content types; which one is decided by the route it
  // is mounted at (`/admin/community` vs `/admin/portfolio`).
  const community = useLocation().pathname.startsWith('/admin/community')
  const base = community ? '/admin/community' : '/admin/portfolio'
  const kind = community ? 'community' : 'project'

  const [allRows, setRows] = useState<ProjectRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // The list fetches every row (one endpoint); each screen shows only its kind.
  const rows = allRows.filter((r) => (r.kind ?? 'project') === kind)

  const load = async () => {
    try {
      setRows(await listProjects())
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

  const toggle = async (row: ProjectRow) => {
    await setPublished(row.id, !row.published)
    await load()
  }

  const remove = async (row: ProjectRow) => {
    if (!confirm(`ลบ "${row.title?.th || row.slug || row.id}" และรูปทั้งหมดของผลงานนี้?`)) return
    await deleteProject(row.id)
    await load()
  }

  const photoCount = (row: ProjectRow) => row.images?.length ?? (row.image_path ? 1 : 0)

  /**
   * The star marks a category's featured project — one per category. Taking it
   * from another project is a decision worth a confirmation, so that case asks
   * first; starring a category that has none, or unstarring, is immediate.
   */
  const [pendingStar, setPendingStar] = useState<{ next: ProjectRow; current: ProjectRow } | null>(null)

  const star = async (row: ProjectRow) => {
    if (row.featured) {
      await setFeatured(row.id, false)
      await load()
      return
    }
    const current = rows.find((other) => other.category === row.category && other.featured)
    if (current) {
      setPendingStar({ next: row, current })
      return
    }
    await setFeatured(row.id, true)
    await load()
  }

  const confirmStar = async () => {
    if (!pendingStar) return
    await setFeatured(pendingStar.next.id, true)
    setPendingStar(null)
    await load()
  }

  const nameOf = (row: ProjectRow) => row.title?.th || row.slug || row.id.slice(0, 8)

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
              {community ? 'ผลงานสาธารณประโยชน์และการบริจาค' : 'ผลงานทั้งหมด'}
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {loading ? 'กำลังโหลด…' : `${rows.length} รายการ · เผยแพร่แล้ว ${rows.filter((r) => r.published).length}`}
            </Typography>
          </Box>
          <Button component={RouterLink} to={`${base}/edit`} variant="contained" startIcon={<AddIcon />}>
            {community ? 'เพิ่มกิจกรรม' : 'เพิ่มผลงาน'}
          </Button>
        </Stack>

        <Alert severity="warning" sx={{ mt: 2 }}>
          หน้านี้ยัง<strong>ไม่มีการตรวจสิทธิ์</strong> และทำงานได้เฉพาะตอนรัน <code>pnpm run dev</code> บนเครื่องคุณ
          — อย่าเพิ่ง deploy ขึ้น production
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            เรียก /api ไม่ได้: {error} — ต้องรันผ่าน <code>pnpm run dev</code> และตั้ง SUPABASE_SERVICE_ROLE_KEY ใน .env.local
          </Alert>
        )}

        <Paper elevation={0} sx={{ mt: 3, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 96 }}>รูปปก</TableCell>
                <TableCell>ชื่อ</TableCell>
                {!community && <TableCell>หมวด</TableCell>}
                <TableCell>ปี</TableCell>
                <TableCell align="center">จำนวนรูป</TableCell>
                {!community && <TableCell align="center">เด่นในหมวด</TableCell>}
                <TableCell align="center">เผยแพร่</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={community ? 6 : 8}>
                    <Stack spacing={1.5} sx={{ py: 3, alignItems: 'flex-start' }}>
                      <Typography variant="body2" color="text.secondary">
                        {community ? 'ยังไม่มีกิจกรรมในฐานข้อมูล' : 'ยังไม่มีผลงานในฐานข้อมูล'}
                      </Typography>
                      <Button component={RouterLink} to={`${base}/edit`} variant="outlined" startIcon={<AddIcon />}>
                        {community ? 'เพิ่มกิจกรรมแรก' : 'เพิ่มผลงานแรก'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {row.image_path ? (
                      <Box
                        component="img"
                        src={imageUrl(row.image_path)}
                        alt=""
                        sx={{ width: 72, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1.5, display: 'block' }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.title?.th || row.slug || '(ไม่มีชื่อ)'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.slug || `ไม่มี slug — ใช้ id: ${row.id.slice(0, 8)}…`}
                    </Typography>
                  </TableCell>
                  {!community && (
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${t(CATEGORY_META[row.category].labelKey)} (${row.category})`}
                      />
                    </TableCell>
                  )}
                  <TableCell>{row.year || '—'}</TableCell>
                  <TableCell align="center">{photoCount(row)}</TableCell>
                  {!community && (
                    <TableCell align="center">
                      <Tooltip title={row.featured ? 'เป็นผลงานเด่นของหมวดนี้ (กดเพื่อเอาออก)' : 'ตั้งเป็นผลงานเด่นของหมวดนี้'}>
                        <IconButton size="small" onClick={() => void star(row)}>
                          {row.featured ? <StarIcon fontSize="small" color="secondary" /> : <StarOutlineIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Switch size="small" checked={row.published} onChange={() => void toggle(row)} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="ดูหน้าจริง">
                      <IconButton
                        size="small"
                        component={RouterLink}
                        to={community ? '/community' : `/portfolio/${row.category}/${row.slug || row.id}`}
                        target="_blank"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {row.source_url && (
                      <Tooltip title="โพสต์ต้นฉบับ">
                        <IconButton size="small" href={row.source_url} target="_blank" rel="noopener noreferrer">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" component={RouterLink} to={`${base}/edit/${row.id}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton size="small" onClick={() => void remove(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Dialog open={pendingStar !== null} onClose={() => setPendingStar(null)}>
          <DialogTitle>เปลี่ยนผลงานเด่นของหมวดนี้?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              หมวด "{pendingStar?.next.category}" มีผลงานเด่นอยู่แล้วคือ "{pendingStar && nameOf(pendingStar.current)}"
              <br />
              ยืนยันเปลี่ยนเป็น "{pendingStar && nameOf(pendingStar.next)}" แทนไหม? (แต่ละหมวดมีได้อันเดียว)
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingStar(null)}>ยกเลิก</Button>
            <Button onClick={() => void confirmStar()} variant="contained" color="secondary">
              ยืนยันเปลี่ยน
            </Button>
          </DialogActions>
        </Dialog>
      </Wrap>
    </Box>
  )
}
