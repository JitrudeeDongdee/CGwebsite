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
  // Household appliances the shop carries alongside the systems work. Prices are
  // per-model and change often, so these are all "สอบถามราคา" rather than a
  // number that would go stale in the catalogue.
  {
    id: 'p-refrigerator',
    slug: 'refrigerator',
    category: 'electronics',
    name: { th: 'ตู้เย็น', en: 'Refrigerator' },
    shortDesc: { th: 'ตู้เย็น 1–2 ประตู หลายขนาด พร้อมส่งและติดตั้ง', en: 'One- and two-door fridges in several sizes, delivered and set up.' },
    priceFrom: null,
    specs: [
      { label: { th: 'แบบ', en: 'Type' }, value: { th: '1–2 ประตู', en: 'One or two door' } },
      { label: { th: 'บริการ', en: 'Service' }, value: { th: 'ส่งและติดตั้ง', en: 'Delivery and setup' } },
    ],
    featured: false,
  },
  {
    id: 'p-chest-freezer',
    slug: 'chest-freezer',
    category: 'electronics',
    name: { th: 'ตู้แช่', en: 'Chest freezer' },
    shortDesc: { th: 'ตู้แช่แข็งและตู้แช่เย็น สำหรับร้านค้าและใช้ในบ้าน', en: 'Chest freezers and coolers for shops and homes.' },
    priceFrom: null,
    specs: [
      { label: { th: 'ใช้งาน', en: 'For' }, value: { th: 'ร้านค้า / ในบ้าน', en: 'Shop or home' } },
      { label: { th: 'บริการ', en: 'Service' }, value: { th: 'ส่งและติดตั้ง', en: 'Delivery and setup' } },
    ],
    featured: false,
  },
  {
    id: 'p-washing-machine',
    slug: 'washing-machine',
    category: 'electronics',
    name: { th: 'เครื่องซักผ้า', en: 'Washing machine' },
    shortDesc: { th: 'เครื่องซักผ้าฝาหน้าและฝาบน พร้อมติดตั้งและต่อท่อน้ำ', en: 'Front- and top-load washers, installed and plumbed in.' },
    priceFrom: null,
    specs: [
      { label: { th: 'แบบ', en: 'Type' }, value: { th: 'ฝาหน้า / ฝาบน', en: 'Front or top load' } },
      { label: { th: 'บริการ', en: 'Service' }, value: { th: 'ติดตั้งและต่อท่อน้ำ', en: 'Install and plumbing' } },
    ],
    featured: false,
  },
  {
    id: 'p-microwave',
    slug: 'microwave-oven',
    category: 'electronics',
    name: { th: 'เตาไมโครเวฟ', en: 'Microwave oven' },
    shortDesc: { th: 'เตาไมโครเวฟสำหรับใช้ในบ้าน หลายขนาดความจุ', en: 'Household microwave ovens in several capacities.' },
    priceFrom: null,
    specs: [{ label: { th: 'ใช้งาน', en: 'For' }, value: { th: 'ในบ้าน', en: 'Home use' } }],
    featured: false,
  },
  {
    id: 'p-rice-cooker',
    slug: 'rice-cooker',
    category: 'electronics',
    name: { th: 'หม้อหุงข้าว', en: 'Rice cooker' },
    shortDesc: { th: 'หม้อหุงข้าวไฟฟ้า ตั้งแต่ขนาดครัวเรือนถึงขนาดร้าน', en: 'Electric rice cookers, household to commercial sizes.' },
    priceFrom: null,
    specs: [{ label: { th: 'ขนาด', en: 'Size' }, value: { th: 'ครัวเรือน / ร้านค้า', en: 'Household or commercial' } }],
    featured: false,
  },
  {
    id: 'p-electric-kettle',
    slug: 'electric-kettle',
    category: 'electronics',
    name: { th: 'กาน้ำร้อนไฟฟ้า', en: 'Electric kettle' },
    shortDesc: { th: 'กาต้มน้ำไฟฟ้า ตัดไฟอัตโนมัติเมื่อน้ำเดือด', en: 'Electric kettles with automatic cut-off.' },
    priceFrom: null,
    specs: [{ label: { th: 'ระบบ', en: 'Feature' }, value: { th: 'ตัดไฟอัตโนมัติ', en: 'Auto cut-off' } }],
    featured: false,
  },
  {
    id: 'p-air-conditioner',
    slug: 'air-conditioner',
    category: 'electronics',
    name: { th: 'เครื่องปรับอากาศ', en: 'Air conditioner' },
    shortDesc: {
      th: 'แอร์ติดผนังระบบอินเวอร์เตอร์ พร้อมทีมช่างติดตั้งและเดินท่อของเราเอง',
      en: 'Wall-mounted inverter air conditioners, fitted and piped by our own crew.',
    },
    priceFrom: null,
    specs: [
      { label: { th: 'ขนาด', en: 'Capacity' }, value: { th: '9,000–24,000 BTU', en: '9,000–24,000 BTU' } },
      { label: { th: 'ระบบ', en: 'Type' }, value: { th: 'อินเวอร์เตอร์', en: 'Inverter' } },
      { label: { th: 'บริการ', en: 'Service' }, value: { th: 'ติดตั้งและเดินท่อ', en: 'Install and pipework' } },
    ],
    featured: false,
  },
  {
    id: 'p-bed-frame',
    slug: 'bed-frame',
    category: 'furniture',
    name: { th: 'เตียงนอน', en: 'Bed frame' },
    shortDesc: { th: 'เตียงนอนพร้อมหัวเตียง หลายขนาด เข้าชุดกับตู้เสื้อผ้าบิลต์อิน', en: 'Bed frames with headboard, sized to match the built-in wardrobes.' },
    priceFrom: null,
    specs: [
      { label: { th: 'ขนาด', en: 'Sizes' }, value: { th: '3.5 / 5 / 6 ฟุต', en: '3.5 / 5 / 6 ft' } },
      { label: { th: 'เข้าชุดกับ', en: 'Matches' }, value: { th: 'ตู้เสื้อผ้าบิลต์อิน', en: 'Built-in wardrobes' } },
    ],
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
