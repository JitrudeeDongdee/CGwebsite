import type { Project } from './types'

/**
 * Seed portfolio. Placeholder content — real projects + photos
 * (public/portfolio/<slug>.jpg) come from the company.
 */
export const PROJECTS: Project[] = [
  {
    id: 'j-ban-chaiyaphum-2f',
    slug: 'ban-chaiyaphum-2f',
    title: { th: 'บ้านพักอาศัย 2 ชั้น', en: 'Two-storey house' },
    location: { th: 'ชัยภูมิ', en: 'Chaiyaphum' },
    year: '2567',
    category: 'house',
    area: '120 ตร.ม.',
    description: {
      th: 'บ้านพักอาศัย 2 ชั้นแบบน็อคดาวน์ ออกแบบตามความต้องการของเจ้าของ ตั้งแต่แปลนจนถึงติดตั้งเสร็จ',
      en: 'A two-storey knock-down home, from custom plan to finished install.',
    },
    featured: true,
  },
  {
    id: 'j-knockdown-khonkaen',
    slug: 'knockdown-khonkaen-1br',
    title: { th: 'บ้านน็อคดาวน์ 1 ห้องนอน', en: 'One-bedroom knock-down house' },
    location: { th: 'ขอนแก่น', en: 'Khon Kaen' },
    year: '2566',
    category: 'house',
    area: '36 ตร.ม.',
    description: {
      th: 'บ้านน็อคดาวน์ชั้นเดียว 1 ห้องนอน ติดตั้งไวภายในหนึ่งเดือน',
      en: 'A single-storey one-bedroom knock-down house, installed within a month.',
    },
    featured: true,
  },
  {
    id: 'j-shop-udon',
    slug: 'shop-house-udon',
    title: { th: 'ร้านค้า + ที่พักอาศัย', en: 'Shop + residence' },
    location: { th: 'อุดรธานี', en: 'Udon Thani' },
    year: '2566',
    category: 'house',
    area: '48 ตร.ม.',
    description: {
      th: 'อาคารร้านค้าด้านหน้า พร้อมที่พักอาศัยด้านหลัง ในหลังเดียว',
      en: 'A shopfront with living quarters behind, in one unit.',
    },
    featured: true,
  },
  {
    id: 'j-kitchen-project',
    slug: 'builtin-kitchen-project',
    title: { th: 'งานครัวบิลต์อิน', en: 'Built-in kitchen project' },
    location: { th: 'ชัยภูมิ', en: 'Chaiyaphum' },
    year: '2566',
    category: 'furniture',
    description: {
      th: 'ติดตั้งชุดครัวบิลต์อินเข้าชุดกับบ้านที่ส่งมอบ',
      en: 'A built-in kitchen matched to a delivered home.',
    },
    featured: false,
  },
  {
    id: 'j-smarthome-project',
    slug: 'smart-home-install',
    title: { th: 'ติดตั้งระบบบ้านอัจฉริยะ', en: 'Smart-home install' },
    location: { th: 'ขอนแก่น', en: 'Khon Kaen' },
    year: '2567',
    category: 'electronics',
    description: {
      th: 'ติดตั้งระบบควบคุมไฟและกล้องผ่านมือถือให้ลูกค้า',
      en: 'App-controlled lighting and camera system for a client.',
    },
    featured: false,
  },
  {
    id: 'j-site-rental',
    slug: 'equipment-rental-site',
    title: { th: 'งานเช่าเครื่องจักรก่อสร้าง', en: 'Equipment-rental job' },
    location: { th: 'อุดรธานี', en: 'Udon Thani' },
    year: '2566',
    category: 'rental',
    description: {
      th: 'สนับสนุนรถแบคโฮและเครนให้หน้างานก่อสร้าง',
      en: 'Backhoe and crane support for a construction site.',
    },
    featured: false,
  },
  {
    id: 'j-fiber-site',
    slug: 'fiber-cabling-udon',
    title: { th: 'เดินสายไฟเบอร์ออปติก', en: 'Fiber-optic cabling' },
    location: { th: 'อุดรธานี', en: 'Udon Thani' },
    year: '2567',
    category: 'contracting',
    description: {
      th: 'รับเหมาเดินสายไฟเบอร์ออปติกและงานระบบให้อาคารพาณิชย์',
      en: 'Fiber-optic cabling and systems work for a commercial building.',
    },
    featured: false,
  },
]

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug)
}
