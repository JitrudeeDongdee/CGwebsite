import type { ReactNode } from 'react'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibraryOutlined'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import ContactMailIcon from '@mui/icons-material/ContactMailOutlined'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import type { StaffRole } from '../auth/AuthProvider'

/**
 * The back office, as one list.
 *
 * The sidebar and the admin home page both read this, so a new screen appears
 * in both places or neither — they were separate lists for one commit and had
 * already started to disagree.
 */
export interface AdminModule {
  to: string
  icon: ReactNode
  title: string
  desc: string
  /** Role management is the one screen staff have no business opening. */
  adminOnly?: boolean
  /** Shown in the sidebar but not as a card on the home page it links from. */
  sidebarOnly?: boolean
}

export const ADMIN_MODULES: AdminModule[] = [
  { to: '/admin', icon: <DashboardIcon />, title: 'หน้าหลัก', desc: 'ภาพรวมหลังบ้าน', sidebarOnly: true },
  { to: '/admin/messages', icon: <ContactMailIcon />, title: 'ข้อความจากลูกค้า', desc: 'ฟอร์มติดต่อและคำขอใบเสนอราคา' },
  { to: '/admin/products', icon: <Inventory2Icon />, title: 'สินค้า', desc: 'จัดการสินค้าและบริการในแคตตาล็อก' },
  { to: '/admin/portfolio', icon: <PhotoLibraryIcon />, title: 'ผลงาน', desc: 'ผลงานที่ทำ นำเข้าจากโพสต์ Facebook ได้' },
  {
    to: '/admin/community',
    icon: <VolunteerActivismIcon />,
    title: 'ผลงานสาธารณประโยชน์และการบริจาค',
    desc: 'กิจกรรมเพื่อสังคมและการบริจาค',
  },
  { to: '/admin/users', icon: <GroupIcon />, title: 'ผู้ใช้และสิทธิ์', desc: 'ให้สิทธิ์พนักงานเข้าหลังบ้าน', adminOnly: true },
]

/** The modules this role may open. */
export function modulesFor(role: StaffRole): AdminModule[] {
  return ADMIN_MODULES.filter((m) => !m.adminOnly || role === 'admin')
}

/**
 * Which module a path belongs to, for highlighting the sidebar.
 *
 * Longest match wins, so `/admin/products/edit/123` highlights สินค้า rather
 * than หน้าหลัก — every path starts with `/admin`, so a plain `startsWith`
 * would light up the dashboard on every screen.
 */
export function activeModule(pathname: string, role: StaffRole): AdminModule | undefined {
  return modulesFor(role)
    .filter((m) => pathname === m.to || pathname.startsWith(`${m.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
}
