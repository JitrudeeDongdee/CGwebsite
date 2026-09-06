import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import CircularProgress from '@mui/material/CircularProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DownloadIcon from '@mui/icons-material/CloudDownload'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowUpIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownIcon from '@mui/icons-material/ArrowDownward'
import AddIcon from '@mui/icons-material/Add'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { imageUrl } from '../supabase/storage'
import { listAdminProducts, type ProductRow } from '../admin/productApi'
import {
  EMPTY_DRAFT,
  EMPTY_SOURCE,
  buddhistYear,
  deleteImage,
  draftFromRow,
  listProjects,
  saveProject,
  filledSources,
  suggestTitle,
  suggestCommunityTitle,
  unfurlPost,
  uploadImage,
  type ProjectDraft,
} from '../admin/portfolioApi'

/**
 * Add a portfolio item, or edit one.
 *
 * `/admin/portfolio/edit` starts a new one; `/admin/portfolio/edit/:slug` loads
 * an existing row. Photos come from two places — files picked here, and the
 * photo Facebook publishes for each pasted post link — and land in the same
 * gallery, cover first.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/** Turns a post URL into a usable slug suggestion; the person can overwrite it. */
function suggestSlug(url: string): string {
  const id = /\/posts\/([A-Za-z0-9]+)/.exec(url)?.[1] ?? ''
  return id ? `post-${id.slice(-8).toLowerCase()}` : ''
}

export function AdminPortfolioEditPage() {
  const { id: editing } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  // The same form edits both content types; the route it is mounted at says which.
  const community = useLocation().pathname.startsWith('/admin/community')
  const base = community ? '/admin/community' : '/admin/portfolio'
  const [form, setForm] = useState<ProjectDraft>(() => ({
    ...EMPTY_DRAFT,
    kind: community ? 'community' : 'project',
  }))
  const [busy, setBusy] = useState<'load' | 'fetch' | 'upload' | 'save' | null>(editing ? 'load' : null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  const set = (key: keyof ProjectDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  /**
   * One fetch does both jobs: it loads the row being edited, and it counts what
   * each category already has so a new item can be named `<service>-<number>`.
   * `titleIsSuggested` tracks whether that name is still untouched, so changing
   * the category renumbers it — but typing a real name stops that for good.
   */
  const [rowCount, setRowCount] = useState<Awaited<ReturnType<typeof listProjects>>>([])
  /** Products this job can be linked to — "we did this" → "we sell this". */
  const [products, setProducts] = useState<ProductRow[]>([])
  const [titleIsSuggested, setTitleIsSuggested] = useState(!editing)
  /**
   * Which timeline cards are open. A long job has many updates, and a page of
   * expanded forms is impossible to reorder — so they collapse to one line each
   * and only what you are working on stays open.
   */
  const [openSources, setOpenSources] = useState<number[]>([0])
  /**
   * Which update a pasted image goes to.
   *
   * A `paste` on a plain <div> never fires: with nothing focused the event goes
   * to the document, so a handler on the card only ran when the caret happened
   * to be in one of its text fields. The listener is on the window instead, and
   * this remembers the card last clicked or typed in.
   */
  const [activeSource, setActiveSource] = useState<number | null>(0)
  const isOpen = (index: number) => openSources.includes(index)
  const toggleSource = (index: number) =>
    setOpenSources((open) => (open.includes(index) ? open.filter((i) => i !== index) : [...open, index]))

  useEffect(() => {
    void (async () => {
      try {
        listAdminProducts()
          .then(setProducts)
          .catch(() => setProducts([]))
        const rows = await listProjects()
        setRowCount(rows)
        if (editing) {
          const row = rows.find((r) => r.id === editing)
          if (!row) throw new Error(`ไม่พบผลงาน "${editing}"`)
          setForm(draftFromRow(row))
        } else {
          const name = community ? suggestCommunityTitle(rows) : suggestTitle(EMPTY_DRAFT.category, rows)
          setForm((f) => ({ ...f, titleTh: name, titleEn: name }))
        }
      } catch (error) {
        setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
      } finally {
        setBusy(null)
      }
    })()
  }, [editing, community])

  /**
   * Fetch one update's link.
   *
   * Re-fetching after changing the link ADDS its photo to that update (the
   * previous photos stay — the job's history is the point) and REPLACES the text
   * with what the new post says.
   */
  const fetchSource = async (index: number) => {
    const source = form.sources[index]
    if (!source?.url.trim()) return
    setBusy('fetch')
    setMessage(null)
    try {
      const preview = await unfurlPost(source.url.trim())
      setForm((f) => ({
        ...f,
        slug: f.slug || suggestSlug(source.url),
        descriptionTh: f.descriptionTh || (preview.description ?? ''),
        year: preview.publishedTime ? buddhistYear(new Date(preview.publishedTime)) : f.year,
        sources: f.sources.map((entry, i) =>
          i === index
            ? {
                ...entry,
                captionTh: preview.description ?? entry.captionTh,
                pendingImageUrl: preview.imageUrl,
              }
            : entry,
        ),
      }))
      setMessage({
        kind: preview.imageUrl ? 'success' : 'info',
        text: preview.imageUrl
          ? `ดึงอัปเดตที่ ${index + 1} แล้ว — รูปจะถูกเพิ่มเข้าอัปเดตนี้ตอนบันทึก`
          : `ลิงก์ของอัปเดตที่ ${index + 1} ไม่มีรูปให้ดึง`,
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  /** The same, for every filled-in link, in timeline order. */
  const unfurl = async () => {
    const links = filledSources(form.sources)
    if (links.length === 0) return
    setBusy('fetch')
    setMessage(null)
    try {
      const previews = new Map<string, Awaited<ReturnType<typeof unfurlPost>>>()
      for (const source of links) previews.set(source.url.trim(), await unfurlPost(source.url.trim()))

      const firstCaption = [...previews.values()].find((p) => p.description)?.description ?? ''
      const posted = [...previews.values()].map((p) => p.publishedTime).find(Boolean)
      const withPhotos = [...previews.values()].filter((p) => p.imageUrl).length

      setForm((f) => ({
        ...f,
        slug: f.slug || suggestSlug(links[0].url),
        descriptionTh: f.descriptionTh || firstCaption,
        year: posted ? buddhistYear(new Date(posted)) : f.year,
        sources: f.sources.map((entry) => {
          const preview = previews.get(entry.url.trim())
          if (!preview) return entry
          return {
            ...entry,
            captionTh: preview.description ?? entry.captionTh,
            pendingImageUrl: preview.imageUrl,
          }
        }),
      }))
      setMessage({
        kind: withPhotos ? 'success' : 'info',
        text: withPhotos
          ? `ดึงได้ ${withPhotos} รูปจาก ${links.length} ลิงก์ — รูปและข้อความไปอยู่ในแต่ละอัปเดตของมันเอง`
          : 'ลิงก์เหล่านี้ไม่มีรูปให้ดึง — กรอกข้อมูลแล้วบันทึกได้ แต่จะยังไม่มีภาพ',
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  /** The timeline of posts: add, edit, reorder, remove. */
  const setSource = (index: number, patch: Partial<(typeof EMPTY_SOURCE)>) =>
    setForm((f) => ({
      ...f,
      sources: f.sources.map((source, i) => (i === index ? { ...source, ...patch } : source)),
    }))

  const addSource = () =>
    setForm((f) => {
      setOpenSources((open) => [...open, f.sources.length])
      return { ...f, sources: [...f.sources, { ...EMPTY_SOURCE }] }
    })

  const removeSource = (index: number) =>
    setForm((f) => {
      const sources = f.sources.filter((_, i) => i !== index)
      return { ...f, sources: sources.length ? sources : [{ ...EMPTY_SOURCE }] }
    })

  /** Swap with the neighbour — the order here is the order on the site. */
  const moveSource = (index: number, delta: number) =>
    setForm((f) => {
      const target = index + delta
      if (target < 0 || target >= f.sources.length) return f
      const sources = [...f.sources]
      ;[sources[index], sources[target]] = [sources[target], sources[index]]
      return { ...f, sources }
    })

  /**
   * Upload picked files. `sourceIndex` puts them on that timeline entry;
   * without one they are loose project photos.
   */
  const addFiles = async (files: FileList | File[] | null, sourceIndex?: number) => {
    if (!files?.length) return
    // A stable folder for this row's photos — never the slug, which the person
    // may want to leave empty (the site then uses the row id in the URL).
    const folder = form.folder || editing || form.slug || `draft-${Date.now().toString(36)}`
    setBusy('upload')
    setMessage(null)
    try {
      const added: string[] = []
      for (const file of Array.from(files)) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        const { path } = await uploadImage(folder, file.name, data)
        added.push(path)
      }
      setForm((f) => ({
        ...f,
        folder,
        ...(sourceIndex === undefined
          ? { images: [...f.images, ...added] }
          : {
              sources: f.sources.map((source, i) =>
                i === sourceIndex ? { ...source, images: [...source.images, ...added] } : source,
              ),
            }),
      }))
      // The file is in Storage the moment it uploads, but the row only learns
      // about it on save — and nothing said so, so people uploaded, left, and
      // found the photo gone. Say the next step out loud.
      setMessage({
        kind: 'info',
        text: `อัปโหลด ${added.length} รูปแล้ว — กดปุ่ม "${editing ? 'อัปเดตผลงาน' : 'บันทึก'}" ด้านล่างเพื่อบันทึกรูปเข้าผลงานนี้`,
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  /** Removes a photo from wherever it is — an update, or the loose gallery. */
  /** Target for a pasted image: the card last touched, else the only open one. */
  const pasteTarget = activeSource ?? (openSources.length === 1 ? openSources[0] : null)

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const images = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (images.length === 0) return
      event.preventDefault()
      // No card in focus is not an error — the photo belongs to the job rather
      // than to one update. Refusing the paste here meant a job with no post at
      // all had nowhere to put a photo.
      void addFiles(images, pasteTarget ?? undefined)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const removeImage = async (path: string) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((p) => p !== path),
      sources: f.sources.map((source) => ({ ...source, images: source.images.filter((p) => p !== path) })),
    }))
    await deleteImage(path)
  }

  /**
   * Every photo of this project, in the order the site will show them: each
   * update's photos in timeline order, then the loose ones. The cover is picked
   * from this list — one image represents the whole job, wherever it came from.
   */
  const allPhotos = [...form.sources.flatMap((source) => source.images), ...form.images]
  const cover = allPhotos.includes(form.cover) ? form.cover : (allPhotos[0] ?? '')
  const makeCover = (path: string) => setForm((f) => ({ ...f, cover: path }))

  const save = async () => {
    setBusy('save')
    setMessage(null)
    try {
      const saved = await saveProject({ ...form, cover })
      navigate(base, {
        state: { saved: saved.slug },
      })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
      setBusy(null)
    }
  }

  if (busy === 'load') {
    return (
      <Wrap sx={{ py: 6 }}>
        <CircularProgress size={22} />
      </Wrap>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Button component={RouterLink} to={base} startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1 }}>
          {community ? 'กลับไปรายการกิจกรรม' : 'กลับไปรายการผลงาน'}
        </Button>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          {editing
            ? `แก้ไข: ${form.titleTh || form.slug || editing}`
            : community
              ? 'เพิ่มกิจกรรมสาธารณประโยชน์'
              : 'เพิ่มผลงานใหม่'}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          วางลิงก์โพสต์แล้วกด "ดึงข้อมูล" หรืออัปรูปและพิมพ์เนื้อหาเองก็ได้
        </Typography>

        {/* Shared first: what describes the job as a whole. The timeline of posts,
            each with its own photos and words, comes after. */}
        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>ข้อมูลของผลงาน (ใช้ร่วมกันทั้งงาน)</Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="slug (URL) — เว้นว่างได้"
                value={form.slug}
                onChange={set('slug')}
                fullWidth
                size="small"
                helperText="เว้นว่างได้ — เว็บจะใช้รหัส id แทน · แก้ทีหลังได้ ลิงก์เก่าจะเปลี่ยนตาม" 
              />
              {/* Community items have no product category — they are shown apart. */}
              {!community && (
                <TextField
                  label="หมวด"
                  value={form.category}
                  onChange={(e) => {
                    const category = e.target.value as ProjectDraft['category']
                    const name = titleIsSuggested ? suggestTitle(category, rowCount) : null
                    setForm((f) => ({
                      ...f,
                      category,
                      ...(name ? { titleTh: name, titleEn: name } : {}),
                    }))
                  }}
                  select
                  fullWidth
                  size="small"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    // Thai first — what the site shows — with the English key after
                    // it, because that is what the URLs and the API use.
                    <MenuItem key={c} value={c}>
                      {t(CATEGORY_META[c].labelKey)} ({c})
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="บริการ/สินค้าที่เกี่ยวข้อง"
                value={products.some((p) => p.id === form.productId) ? form.productId : ''}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                select
                fullWidth
                size="small"
                helperText="ผูกงานนี้กับสินค้า/บริการ — หน้าสินค้าจะโชว์ผลงานนี้ด้วย"
              >
                <MenuItem value="">— ไม่ผูก —</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name?.th || product.slug} ({product.category})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="ปี (พ.ศ.)"
                value={form.year}
                onChange={set('year')}
                fullWidth
                size="small"
                helperText="Facebook ไม่ได้ให้วันที่โพสต์มา — ตั้งเป็นปีปัจจุบันให้ก่อน"
              />
              <TextField label="พื้นที่ใช้สอย" value={form.area} onChange={set('area')} fullWidth size="small" placeholder="120 ตร.ม." />
            </Stack>

            {/* Thai on the left, English on the right, each column complete — the
                two languages are filled in as a pair, so they read as a pair. */}
            <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Stack spacing={2}>
                <Typography variant="overline" color="text.secondary">ภาษาไทย</Typography>
                <TextField
                  label="ชื่อผลงาน (ไทย)"
                  value={form.titleTh}
                  onChange={(e) => {
                    setTitleIsSuggested(false)
                    setForm((f) => ({ ...f, titleTh: e.target.value }))
                  }}
                  fullWidth
                  size="small"
                  required
                />
                <TextField label="จังหวัด (ไทย)" value={form.locationTh} onChange={set('locationTh')} fullWidth size="small" />
                <TextField
                  label="คำบรรยายรวมของงาน (ไทย)"
                  value={form.descriptionTh}
                  onChange={set('descriptionTh')}
                  multiline
                  minRows={5}
                  fullWidth
                  size="small"
                  helperText="อธิบายภาพรวมของงานนี้ — คนละส่วนกับข้อความของแต่ละอัปเดตในไทม์ไลน์ แก้ได้อิสระ"
                />
              </Stack>

              <Stack spacing={2} sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, pl: { md: 3 } }}>
                <Typography variant="overline" color="text.secondary">English</Typography>
                <TextField
                  label="ชื่อผลงาน (อังกฤษ)"
                  value={form.titleEn}
                  onChange={(e) => {
                    setTitleIsSuggested(false)
                    setForm((f) => ({ ...f, titleEn: e.target.value }))
                  }}
                  fullWidth
                  size="small"
                />
                <TextField label="จังหวัด (อังกฤษ)" value={form.locationEn} onChange={set('locationEn')} fullWidth size="small" />
                <TextField
                  label="คำบรรยายรวมของงาน (อังกฤษ)"
                  value={form.descriptionEn}
                  onChange={set('descriptionEn')}
                  multiline
                  minRows={5}
                  fullWidth
                  size="small"
                  helperText="เว้นว่างได้ — ระบบจะใช้ข้อความภาษาไทยแทน"
                />
              </Stack>
            </Box>


            {/* The cover is chosen from the timeline photos, so this only shows
                which one is current — a second grid of every photo up here read as
                a separate gallery and confused things. */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>รูปปกของงาน</Typography>
              {cover ? (
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Box
                    component="img"
                    src={imageUrl(cover)}
                    alt=""
                    sx={{ width: 160, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, border: 2, borderColor: 'secondary.main' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    เปลี่ยนได้โดยกด "ตั้งเป็นปก" ใต้รูปที่ต้องการ — จะเป็นรูปของงานหรือรูปในไทม์ไลน์ก็ได้
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  ยังไม่มีรูป — เพิ่มรูปด้านล่าง (รูปของงาน หรือรูปในไทม์ไลน์) แล้วเลือกรูปปกได้
                </Typography>
              )}
            </Box>

            {/* Photos that belong to the job rather than to one update. Always
                shown, with its own add tile: plenty of jobs have photos and no
                Facebook post at all, and routing every upload through a timeline
                entry forced people to invent an update just to keep a photo. */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                รูปของงาน (ไม่ผูกกับอัปเดต){form.images.length > 0 ? ` (${form.images.length})` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                กด + เพื่อเลือกไฟล์ หรือวางจากคลิปบอร์ด (⌘V) เมื่อไม่ได้เลือกการ์ดอัปเดตไว้ · ไม่ต้องมีลิงก์โพสต์ก็ลงรูปได้
                {busy === 'upload' ? ' · กำลังอัปโหลด…' : ''}
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                  {form.images.map((path) => (
                    <Box key={path}>
                      <Box sx={{ position: 'relative' }}>
                        <Box
                          component="img"
                          src={imageUrl(path)}
                          alt=""
                          onClick={() => makeCover(path)}
                          sx={{
                            width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, display: 'block',
                            cursor: 'pointer', border: 2, borderColor: path === cover ? 'secondary.main' : 'divider',
                          }}
                        />
                        {path === cover && (
                          <Chip label="ปก" size="small" color="secondary" sx={{ position: 'absolute', top: 4, left: 4 }} />
                        )}
                        <IconButton
                          size="small"
                          aria-label="ลบรูป"
                          onClick={() => void removeImage(path)}
                          sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Button size="small" fullWidth disabled={path === cover} onClick={() => makeCover(path)}>
                        {path === cover ? 'เป็นรูปปกอยู่' : 'ตั้งเป็นปก'}
                      </Button>
                    </Box>
                  ))}

                  <Box
                    component="label"
                    onClick={() => setActiveSource(null)}
                    sx={{
                      aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', cursor: 'pointer',
                      border: '2px dashed', borderColor: 'divider', borderRadius: 2, color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                  >
                    <input
                      hidden
                      multiple
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        void addFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                    <Stack sx={{ alignItems: 'center' }}>
                      <AddIcon sx={{ fontSize: 28 }} />
                      <Typography variant="caption">เพิ่มรูป</Typography>
                    </Stack>
                  </Box>
                </Box>
              </Box>

          </Stack>
        </Paper>

        {/* The timeline: one card per post, each with its own photos and words. */}
        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2">ไทม์ไลน์อัปเดตงาน (ลิงก์โพสต์ Facebook)</Typography>
            <Button
              onClick={() => void unfurl()}
              disabled={filledSources(form.sources).length === 0 || busy !== null}
              variant="contained"
              size="small"
              startIcon={busy === 'fetch' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            >
              ดึงข้อมูลจากทุกลิงก์
            </Button>
          </Stack>

              <Stack spacing={2}>
                {form.sources.map((source, index) => (
                  <Accordion
                    key={index}
                    expanded={isOpen(index)}
                    onChange={() => toggleSource(index)}
                    onClick={() => setActiveSource(index)}
                    onFocusCapture={() => setActiveSource(index)}
                    disableGutters
                    variant="outlined"
                    sx={{ borderRadius: 2, '&::before': { display: 'none' } }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        // `minWidth: 0` is what lets the caption actually shrink: without
                        // it the noWrap text keeps its full width and pushes the chip and
                        // the buttons out past the card's edge.
                        '& .MuiAccordionSummary-content': {
                          alignItems: 'center',
                          gap: 1,
                          my: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                        },
                      }}
                    >
                      <Chip label={`อัปเดตที่ ${index + 1}`} size="small" color="secondary" sx={{ flexShrink: 0 }} />
                      {/* A collapsed card still says what it is and what it holds. */}
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 500, flexGrow: 1, flexShrink: 1, minWidth: 0 }}
                      >
                        {source.label || source.captionTh || (source.url ? source.url.split('/').pop() : 'อัปเดตใหม่')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {source.images.length + (source.pendingImageUrl ? 1 : 0)} รูป
                        {source.url ? '' : ' · ไม่มีลิงก์'}
                      </Typography>
                      {/* Reordering must not open the card it acts on. */}
                      <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                        <IconButton size="small" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => moveSource(index, -1)}>
                          <ArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="เลื่อนลง"
                          disabled={index === form.sources.length - 1}
                          onClick={() => moveSource(index, 1)}
                        >
                          <ArrowDownIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="ลบลิงก์" onClick={() => removeSource(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <TextField
                          label="ลิงก์โพสต์"
                          value={source.url}
                          onChange={(e) => setSource(index, { url: e.target.value })}
                          fullWidth
                          size="small"
                          placeholder="https://www.facebook.com/.../posts/..."
                          helperText={
                            !source.url.trim() && (source.images.length > 0 || source.captionTh)
                              ? 'ไม่มีลิงก์แล้ว แต่รูปและข้อความของอัปเดตนี้ยังอยู่'
                              : ' '
                          }
                        />
                        <Button
                          onClick={() => void fetchSource(index)}
                          disabled={!source.url.trim() || busy !== null}
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          sx={{ flexShrink: 0, alignSelf: { md: 'center' } }}
                        >
                          ดึงข้อมูล
                        </Button>
                        <TextField
                          label="ป้ายกำกับ (ไม่บังคับ)"
                          value={source.label}
                          onChange={(e) => setSource(index, { label: e.target.value })}
                          size="small"
                          placeholder="เช่น เริ่มงาน / ติดตั้ง / ส่งมอบ"
                          sx={{ minWidth: { md: 240 } }}
                        />
                      </Stack>

                      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        <TextField
                          label="คำบรรยายของอัปเดตนี้ (ไทย)"
                          value={source.captionTh}
                          onChange={(e) => setSource(index, { captionTh: e.target.value })}
                          multiline
                          minRows={2}
                          fullWidth
                          size="small"
                        />
                        <TextField
                          label="คำบรรยายของอัปเดตนี้ (อังกฤษ)"
                          value={source.captionEn}
                          onChange={(e) => setSource(index, { captionEn: e.target.value })}
                          multiline
                          minRows={2}
                          fullWidth
                          size="small"
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        รูปของอัปเดตนี้ ({source.images.length + (source.pendingImageUrl ? 1 : 0)}) · กด + เพื่อเลือกไฟล์
                        {pasteTarget === index ? ' · วางรูปจากคลิปบอร์ด (⌘V) ลงอัปเดตนี้ได้เลย' : ' · คลิกการ์ดนี้ก่อนถ้าจะวางรูปที่นี่'}
                        {busy === 'upload' ? ' · กำลังอัปโหลด…' : ''}
                      </Typography>

                      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                        {source.pendingImageUrl && (
                          <Box
                            component="img"
                            src={source.pendingImageUrl}
                            alt=""
                            sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, border: 2, borderColor: 'secondary.main' }}
                          />
                        )}
                        {source.images.map((path) => (
                          <Box key={path}>
                            <Box sx={{ position: 'relative' }}>
                              <Box
                                component="img"
                                src={imageUrl(path)}
                                alt=""
                                onClick={() => makeCover(path)}
                                sx={{
                                  width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 2, display: 'block',
                                  cursor: 'pointer', border: 2, borderColor: path === cover ? 'secondary.main' : 'divider',
                                }}
                              />
                              {path === cover && (
                                <Chip label="ปก" size="small" color="secondary" sx={{ position: 'absolute', top: 4, left: 4 }} />
                              )}
                              <IconButton
                                size="small"
                                aria-label="ลบรูป"
                                onClick={() => void removeImage(path)}
                                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <Button size="small" fullWidth disabled={path === cover} onClick={() => makeCover(path)}>
                              {path === cover ? 'เป็นรูปปกอยู่' : 'ตั้งเป็นปก'}
                            </Button>
                          </Box>
                        ))}

                        {/* The upload target is a tile the size of a photo, so the
                            grid reads as "here are the photos, add one here". */}
                        <Box
                          component="label"
                          sx={{
                            aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', cursor: 'pointer',
                            border: '2px dashed', borderColor: 'divider', borderRadius: 2, color: 'text.secondary',
                            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                          }}
                        >
                          <input
                            hidden
                            multiple
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              void addFiles(e.target.files, index)
                              e.target.value = ''
                            }}
                          />
                          <Stack sx={{ alignItems: 'center' }}>
                            <AddIcon sx={{ fontSize: 28 }} />
                            <Typography variant="caption">วางรูปได้</Typography>
                          </Stack>
                        </Box>
                      </Box>
                    </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>

          <Button onClick={addSource} size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}>
            เพิ่มลิงก์
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            ดึงข้อมูลจะเรียงตามลำดับนี้ · แต่ละอัปเดตมีรูปและข้อความของตัวเอง · 1 ลิงก์ Facebook ให้รูปมาได้ 1 รูป ที่เหลืออัปเองได้
          </Typography>
        </Paper>

        {message && (
          <Alert severity={message.kind} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Switch checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
            <Typography variant="body2">เผยแพร่ (ไม่ติ๊ก = เก็บเป็นฉบับร่าง)</Typography>
          </Stack>
          <Button
            onClick={() => void save()}
            disabled={(!form.titleTh && !form.titleEn) || busy !== null}
            variant="contained"
            color="secondary"
            startIcon={busy === 'save' ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {editing ? 'อัปเดตผลงาน' : 'บันทึกลงฐานข้อมูล'}
          </Button>
          <Button component={RouterLink} to="/admin/portfolio" disabled={busy !== null}>
            ยกเลิก
          </Button>
        </Stack>

      </Wrap>
    </Box>
  )
}
