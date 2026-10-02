import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import { unfurlAvailable } from '../admin/client'
import { useAuth } from '../auth/AuthProvider'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibraryOutlined'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import ContactMailIcon from '@mui/icons-material/ContactMailOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

/**
 * Admin home — the modules the back-office is made of.
 *
 * Every module works on the deployed site now: they read and write Supabase as
 * the signed-in staff user. Only the Facebook import still needs a machine
 * running `pnpm run dev`, because a browser cannot fetch facebook.com.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

interface Module {
  to: string
  icon: ReactNode
  title: string
  desc: string
  /** Role management is the one screen staff have no business opening. */
  adminOnly?: boolean
}

const MODULES: Module[] = [
  { to: '/admin/messages', icon: <ContactMailIcon />, title: 'ข้อความจากลูกค้า', desc: 'ฟอร์มติดต่อและคำขอใบเสนอราคา' },
  { to: '/admin/products', icon: <Inventory2Icon />, title: 'สินค้า', desc: 'จัดการสินค้าและบริการในแคตตาล็อก' },
  { to: '/admin/portfolio', icon: <PhotoLibraryIcon />, title: 'ผลงาน', desc: 'ผลงานที่ทำ นำเข้าจากโพสต์ Facebook ได้' },
  { to: '/admin/community', icon: <VolunteerActivismIcon />, title: 'ผลงานสาธารณประโยชน์และการบริจาค', desc: 'กิจกรรมเพื่อสังคมและการบริจาค' },
  { to: '/admin/users', icon: <GroupIcon />, title: 'ผู้ใช้และสิทธิ์', desc: 'ให้สิทธิ์พนักงานเข้าหลังบ้าน', adminOnly: true },
]

export function AdminHomePage() {
  const { role } = useAuth()
  const modules = MODULES.filter((m) => !m.adminOnly || role === 'admin')

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          หลังบ้าน
        </Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>เลือกส่วนที่ต้องการจัดการ</Typography>

        {!unfurlAvailable && (
          <Alert severity="info" sx={{ mt: 2 }}>
            แก้ไขเนื้อหาได้ครบทุกอย่างจากที่นี่ — <strong>ยกเว้นปุ่ม "ดึงข้อมูลจากโพสต์ Facebook"</strong>{' '}
            ซึ่งใช้ได้เฉพาะบนเครื่องผู้ดูแลที่รัน <code>pnpm run dev</code> (เบราว์เซอร์อ่านหน้า Facebook เองไม่ได้)
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mt: 3 }}>
          {modules.map((m) => (
            <Paper
              key={m.to}
              component={RouterLink}
              to={m.to}
              elevation={0}
              sx={{
                p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider',
                display: 'block', textDecoration: 'none', color: 'inherit',
                transition: 'border-color .15s, transform .15s',
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    bgcolor: 'primary.main', color: 'primary.contrastText',
                  }}
                >
                  {m.icon}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{m.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{m.desc}</Typography>
                </Box>
                <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
              </Stack>
            </Paper>
          ))}
        </Box>
      </Wrap>
    </Box>
  )
}
