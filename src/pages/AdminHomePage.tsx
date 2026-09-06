import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
 * The catalog modules (products / portfolio / community) talk to the dev-only
 * API in `vite-dev-api.mts`, so they are shown only under `pnpm run dev`; leads
 * read the browser's own localStorage and work anywhere. No access control yet.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

interface Module {
  to: string
  icon: ReactNode
  title: string
  desc: string
  /** Needs the dev-only API — hidden in a production build. */
  dev?: boolean
}

const MODULES: Module[] = [
  { to: '/admin/products', icon: <Inventory2Icon />, title: 'สินค้า', desc: 'จัดการสินค้าและบริการในแคตตาล็อก', dev: true },
  { to: '/admin/portfolio', icon: <PhotoLibraryIcon />, title: 'ผลงาน', desc: 'ผลงานที่ทำ นำเข้าจากโพสต์ Facebook ได้', dev: true },
  { to: '/admin/community', icon: <VolunteerActivismIcon />, title: 'ผลงานสาธารณประโยชน์และการบริจาค', desc: 'กิจกรรมเพื่อสังคมและการบริจาค', dev: true },
  { to: '/admin/leads', icon: <ContactMailIcon />, title: 'ลูกค้าที่ติดต่อ', desc: 'รายชื่อผู้ติดต่อและสถานะการดูแล' },
]

export function AdminHomePage() {
  const modules = MODULES.filter((m) => !m.dev || import.meta.env.DEV)

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Wrap sx={{ py: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
          หลังบ้าน
        </Typography>
        <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>เลือกส่วนที่ต้องการจัดการ</Typography>

        <Alert severity="warning" sx={{ mt: 2 }}>
          หน้านี้ยัง<strong>ไม่มีการตรวจสิทธิ์</strong> — โมดูลแคตตาล็อกทำงานได้เฉพาะตอนรัน <code>pnpm run dev</code> บนเครื่องคุณ
        </Alert>

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
