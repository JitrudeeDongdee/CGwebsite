import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import { draftFromCompany, loadCompany, saveCompany, type CompanyDraft } from '../admin/companyApi'

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 980, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

const DBD_URL = 'https://datawarehouse.dbd.go.th/'

/**
 * `/admin/company` — the registration facts in the "ข้อมูลนิติบุคคล" block on
 * /about. One row (`company_info`); every value must match the DBD หนังสือรับรอง,
 * which is the whole point of showing it, so the page says where to check.
 */
export function AdminCompanyPage() {
  const [form, setForm] = useState<CompanyDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadCompany()
      .then((row) => {
        if (cancelled) return
        if (!row) setError('ยังไม่มีแถวข้อมูลบริษัทในฐานข้อมูล — migration อาจยังไม่ได้รัน')
        else setForm(draftFromCompany(row))
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  const set = (key: keyof CompanyDraft) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f))

  const save = async () => {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      setForm(draftFromCompany(await saveCompany(form)))
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const bilingual = (label: string, th: keyof CompanyDraft, en: keyof CompanyDraft, multiline = false) =>
    form && (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <TextField label={`${label} (ไทย)`} value={form[th]} onChange={set(th)} fullWidth size="small" multiline={multiline} minRows={multiline ? 2 : undefined} />
        <TextField label={`${label} (English)`} value={form[en]} onChange={set(en)} fullWidth size="small" multiline={multiline} minRows={multiline ? 2 : undefined} />
      </Box>
    )

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>ข้อมูลบริษัท</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          แสดงในกล่อง “ข้อมูลนิติบุคคล” บน <Link component={RouterLink} to="/about" target="_blank">หน้าเกี่ยวกับเรา</Link>{' '}
          — ต้องตรงกับหนังสือรับรองบริษัท ตรวจได้ที่{' '}
          <Link href={DBD_URL} target="_blank" rel="noopener">DBD DataWarehouse</Link>
        </Typography>

        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
        {!form && !error && <CircularProgress size={22} sx={{ mt: 4 }} />}

        {form && (
          <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Stack spacing={2.5}>
              {bilingual('ชื่อนิติบุคคล', 'legalNameTh', 'legalNameEn')}
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                <TextField
                  label="เลขทะเบียนนิติบุคคล"
                  value={form.registrationNo}
                  onChange={set('registrationNo')}
                  size="small"
                  helperText="ตัวเลข 13 หลัก"
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <TextField
                  label="วันที่จดทะเบียน"
                  type="date"
                  value={form.registeredOn}
                  onChange={set('registeredOn')}
                  size="small"
                  helperText="ปฏิทินเป็น ค.ศ. — เว็บแสดงเป็น พ.ศ. ให้เอง"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="ทุนจดทะเบียน (บาท)"
                  value={form.capital}
                  onChange={set('capital')}
                  size="small"
                  helperText="ตัวเลขอย่างเดียว เช่น 1500000"
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
              </Box>
              {bilingual('สถานะ', 'statusTh', 'statusEn')}
              {bilingual('ประเภทธุรกิจ', 'businessTypeTh', 'businessTypeEn')}
              {bilingual('ขอบเขตธุรกิจ', 'activitiesTh', 'activitiesEn', true)}
              <Typography variant="caption" color="text.secondary">
                ช่องที่เว้นว่างจะไม่แสดงบนเว็บ · ภาษาอังกฤษเว้นได้ เว็บจะแสดงภาษาไทยแทน · ที่อยู่ใช้จากหน้าติดต่อ (contact.json)
              </Typography>
              <Box>
                <Button variant="contained" onClick={() => void save()} disabled={saving}>
                  {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}
      </Wrap>
      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="บันทึกแล้ว — หน้าเว็บจริงจะเห็นทันที ส่วนหน้าที่ Google อ่าน (prerender) อัปเดตตอน deploy ครั้งถัดไป"
      />
    </Box>
  )
}
