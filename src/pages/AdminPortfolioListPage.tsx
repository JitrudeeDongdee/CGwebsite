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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
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
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { useViewMode } from '../admin/useViewMode'
import { ViewModeToggle } from '../admin/ViewModeToggle'
import { ADMIN_GRID_SX, AdminGridCard } from '../admin/AdminGridCard'
import type { ProductCategory } from '../catalog/types'

/**
 * Everything in the portfolio, at a glance: publish or unpublish, open the
 * public page, jump to the editor, delete.
 *
 * Adding and editing live on `/admin/portfolio/edit` — a list you can scan is a
 * different job from a form you fill in, and mixing them made both worse.
 *
 * Staff only — `AdminGuard` decides who sees it, and RLS decides who can
 * actually change anything.
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
  // Search + filters (client-side over the already-loaded rows).
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<ProductCategory | 'all'>('all')
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all')
  // Keyed by screen: portfolio and community are the same component but two
  // different lists, and someone may want cards for one and a table for the other.
  const [view, setView] = useViewMode(kind === 'community' ? 'community' : 'portfolio')
  // The list fetches every row (one endpoint); each screen shows only its kind.
  const rows = allRows.filter((r) => (r.kind ?? 'project') === kind)

  const q = query.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    // Community has no category, so the category filter only applies to portfolio.
    if (!community && cat !== 'all' && row.category !== cat) return false
    if (status === 'published' && !row.published) return false
    if (status === 'draft' && row.published) return false
    if (!q) return true
    return [row.title?.th, row.title?.en, row.slug, row.year].some((v) => v?.toLowerCase().includes(q))
  })
  const filtering = q !== '' || (!community && cat !== 'all') || status !== 'all'

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

  /** The same controls in both views, so neither can quietly lose a button. */
  const StarButton = ({ row }: { row: ProjectRow }) => (
    <Tooltip title={row.featured ? 'เป็นผลงานเด่นของหมวดนี้ (กดเพื่อเอาออก)' : 'ตั้งเป็นผลงานเด่นของหมวดนี้'}>
      <IconButton size="small" onClick={() => void star(row)}>
        {row.featured ? <StarIcon fontSize="small" color="secondary" /> : <StarOutlineIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  )

  const RowActions = ({ row }: { row: ProjectRow }) => (
    <>
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
    </>
  )

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
              {community ? 'ผลงานสาธารณประโยชน์และการบริจาค' : 'ผลงานทั้งหมด'}
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {loading
                ? 'กำลังโหลด…'
                : filtering
                  ? `พบ ${filtered.length} จาก ${rows.length} รายการ`
                  : `${rows.length} รายการ · เผยแพร่แล้ว ${rows.filter((r) => r.published).length}`}
            </Typography>
          </Box>
          <Button component={RouterLink} to={`${base}/edit`} variant="contained" startIcon={<AddIcon />}>
            {community ? 'เพิ่มกิจกรรม' : 'เพิ่มผลงาน'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search + filters (client-side). Category only applies to portfolio. */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
          <TextField
            size="small"
            placeholder={community ? 'ค้นหาชื่อ / slug / ปี' : 'ค้นหาชื่อ / slug / ปี'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {!community && (
            <TextField
              select
              size="small"
              label="หมวด"
              value={cat}
              onChange={(e) => setCat(e.target.value as ProductCategory | 'all')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">ทุกหมวด</MenuItem>
              {PRODUCT_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{t(CATEGORY_META[c].labelKey)}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="สถานะ"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'published' | 'draft')}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="published">เผยแพร่แล้ว</MenuItem>
            <MenuItem value="draft">ฉบับร่าง</MenuItem>
          </TextField>
          <ViewModeToggle value={view} onChange={setView} />
        </Stack>

        {view === 'grid' ? (
          <>
            {!loading && filtered.length === 0 && (
              <Stack spacing={1.5} sx={{ mt: 3, alignItems: 'flex-start' }}>
                <Typography variant="body2" color="text.secondary">
                  {rows.length === 0
                    ? community
                      ? 'ยังไม่มีกิจกรรมในฐานข้อมูล'
                      : 'ยังไม่มีผลงานในฐานข้อมูล'
                    : 'ไม่พบรายการที่ตรงกับการค้นหา'}
                </Typography>
                {rows.length === 0 && (
                  <Button component={RouterLink} to={`${base}/edit`} variant="outlined" startIcon={<AddIcon />}>
                    {community ? 'เพิ่มกิจกรรมแรก' : 'เพิ่มผลงานแรก'}
                  </Button>
                )}
              </Stack>
            )}
            <Box sx={ADMIN_GRID_SX}>
              {filtered.map((row) => (
                <AdminGridCard
                  key={row.id}
                  image={row.image_path ? imageUrl(row.image_path) : undefined}
                  title={row.title?.th || row.slug || '(ไม่มีชื่อ)'}
                  subtitle={row.slug || `id: ${row.id.slice(0, 8)}…`}
                  dimmed={!row.published}
                  chips={
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {!community && (
                        <Chip size="small" variant="outlined" label={t(CATEGORY_META[row.category].labelKey)} />
                      )}
                      {row.year && <Chip size="small" variant="outlined" label={row.year} />}
                      <Chip size="small" variant="outlined" label={`${photoCount(row)} รูป`} />
                    </Stack>
                  }
                  footer={
                    <>
                      {!community && <StarButton row={row} />}
                      <Tooltip title={row.published ? 'เผยแพร่อยู่' : 'ฉบับร่าง'}>
                        <Switch size="small" checked={row.published} onChange={() => void toggle(row)} />
                      </Tooltip>
                      <Box sx={{ flexGrow: 1 }} />
                      <RowActions row={row} />
                    </>
                  }
                />
              ))}
            </Box>
          </>
        ) : (
        <Paper elevation={0} sx={{ mt: 2, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
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
              {!loading && filtered.length === 0 && rows.length === 0 && (
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
              {!loading && filtered.length === 0 && rows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={community ? 6 : 8}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      ไม่พบรายการที่ตรงกับการค้นหา
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {row.image_path ? (
                      <Box
                        component="img"
                        src={imageUrl(row.image_path)}
                        alt=""
                        loading="lazy"
                        decoding="async"
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
                      <StarButton row={row} />
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Switch size="small" checked={row.published} onChange={() => void toggle(row)} />
                  </TableCell>
                  <TableCell align="right">
                    <RowActions row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        )}

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
