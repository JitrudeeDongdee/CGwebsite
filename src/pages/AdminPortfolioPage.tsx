import { useEffect, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import DownloadIcon from '@mui/icons-material/CloudDownload'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { PRODUCT_CATEGORIES } from '../catalog/categories'
import { imageUrl } from '../supabase/storage'
import type { ProductCategory } from '../catalog/types'

/**
 * Import a portfolio item from a Facebook post.
 *
 * The heavy lifting is server-side (`vite-dev-api.mts`): the browser can't fetch
 * facebook.com (no CORS) and must never hold the service-role key that writes
 * past RLS. That API only exists while `pnpm run dev` runs — this page says so
 * plainly rather than failing silently on a deployed build.
 *
 * NO ACCESS CONTROL YET, deliberately: this is a data-entry tool for the owner
 * on their own machine while the catalog is being filled. It must not ship
 * publicly until staff sign-in exists — see SHOW_ADMIN_LINK in SiteHeader.
 */

interface ProjectRow {
  slug: string
  title: { th: string; en: string }
  location: { th: string; en: string } | null
  description: { th: string; en: string } | null
  category: ProductCategory
  year: string | null
  area: string | null
  published: boolean
  image_path: string | null
  source_url: string | null
}

const EMPTY = {
  url: '',
  slug: '',
  category: 'house' as ProductCategory,
  titleTh: '',
  titleEn: '',
  locationTh: '',
  locationEn: '',
  year: '',
  area: '',
  descriptionTh: '',
  descriptionEn: '',
  imageUrl: '',
  /** Set when editing: keeps the photo already in Storage if no new one is fetched. */
  imagePath: '',
  published: false,
}

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/** Turns a post URL into a usable slug suggestion; the person can overwrite it. */
function suggestSlug(url: string): string {
  const id = /\/posts\/([A-Za-z0-9]+)/.exec(url)?.[1] ?? ''
  return id ? `post-${id.slice(-8).toLowerCase()}` : ''
}

export function AdminPortfolioPage() {
  const [form, setForm] = useState(EMPTY)
  /** slug of the row being edited, or null when the form is creating a new one. */
  const [editing, setEditing] = useState<string | null>(null)
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [busy, setBusy] = useState<'fetch' | 'save' | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [apiDown, setApiDown] = useState(false)

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const loadRows = async () => {
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error(await response.text())
      setRows(await response.json())
      setApiDown(false)
    } catch {
      setApiDown(true)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  /** Step 1 — read the post's link preview and prefill what Facebook gives us. */
  const unfurl = async () => {
    setBusy('fetch')
    setMessage(null)
    try {
      const response = await fetch('/api/unfurl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.url }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'unfurl failed')
      setForm((f) => ({
        ...f,
        slug: f.slug || suggestSlug(f.url),
        // og:title is only the profile name, so it is deliberately not used.
        descriptionTh: f.descriptionTh || (data.description ?? ''),
        imageUrl: data.imageUrl ?? '',
      }))
      setMessage({
        kind: data.imageUrl ? 'success' : 'info',
        text: data.imageUrl
          ? 'ดึงรูปและข้อความจากโพสต์แล้ว — ตรวจ/เติมชื่อผลงาน จังหวัด ปี แล้วกดบันทึก'
          : 'โพสต์นี้ไม่มีรูปให้ดึง — กรอกข้อมูลแล้วบันทึกได้ แต่จะยังไม่มีภาพ',
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  /** Step 2 — store the photo and upsert the row (draft unless published is on). */
  const save = async () => {
    setBusy('save')
    setMessage(null)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceUrl: form.url }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'save failed')
      setMessage({
        kind: 'success',
        text: `${editing ? 'อัปเดตแล้ว' : 'บันทึกแล้ว'}: ${data.slug}${data.published ? ' (เผยแพร่)' : ' (ฉบับร่าง — ยังไม่ขึ้นเว็บ)'}`,
      })
      setEditing(null)
      setForm(EMPTY)
      await loadRows()
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  /** Load an existing row back into the form. The slug is what upsert matches
   *  on, so it is locked while editing — renaming would create a second row. */
  const edit = (row: ProjectRow) => {
    setEditing(row.slug)
    setMessage(null)
    setForm({
      url: row.source_url ?? '',
      slug: row.slug,
      category: row.category,
      titleTh: row.title?.th ?? '',
      titleEn: row.title?.en ?? '',
      locationTh: row.location?.th ?? '',
      locationEn: row.location?.en ?? '',
      year: row.year ?? '',
      area: row.area ?? '',
      descriptionTh: row.description?.th ?? '',
      descriptionEn: row.description?.en ?? '',
      imageUrl: '',
      imagePath: row.image_path ?? '',
      published: row.published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY)
    setMessage(null)
  }

  const togglePublished = async (row: ProjectRow) => {
    await fetch(`/api/projects/${row.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !row.published }),
    })
    await loadRows()
  }

  const remove = async (row: ProjectRow) => {
    if (!confirm(`ลบ "${row.title.th || row.slug}" ออกจากฐานข้อมูล?`)) return
    await fetch(`/api/projects/${row.slug}`, { method: 'DELETE' })
    await loadRows()
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          {editing ? `แก้ไขผลงาน: ${editing}` : 'นำเข้าผลงานจากโพสต์ Facebook'}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          วางลิงก์โพสต์ → กด "ดึงข้อมูล" → ระบบดึงรูปกับข้อความมาให้ → เติมชื่อ/จังหวัด/ปี แล้วบันทึก
        </Typography>

        <Alert severity="warning" sx={{ mt: 2 }}>
          หน้านี้ยัง<strong>ไม่มีการตรวจสิทธิ์</strong> และทำงานได้เฉพาะตอนรัน <code>pnpm run dev</code> บนเครื่องคุณ
          (ตัวดึงข้อมูลอยู่ฝั่งเซิร์ฟเวอร์ของ dev server) — อย่าเพิ่ง deploy ขึ้น production
        </Alert>

        {apiDown && (
          <Alert severity="error" sx={{ mt: 2 }}>
            เรียก /api ไม่ได้ — ต้องรันผ่าน <code>pnpm run dev</code> และตั้ง SUPABASE_SERVICE_ROLE_KEY ใน .env.local
          </Alert>
        )}

        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="ลิงก์โพสต์ Facebook"
                value={form.url}
                onChange={set('url')}
                fullWidth
                size="small"
                placeholder="https://www.facebook.com/.../posts/..."
              />
              <Button
                onClick={unfurl}
                disabled={!form.url || busy !== null}
                variant="contained"
                startIcon={busy === 'fetch' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                sx={{ flexShrink: 0 }}
              >
                ดึงข้อมูล
              </Button>
            </Stack>

            {message && <Alert severity={message.kind}>{message.text}</Alert>}

            {!form.imageUrl && form.imagePath && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src={imageUrl(form.imagePath)}
                  alt=""
                  sx={{ width: 220, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, border: 1, borderColor: 'divider' }}
                />
                <Typography variant="body2" color="text.secondary">
                  รูปที่ใช้อยู่ — กด "ดึงข้อมูล" อีกครั้งถ้าต้องการแทนที่ด้วยรูปจากโพสต์
                </Typography>
              </Stack>
            )}

            {form.imageUrl && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src={form.imageUrl}
                  alt=""
                  sx={{ width: 220, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, border: 1, borderColor: 'divider' }}
                />
                <Typography variant="body2" color="text.secondary">
                  รูปจากโพสต์ (รูปแรกเท่านั้น) — จะถูกย่อและอัปโหลดเข้า Storage ตอนกดบันทึก
                </Typography>
              </Stack>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="slug (URL) — เว้นว่างได้"
                value={form.slug}
                onChange={set('slug')}
                fullWidth
                size="small"
                disabled={editing !== null}
                helperText={
                  editing
                    ? 'เปลี่ยน slug ไม่ได้ตอนแก้ไข (จะกลายเป็นผลงานใหม่)'
                    : 'ไม่ใส่ก็ได้ — ระบบจะสร้างจากรหัสโพสต์ให้เอง'
                }
              />
              <TextField label="หมวด" value={form.category} onChange={set('category')} select fullWidth size="small">
                {PRODUCT_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
              <TextField label="ปี (พ.ศ.)" value={form.year} onChange={set('year')} fullWidth size="small" />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="ชื่อผลงาน (ไทย)" value={form.titleTh} onChange={set('titleTh')} fullWidth size="small" required />
              <TextField label="ชื่อผลงาน (อังกฤษ)" value={form.titleEn} onChange={set('titleEn')} fullWidth size="small" />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="จังหวัด (ไทย)" value={form.locationTh} onChange={set('locationTh')} fullWidth size="small" />
              <TextField label="จังหวัด (อังกฤษ)" value={form.locationEn} onChange={set('locationEn')} fullWidth size="small" />
              <TextField label="พื้นที่ใช้สอย" value={form.area} onChange={set('area')} fullWidth size="small" placeholder="120 ตร.ม." />
            </Stack>

            <TextField
              label="รายละเอียด (ไทย) — ดึงจากโพสต์ให้ แต่ Facebook ตัดข้อความยาว จึงควรวางฉบับเต็มเอง"
              value={form.descriptionTh}
              onChange={set('descriptionTh')}
              multiline
              minRows={3}
              fullWidth
              size="small"
            />
            <TextField
              label="รายละเอียด (อังกฤษ)"
              value={form.descriptionEn}
              onChange={set('descriptionEn')}
              multiline
              minRows={2}
              fullWidth
              size="small"
            />

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Switch
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                />
                <Typography variant="body2">เผยแพร่ทันที (ไม่ติ๊ก = เก็บเป็นฉบับร่าง)</Typography>
              </Stack>
              <Button
                onClick={save}
                disabled={(!form.titleTh && !form.titleEn) || busy !== null}
                variant="contained"
                color="secondary"
                startIcon={busy === 'save' ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {editing ? 'อัปเดตผลงาน' : 'บันทึกลงฐานข้อมูล'}
              </Button>
              {editing && (
                <Button onClick={cancelEdit} disabled={busy !== null}>
                  ยกเลิก
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Typography variant="h2" sx={{ fontSize: 20, fontWeight: 600, mt: 5, mb: 1.5 }}>
          ผลงานในฐานข้อมูล ({rows.length})
        </Typography>
        <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ชื่อ</TableCell>
                <TableCell>หมวด</TableCell>
                <TableCell>ปี</TableCell>
                <TableCell>รูป</TableCell>
                <TableCell>โพสต์</TableCell>
                <TableCell align="center">เผยแพร่</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      ยังไม่มีข้อมูล — วางลิงก์โพสต์ด้านบนเพื่อเริ่ม
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.slug} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.title?.th || row.slug}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.slug}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={row.category} /></TableCell>
                  <TableCell>{row.year || '—'}</TableCell>
                  <TableCell>{row.image_path ? '✓' : '—'}</TableCell>
                  <TableCell>
                    {row.source_url ? (
                      <IconButton size="small" href={row.source_url} target="_blank" rel="noopener noreferrer">
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Switch size="small" checked={row.published} onChange={() => void togglePublished(row)} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" onClick={() => edit(row)}>
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
      </Wrap>
    </Box>
  )
}
