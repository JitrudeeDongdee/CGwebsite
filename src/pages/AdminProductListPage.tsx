import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import {
  deleteProduct,
  listAdminProducts,
  setProductBestSeller,
  setProductPublished,
  type ProductRow,
} from '../admin/productApi'
import { imageUrl } from '../supabase/storage'
import { CATEGORY_META } from '../catalog/categories'
import { formatCurrency } from '../pricing/estimate'

/**
 * Every product, at a glance: publish, mark the category's best seller (the card
 * the service home page leads with), edit, delete.
 *
 * NO ACCESS CONTROL YET, and the API behind it only runs under `pnpm run dev`.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function AdminProductListPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<ProductRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingStar, setPendingStar] = useState<{ next: ProductRow; current: ProductRow } | null>(null)

  const load = async () => {
    try {
      setRows(await listAdminProducts())
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

  const nameOf = (row: ProductRow) => row.name?.th || row.slug || row.id.slice(0, 8)

  const star = async (row: ProductRow) => {
    if (row.best_seller) {
      await setProductBestSeller(row.id, false)
      await load()
      return
    }
    const current = rows.find((other) => other.category === row.category && other.best_seller)
    if (current) {
      setPendingStar({ next: row, current })
      return
    }
    await setProductBestSeller(row.id, true)
    await load()
  }

  const confirmStar = async () => {
    if (!pendingStar) return
    await setProductBestSeller(pendingStar.next.id, true)
    setPendingStar(null)
    await load()
  }

  const remove = async (row: ProductRow) => {
    if (!confirm(`ลบสินค้า "${nameOf(row)}" และรูปของสินค้านี้?`)) return
    await deleteProduct(row.id)
    await load()
  }

  const price = (row: ProductRow) =>
    row.price_from == null ? 'สอบถามราคา' : formatCurrency(Number(row.price_from), 'THB', 'th-TH')

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
              สินค้าทั้งหมด
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {loading ? 'กำลังโหลด…' : `${rows.length} รายการ · เผยแพร่แล้ว ${rows.filter((r) => r.published).length}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/admin/portfolio" variant="text">
              ไปหน้าผลงาน
            </Button>
            <Button component={RouterLink} to="/admin/products/edit" variant="contained" startIcon={<AddIcon />}>
              เพิ่มสินค้า
            </Button>
          </Stack>
        </Stack>

        <Alert severity="warning" sx={{ mt: 2 }}>
          หน้านี้ยัง<strong>ไม่มีการตรวจสิทธิ์</strong> และทำงานได้เฉพาะตอนรัน <code>pnpm run dev</code> บนเครื่องคุณ
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            เรียก /api ไม่ได้: {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ mt: 3, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 96 }}>รูป</TableCell>
                <TableCell>ชื่อสินค้า</TableCell>
                <TableCell>หมวด</TableCell>
                <TableCell>ราคาเริ่มต้น</TableCell>
                <TableCell align="center">ขายดีในหมวด</TableCell>
                <TableCell align="center">เผยแพร่</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      ยังไม่มีสินค้าในฐานข้อมูล
                    </Typography>
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
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{nameOf(row)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.slug || `ไม่มี slug — id: ${row.id.slice(0, 8)}…`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={`${t(CATEGORY_META[row.category].labelKey)} (${row.category})`} />
                  </TableCell>
                  <TableCell>{price(row)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={row.best_seller ? 'เป็นสินค้าขายดีของหมวดนี้ (กดเพื่อเอาออก)' : 'ตั้งเป็นสินค้าขายดีของหมวดนี้'}>
                      <IconButton size="small" onClick={() => void star(row)}>
                        {row.best_seller ? <StarIcon fontSize="small" color="secondary" /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      size="small"
                      checked={row.published}
                      onChange={async () => {
                        await setProductPublished(row.id, !row.published)
                        await load()
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="ดูหน้าจริง">
                      <IconButton size="small" component={RouterLink} to={`/products/${row.slug ?? row.id}`} target="_blank">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="แก้ไข">
                      <IconButton size="small" component={RouterLink} to={`/admin/products/edit/${row.id}`}>
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
          <DialogTitle>เปลี่ยนสินค้าขายดีของหมวดนี้?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              หมวด "{pendingStar?.next.category}" มีสินค้าขายดีอยู่แล้วคือ "{pendingStar && nameOf(pendingStar.current)}"
              <br />
              ยืนยันเปลี่ยนเป็น "{pendingStar && nameOf(pendingStar.next)}" แทนไหม? (แต่ละหมวดมีได้อันเดียว
              และตัวนี้จะไปโชว์บนหน้า /home ของหมวดนั้น)
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
