import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
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
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { imageUrl } from '../supabase/storage'
import { deleteImage } from '../admin/portfolioApi'
import {
  EMPTY_PRODUCT,
  EMPTY_SPEC,
  draftFromProduct,
  listAdminProducts,
  saveProduct,
  uploadProductImage,
  type ProductDraft,
} from '../admin/productApi'

/**
 * Add or edit a product. `/admin/products/edit` starts a new one;
 * `/admin/products/edit/:id` loads an existing row — addressed by uuid, so the
 * slug stays editable.
 *
 * Photos: pick files, or paste (⌘V). The cover is the photo the cards and the
 * service home page lead with.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function AdminProductEditPage() {
  const { id: editing } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState<ProductDraft>(EMPTY_PRODUCT)
  const [busy, setBusy] = useState<'load' | 'upload' | 'save' | null>(editing ? 'load' : null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  const set = (key: keyof ProductDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!editing) return
    void (async () => {
      try {
        const row = (await listAdminProducts()).find((r) => r.id === editing)
        if (!row) throw new Error(`ไม่พบสินค้า "${editing}"`)
        setForm(draftFromProduct(row))
      } catch (error) {
        setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
      } finally {
        setBusy(null)
      }
    })()
  }, [editing])

  const cover = form.images.includes(form.cover) ? form.cover : (form.images[0] ?? '')

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files?.length) return
    const folder = form.slug || editing || `draft-${Date.now().toString(36)}`
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
        const { path } = await uploadProductImage(folder, file.name, data)
        added.push(path)
      }
      setForm((f) => ({ ...f, images: [...f.images, ...added] }))
      setMessage({ kind: 'success', text: `อัปโหลด ${added.length} รูปแล้ว` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }

  // A paste with nothing focused goes to the document, so the listener is here
  // rather than on a div (see the same note in the portfolio editor).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const images = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return
      event.preventDefault()
      void addFiles(images)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const removeImage = async (path: string) => {
    setForm((f) => ({ ...f, images: f.images.filter((p) => p !== path) }))
    await deleteImage(path)
  }

  const setSpec = (index: number, patch: Partial<typeof EMPTY_SPEC>) =>
    setForm((f) => ({ ...f, specs: f.specs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)) }))
  const addSpec = () => setForm((f) => ({ ...f, specs: [...f.specs, { ...EMPTY_SPEC }] }))
  const removeSpec = (index: number) =>
    setForm((f) => {
      const specs = f.specs.filter((_, i) => i !== index)
      return { ...f, specs: specs.length ? specs : [{ ...EMPTY_SPEC }] }
    })

  const save = async () => {
    setBusy('save')
    setMessage(null)
    try {
      await saveProduct({ ...form, cover })
      navigate('/admin/products')
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
        <Button component={RouterLink} to="/admin/products" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1 }}>
          กลับไปรายการสินค้า
        </Button>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          {editing ? `แก้ไข: ${form.nameTh || form.slug || editing}` : 'เพิ่มสินค้าใหม่'}
        </Typography>

        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="slug (URL) — เว้นว่างได้"
                value={form.slug}
                onChange={set('slug')}
                fullWidth
                size="small"
                helperText="ไม่ใส่ก็ได้ — เว็บจะใช้รหัส id แทน"
              />
              <TextField label="หมวด" value={form.category} onChange={set('category')} select fullWidth size="small">
                {PRODUCT_CATEGORIES.map((c) => (
                  // Thai first — it is what the site shows — with the English key
                  // after it, because that is what the URLs and the API use.
                  <MenuItem key={c} value={c}>
                    {t(CATEGORY_META[c].labelKey)} ({c})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="ราคาเริ่มต้น (บาท)"
                value={form.priceFrom}
                onChange={set('priceFrom')}
                fullWidth
                size="small"
                helperText="เว้นว่าง = แสดงว่า 'สอบถามราคา'"
              />
            </Stack>

            <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Stack spacing={2}>
                <Typography variant="overline" color="text.secondary">ภาษาไทย</Typography>
                <TextField label="ชื่อสินค้า (ไทย)" value={form.nameTh} onChange={set('nameTh')} fullWidth size="small" required />
                <TextField
                  label="คำอธิบายสั้น (ไทย)"
                  value={form.shortDescTh}
                  onChange={set('shortDescTh')}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="หน่วยราคา (ไทย)"
                  value={form.priceUnitTh}
                  onChange={set('priceUnitTh')}
                  fullWidth
                  size="small"
                  placeholder="เช่น ต่อวัน"
                />
              </Stack>
              <Stack spacing={2} sx={{ borderLeft: { md: 1 }, borderColor: { md: 'divider' }, pl: { md: 3 } }}>
                <Typography variant="overline" color="text.secondary">English</Typography>
                <TextField label="ชื่อสินค้า (อังกฤษ)" value={form.nameEn} onChange={set('nameEn')} fullWidth size="small" />
                <TextField
                  label="คำอธิบายสั้น (อังกฤษ)"
                  value={form.shortDescEn}
                  onChange={set('shortDescEn')}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  helperText="เว้นว่างได้ — ระบบจะใช้ข้อความภาษาไทยแทน"
                />
                <TextField label="หน่วยราคา (อังกฤษ)" value={form.priceUnitEn} onChange={set('priceUnitEn')} fullWidth size="small" placeholder="per day" />
              </Stack>
            </Box>

            {/* Photos */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                รูปสินค้า ({form.images.length}) · กด "ตั้งเป็นปก" ใต้รูปที่ต้องการเพื่อเปลี่ยนรูปปก ·
                เพิ่มรูปด้วยกล่อง + หรือวางจากคลิปบอร์ด (⌘V)
                {busy === 'upload' ? ' · กำลังอัปโหลด…' : ''}
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {form.images.map((path) => (
                  <Box key={path}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={imageUrl(path)}
                        alt=""
                        onClick={() => setForm((f) => ({ ...f, cover: path }))}
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
                    {/* An explicit button, not just a click on the image: the
                        clickable-photo affordance was invisible. */}
                    <Button
                      size="small"
                      fullWidth
                      disabled={path === cover}
                      onClick={() => setForm((f) => ({ ...f, cover: path }))}
                    >
                      {path === cover ? 'เป็นรูปปกอยู่' : 'ตั้งเป็นปก'}
                    </Button>
                  </Box>
                ))}
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
                      void addFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <Stack sx={{ alignItems: 'center' }}>
                    <AddIcon sx={{ fontSize: 28 }} />
                    <Typography variant="caption">วางรูปได้</Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>

            {/* Spec table — what the product detail page lists. */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>รายละเอียด (ตารางสเปก)</Typography>
              <Stack spacing={1}>
                {form.specs.map((spec, index) => (
                  <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                      label="หัวข้อ (ไทย)"
                      value={spec.labelTh}
                      onChange={(e) => setSpec(index, { labelTh: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="ค่า (ไทย)"
                      value={spec.valueTh}
                      onChange={(e) => setSpec(index, { valueTh: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="หัวข้อ (อังกฤษ)"
                      value={spec.labelEn}
                      onChange={(e) => setSpec(index, { labelEn: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="ค่า (อังกฤษ)"
                      value={spec.valueEn}
                      onChange={(e) => setSpec(index, { valueEn: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <IconButton size="small" aria-label="ลบแถว" onClick={() => removeSpec(index)} sx={{ flexShrink: 0 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button onClick={addSpec} size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}>
                เพิ่มแถว
              </Button>
            </Box>
          </Stack>
        </Paper>

        {message && (
          <Alert severity={message.kind} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Switch checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
            <Typography variant="body2">เผยแพร่</Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Switch checked={form.bestSeller} onChange={(e) => setForm((f) => ({ ...f, bestSeller: e.target.checked }))} />
            <Typography variant="body2">ขายดีของหมวดนี้ (โชว์บนหน้า /home ของหมวด)</Typography>
          </Stack>
          <Button
            onClick={() => void save()}
            disabled={(!form.nameTh && !form.nameEn) || busy !== null}
            variant="contained"
            color="secondary"
            startIcon={busy === 'save' ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {editing ? 'อัปเดตสินค้า' : 'บันทึกลงฐานข้อมูล'}
          </Button>
          <Button component={RouterLink} to="/admin/products" disabled={busy !== null}>
            ยกเลิก
          </Button>
        </Stack>
      </Wrap>
    </Box>
  )
}
