import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import {
  EMPTY_CERTIFICATE,
  deleteCertificate,
  draftFromCertificate,
  listCertificates,
  removeDocument,
  reorderCertificates,
  saveCertificate,
  setCertificatePublished,
  uploadDocument,
  type CertificateDraft,
} from '../admin/companyApi'
import { formatIsoDate, todayBangkok, type CertificateRow } from '../content/company'
import { documentUrl } from '../supabase/storage'

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 980, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Small preview: the scan itself, or a PDF badge. */
function DocPreview({ path, type, size }: { path: string; type: 'image' | 'pdf' | ''; size: number }) {
  const box = { width: size, height: Math.round(size * 4 / 3), flexShrink: 0, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'action.hover', overflow: 'hidden', display: 'grid', placeItems: 'center' }
  if (type === 'image' && path) {
    return <Box component="img" src={documentUrl(path)} alt="" sx={{ ...box, objectFit: 'contain' }} />
  }
  return (
    <Box sx={{ ...box, color: 'error.main' }}>
      {type === 'pdf' ? <PictureAsPdfIcon /> : <UploadFileIcon color="disabled" />}
    </Box>
  )
}

/**
 * `/admin/certificates` — licences, registrations and certificates shown in the
 * "ใบอนุญาตและเอกสารรับรอง" section of /about. Upload a scan (image) or PDF,
 * give it a name, and it appears on the site in the order set here. Documents
 * past their expiry date are hidden from the public page automatically.
 */
export function AdminCertificatesPage() {
  const [rows, setRows] = useState<CertificateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<CertificateDraft | null>(null)
  const [busy, setBusy] = useState<'upload' | 'save' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CertificateRow | null>(null)
  // A file uploaded in this dialog session but not saved yet: removed again on
  // cancel, or it would sit in the bucket with nothing pointing at it.
  const pendingUpload = useRef<string | null>(null)
  const today = todayBangkok()

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listCertificates())
      setError(null)
    } catch (e) {
      setError(message(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const set = (key: keyof CertificateDraft) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f))

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !form) return
    setBusy('upload')
    setError(null)
    try {
      const { path, type } = await uploadDocument(file)
      // Replacing a file picked earlier in this same dialog: drop that one.
      if (pendingUpload.current) void removeDocument(pendingUpload.current).catch(() => {})
      pendingUpload.current = path
      setForm((f) => (f ? { ...f, filePath: path, fileType: type } : f))
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(null)
    }
  }

  const closeDialog = () => {
    if (pendingUpload.current) void removeDocument(pendingUpload.current).catch(() => {})
    pendingUpload.current = null
    setForm(null)
  }

  const save = async () => {
    if (!form) return
    setBusy('save')
    setError(null)
    try {
      const previous = form.id ? rows.find((r) => r.id === form.id) : undefined
      await saveCertificate(form, rows.length)
      // The row now points at the new file; the one it replaced is garbage.
      if (previous && previous.file_path !== form.filePath) void removeDocument(previous.file_path).catch(() => {})
      pendingUpload.current = null
      setForm(null)
      setNotice('บันทึกแล้ว')
      await load()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(null)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...rows]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next)
    try {
      await reorderCertificates(next.map((r) => r.id))
    } catch (e) {
      setError(message(e))
      await load()
    }
  }

  const togglePublished = async (row: CertificateRow) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: !r.published } : r)))
    try {
      await setCertificatePublished(row.id, !row.published)
    } catch (e) {
      setError(message(e))
      await load()
    }
  }

  const remove = async () => {
    const row = confirmDelete
    setConfirmDelete(null)
    if (!row) return
    try {
      await deleteCertificate(row)
      setNotice('ลบแล้ว')
      await load()
    } catch (e) {
      setError(message(e))
    }
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>เอกสารรับรอง</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              ใบอนุญาต ใบรับรอง หนังสือรับรองบริษัท — แสดงบน{' '}
              <Link component={RouterLink} to="/about" target="_blank">หน้าเกี่ยวกับเรา</Link> ตามลำดับในรายการนี้
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ ...EMPTY_CERTIFICATE })}>
            เพิ่มเอกสาร
          </Button>
        </Stack>

        <Alert severity="warning" sx={{ mt: 3 }}>
          ไฟล์ที่อัปโหลดเปิดดูได้ทุกคนที่มีลิงก์ แม้จะปิดการแสดงผลไว้ — ก่อนอัป ให้ปิดหรือตัดส่วนที่เป็นเลขบัตรประชาชน
          ลายเซ็น หรือข้อมูลส่วนตัวออกก่อน
        </Alert>
        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {loading ? (
          <CircularProgress size={22} sx={{ mt: 4 }} />
        ) : rows.length === 0 ? (
          <Paper elevation={0} sx={{ mt: 3, p: 4, borderRadius: 3, border: 1, borderColor: 'divider', borderStyle: 'dashed', textAlign: 'center' }}>
            <Typography color="text.secondary">ยังไม่มีเอกสาร — กด “เพิ่มเอกสาร” แล้วอัปโหลดรูปสแกนหรือไฟล์ PDF</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {rows.map((row, index) => {
              const expired = Boolean(row.expires_on && row.expires_on < today)
              return (
                <Paper key={row.id} elevation={0} sx={{ p: 1.5, borderRadius: 3, border: 1, borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center' }}>
                  <DocPreview path={row.file_path} type={row.file_type} size={54} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>{row.title.th || row.title.en}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                      {[
                        row.issuer?.th,
                        row.doc_no && `เลขที่ ${row.doc_no}`,
                        row.expires_on && `หมดอายุ ${formatIsoDate(row.expires_on, 'th')}`,
                      ].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                      {expired && <Chip size="small" color="warning" label="หมดอายุแล้ว — ไม่แสดงบนเว็บ" />}
                      {!row.published && <Chip size="small" label="ซ่อนอยู่" />}
                    </Stack>
                  </Box>
                  <Stack direction="row" sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Tooltip title={row.published ? 'แสดงบนเว็บ' : 'ซ่อนจากเว็บ'}>
                      <Switch size="small" checked={row.published} onChange={() => void togglePublished(row)} />
                    </Tooltip>
                    <Tooltip title="ขึ้น"><span><IconButton size="small" disabled={index === 0} onClick={() => void move(index, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="ลง"><span><IconButton size="small" disabled={index === rows.length - 1} onClick={() => void move(index, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="เปิดไฟล์"><IconButton size="small" href={documentUrl(row.file_path) ?? ''} target="_blank" rel="noopener"><OpenInNewIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="แก้ไข"><IconButton size="small" onClick={() => setForm(draftFromCertificate(row))}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ลบ"><IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Wrap>

      <Dialog open={Boolean(form)} onClose={busy ? undefined : closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'แก้ไขเอกสาร' : 'เพิ่มเอกสาร'}</DialogTitle>
        {form && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <DocPreview path={form.filePath} type={form.fileType} size={72} />
                <Box>
                  <Button component="label" variant="outlined" startIcon={busy === 'upload' ? <CircularProgress size={16} /> : <UploadFileIcon />} disabled={busy !== null}>
                    {form.filePath ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => void pickFile(e)} />
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    รูปสแกน (JPG/PNG/WebP) หรือ PDF ไม่เกิน 10 MB
                  </Typography>
                </Box>
              </Stack>
              <TextField label="ชื่อเอกสาร (ไทย)" value={form.titleTh} onChange={set('titleTh')} size="small" required placeholder="เช่น หนังสือรับรองการจดทะเบียนห้างหุ้นส่วน" />
              <TextField label="ชื่อเอกสาร (English)" value={form.titleEn} onChange={set('titleEn')} size="small" placeholder="เว้นได้ — เว็บแสดงภาษาไทยแทน" />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField label="ออกโดย (ไทย)" value={form.issuerTh} onChange={set('issuerTh')} size="small" placeholder="เช่น กรมพัฒนาธุรกิจการค้า" />
                <TextField label="ออกโดย (English)" value={form.issuerEn} onChange={set('issuerEn')} size="small" />
              </Box>
              <TextField label="เลขที่เอกสาร" value={form.docNo} onChange={set('docNo')} size="small" />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField label="วันที่ออก" type="date" value={form.issuedOn} onChange={set('issuedOn')} size="small" slotProps={{ inputLabel: { shrink: true } }} />
                <TextField
                  label="วันหมดอายุ"
                  type="date"
                  value={form.expiresOn}
                  onChange={set('expiresOn')}
                  size="small"
                  helperText="เว้นว่างถ้าไม่มีวันหมดอายุ"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <FormControlLabel
                control={<Switch checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />}
                label="แสดงบนเว็บ"
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy !== null}>ยกเลิก</Button>
          <Button variant="contained" onClick={() => void save()} disabled={busy !== null}>
            {busy === 'save' ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>ลบเอกสารนี้?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{confirmDelete?.title.th || confirmDelete?.title.en}” และไฟล์ของมันจะถูกลบถาวร
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={() => void remove()}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={2500} onClose={() => setNotice(null)} message={notice ?? ''} />
    </Box>
  )
}
