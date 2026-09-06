import type { Product, ProductCategory } from './types'

const perDay = { th: 'ต่อวัน', en: 'per day' }

/**
 * Seed product catalog. Placeholder content/prices — real data + photos
 * (public/products/<slug>.jpg) come from the company. Houses are the core line;
 * electronics / furniture / rental are the secondary lines.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'p-studio-6x4',
    slug: 'studio-6x4',
    category: 'house',
    name: { th: 'บ้านสตูดิโอ 6×4', en: 'Studio 6×4' },
    shortDesc: { th: 'บ้านหลังเล็กกะทัดรัด เหมาะเริ่มต้นหรือบ้านพักตากอากาศ', en: 'A compact starter or weekend home.' },
    priceFrom: 432000,
    specs: [
      { label: { th: 'พื้นที่ใช้สอย', en: 'Floor area' }, value: { th: '24 ตร.ม.', en: '24 m²' } },
      { label: { th: 'ห้องนอน', en: 'Bedrooms' }, value: { th: '1', en: '1' } },
      { label: { th: 'ระยะติดตั้ง', en: 'Install time' }, value: { th: '~30 วัน', en: '~30 days' } },
    ],
    featured: true,
  },
  {
    id: 'p-one-bed-6x6',
    slug: 'one-bed-6x6',
    category: 'house',
    name: { th: 'บ้าน 1 ห้องนอน 6×6', en: '1-bedroom 6×6' },
    shortDesc: { th: 'บ้านชั้นเดียว 1 ห้องนอน พร้อมนั่งเล่นและห้องน้ำ', en: 'Single-storey one-bedroom with living and bath.' },
    priceFrom: 648000,
    specs: [
      { label: { th: 'พื้นที่ใช้สอย', en: 'Floor area' }, value: { th: '36 ตร.ม.', en: '36 m²' } },
      { label: { th: 'ห้องนอน', en: 'Bedrooms' }, value: { th: '1', en: '1' } },
      { label: { th: 'ห้องน้ำ', en: 'Bathrooms' }, value: { th: '1', en: '1' } },
    ],
    featured: true,
  },
  {
    id: 'p-two-bed-8x6',
    slug: 'two-bed-8x6',
    category: 'house',
    name: { th: 'บ้าน 2 ห้องนอน 8×6', en: '2-bedroom 8×6' },
    shortDesc: { th: 'บ้านครอบครัวเริ่มต้น 2 ห้องนอน นั่งเล่นกว้าง', en: 'A starter family home with two bedrooms.' },
    priceFrom: 864000,
    specs: [
      { label: { th: 'พื้นที่ใช้สอย', en: 'Floor area' }, value: { th: '48 ตร.ม.', en: '48 m²' } },
      { label: { th: 'ห้องนอน', en: 'Bedrooms' }, value: { th: '2', en: '2' } },
      { label: { th: 'ห้องน้ำ', en: 'Bathrooms' }, value: { th: '1', en: '1' } },
    ],
    featured: true,
    bestSeller: true,
  },
  {
    id: 'p-three-bed-9x6',
    slug: 'three-bed-9x6',
    category: 'house',
    name: { th: 'บ้าน 3 ห้องนอน 9×6', en: '3-bedroom 9×6' },
    shortDesc: { th: 'บ้านครอบครัว 3 ห้องนอน พร้อมพื้นที่ส่วนกลาง', en: 'A three-bedroom family home.' },
    priceFrom: 972000,
    specs: [
      { label: { th: 'พื้นที่ใช้สอย', en: 'Floor area' }, value: { th: '54 ตร.ม.', en: '54 m²' } },
      { label: { th: 'ห้องนอน', en: 'Bedrooms' }, value: { th: '3', en: '3' } },
      { label: { th: 'ห้องน้ำ', en: 'Bathrooms' }, value: { th: '2', en: '2' } },
    ],
    featured: false,
  },
  {
    id: 'p-smart-home',
    slug: 'smart-home-system',
    category: 'electronics',
    name: { th: 'ระบบบ้านอัจฉริยะ', en: 'Smart home system' },
    shortDesc: { th: 'ควบคุมไฟ กล้อง และประตูผ่านมือถือ ติดตั้งพร้อมบ้าน', en: 'App control for lights, cameras and doors.' },
    priceFrom: null,
    specs: [
      { label: { th: 'ควบคุมผ่าน', en: 'Control via' }, value: { th: 'แอปมือถือ', en: 'Mobile app' } },
      { label: { th: 'ติดตั้ง', en: 'Install' }, value: { th: 'พร้อมงานบ้าน', en: 'With the build' } },
    ],
    featured: false,
    bestSeller: true,
  },
  {
    id: 'p-power-cabinet',
    slug: 'electrical-control-cabinet',
    category: 'electronics',
    name: { th: 'ตู้ควบคุมไฟฟ้า', en: 'Electrical control cabinet' },
    shortDesc: { th: 'ตู้ควบคุมและกระจายไฟสำหรับบ้านและงานติดตั้ง', en: 'Control and distribution cabinets.' },
    priceFrom: null,
    specs: [{ label: { th: 'มาตรฐาน', en: 'Standard' }, value: { th: 'ตามการออกแบบ', en: 'Per design' } }],
    featured: false,
  },
  {
    id: 'p-builtin-kitchen',
    slug: 'built-in-kitchen',
    category: 'furniture',
    name: { th: 'ชุดครัวบิลต์อิน', en: 'Built-in kitchen' },
    shortDesc: { th: 'เคาน์เตอร์ครัวบิลต์อิน วัสดุกันชื้น จัดตามพื้นที่จริง', en: 'Moisture-resistant built-in kitchen counters.' },
    priceFrom: null,
    specs: [{ label: { th: 'วัสดุ', en: 'Material' }, value: { th: 'กันชื้น', en: 'Moisture-resistant' } }],
    featured: true,
    bestSeller: true,
  },
  {
    id: 'p-wardrobe',
    slug: 'built-in-wardrobe',
    category: 'furniture',
    name: { th: 'ตู้เสื้อผ้าบิลต์อิน', en: 'Built-in wardrobe' },
    shortDesc: { th: 'ตู้เสื้อผ้าบิลต์อินตามขนาดห้อง เข้าชุดกับแบบบ้าน', en: 'Built-in wardrobes sized to the room.' },
    priceFrom: null,
    specs: [{ label: { th: 'ออกแบบ', en: 'Design' }, value: { th: 'ตามขนาดห้อง', en: 'To room size' } }],
    featured: false,
  },
  {
    id: 'p-backhoe',
    slug: 'backhoe-rental',
    category: 'rental',
    name: { th: 'รถแบคโฮให้เช่า', en: 'Backhoe rental' },
    shortDesc: { th: 'รถขุดแบคโฮให้เช่า พร้อมคนขับและทีมสนับสนุน', en: 'Backhoe excavator rental with operator.' },
    priceFrom: null,
    priceUnit: perDay,
    specs: [{ label: { th: 'พร้อม', en: 'Includes' }, value: { th: 'คนขับ', en: 'Operator' } }],
    featured: true,
    bestSeller: true,
  },
  {
    id: 'p-crane-truck',
    slug: 'crane-truck-rental',
    category: 'rental',
    name: { th: 'รถเครนให้เช่า', en: 'Crane truck rental' },
    shortDesc: { th: 'รถเครนสำหรับยกและติดตั้งงานก่อสร้าง', en: 'Crane truck for lifting and installation.' },
    priceFrom: null,
    priceUnit: perDay,
    specs: [{ label: { th: 'พร้อม', en: 'Includes' }, value: { th: 'คนขับ', en: 'Operator' } }],
    featured: false,
  },
  {
    id: 'p-fiber-cabling',
    slug: 'fiber-optic-cabling',
    category: 'contracting',
    name: { th: 'รับเหมาเดินสายไฟเบอร์ออปติก', en: 'Fiber-optic cabling' },
    shortDesc: {
      th: 'เดินสายไฟเบอร์ออปติกและงานระบบเครือข่าย พร้อมทีมช่างและอุปกรณ์',
      en: 'Fiber-optic cabling and network systems, with crew and equipment.',
    },
    priceFrom: null,
    specs: [{ label: { th: 'คิดราคา', en: 'Pricing' }, value: { th: 'ตามหน้างาน', en: 'Per site' } }],
    featured: true,
    bestSeller: true,
  },
  {
    id: 'p-electrical-work',
    slug: 'electrical-systems',
    category: 'contracting',
    name: { th: 'งานระบบไฟฟ้า', en: 'Electrical systems' },
    shortDesc: {
      th: 'ติดตั้งและซ่อมบำรุงระบบไฟฟ้าอาคาร พร้อมรับประกันงาน',
      en: 'Building electrical installation and maintenance, with a warranty.',
    },
    priceFrom: null,
    specs: [{ label: { th: 'คิดราคา', en: 'Pricing' }, value: { th: 'ตามหน้างาน', en: 'Per site' } }],
    featured: false,
  },
]

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function productsByCategory(category: ProductCategory | 'all'): Product[] {
  return category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category)
}

/** The product to lead with for a line: its best seller, else a featured one, else the first. */
export function heroProductFor(category: ProductCategory): Product | undefined {
  const list = productsByCategory(category)
  return list.find((p) => p.bestSeller) ?? list.find((p) => p.featured) ?? list[0]
}
