import i18n from '../i18n'

/**
 * Marketing-site strings, added as a `mkt` group on the existing `translation`
 * namespace via addResourceBundle — deliberately NOT edited into
 * `locales/*.json` so this work doesn't collide with concurrent edits there.
 * Importing this module (any marketing component does) registers the bundle.
 */

const th = {
  nav: {
    home: 'หน้าแรก',
    services: 'บริการ',
    models: 'แบบบ้าน',
    work: 'ผลงาน',
    about: 'เกี่ยวกับเรา',
    contact: 'ติดต่อ',
    designCta: 'ออกแบบบ้าน',
    openApp: 'เข้าเครื่องออกแบบ',
    products: 'สินค้า',
  },
  products: {
    eyebrow: 'สินค้า',
    title: 'สินค้าและบริการของเรา',
    sub: 'บ้านน็อคดาวน์ อิเล็กทรอนิกส์ เฟอร์นิเจอร์ และรถก่อสร้างให้เช่า — เลือกดูตามหมวด',
  },
  portfolio: {
    eyebrow: 'ผลงาน',
    title: 'ผลงานที่เราสร้างจริง',
    sub: 'ตัวอย่างบ้านและงานติดตั้งที่ส่งมอบแล้ว',
  },
  catalog: {
    all: 'ทั้งหมด',
    from: 'เริ่มต้น',
    quote: 'สอบถามราคา',
    viewDetail: 'ดูรายละเอียด',
    customize: 'ปรับแบบนี้',
    requestQuote: 'ขอใบเสนอราคา',
    backToProducts: '← กลับไปหน้าสินค้า',
    backToPortfolio: '← กลับไปหน้าผลงาน',
    specsHead: 'รายละเอียด',
    otherProducts: 'สินค้าอื่นๆ',
    notFound: 'ไม่พบรายการนี้',
  },
  home: {
    eyebrow: 'บ้านน็อคดาวน์ · ออกแบบเอง · ราคาชัดเจน',
    title: 'ออกแบบบ้านในแบบคุณ แล้วให้เราสร้างให้จริง',
    lead: 'เขียนแปลนบ้านน็อคดาวน์ได้เองบนเว็บ เห็นภาพ 3 มิติและราคาประเมินทันที แล้วส่งให้ทีมช่างของเราติดต่อกลับ — ครบทั้งออกแบบ ผลิต ขนส่ง และติดตั้ง',
    ctaPrimary: 'เริ่มออกแบบบ้านของคุณ',
    ctaSecondary: 'ดูแบบบ้านสำเร็จรูป',
    trust1: 'ราคาโปร่งใส', trust1sub: 'คำนวณต่อ ตร.ม. ทันที',
    trust2: 'เห็น 3 มิติ', trust2sub: 'ดูทรงบ้านก่อนสร้าง',
    trust3: 'ครบวงจร', trust3sub: 'ออกแบบถึงติดตั้ง',
    svcEyebrow: 'สิ่งที่เราทำ',
    svcHeading: 'บ้านน็อคดาวน์คืองานหลัก พร้อมสินค้าและบริการที่ครบจบในที่เดียว',
    svcSub: 'เริ่มจากบ้านสำเร็จรูปที่ออกแบบเองได้ ต่อยอดด้วยงานอิเล็กทรอนิกส์ เฟอร์นิเจอร์ และรถก่อสร้างให้เช่า',
    svcMainBadge: 'งานหลัก',
    svc1: 'บ้านน็อคดาวน์', svc1d: 'ออกแบบแปลนเอง ผลิตสำเร็จรูป ขนส่งและติดตั้งถึงหน้างาน ควบคุมงบได้',
    svc2: 'สินค้าอิเล็กทรอนิกส์', svc2d: 'อุปกรณ์และระบบไฟฟ้า-อิเล็กทรอนิกส์สำหรับบ้านและงานติดตั้ง',
    svc3: 'เฟอร์นิเจอร์', svc3d: 'เฟอร์นิเจอร์บิลต์อินและลอยตัว จัดชุดให้เข้ากับแบบบ้านของคุณ',
    svc4: 'เช่ารถก่อสร้าง', svc4d: 'รถและเครื่องจักรก่อสร้างให้เช่า พร้อมทีมสนับสนุนหน้างาน',
    modelsEyebrow: 'แบบบ้านแนะนำ',
    modelsHeading: 'เริ่มจากแบบสำเร็จรูป แล้วปรับให้เป็นของคุณ',
    modelsSub: 'ทุกแบบเปิดในเครื่องออกแบบได้ทันที ปรับผนัง เพิ่มห้อง แล้วดูราคาใหม่',
    modelCustomize: 'ปรับแบบนี้',
    workEyebrow: 'ผลงานที่ผ่านมา',
    workHeading: 'บ้านและงานติดตั้งที่เราสร้างจริง',
    workAll: 'ดูผลงานทั้งหมด',
    stat1: 'หลังที่ส่งมอบ', stat2: 'ปีประสบการณ์', stat3: 'ทีมช่าง', stat4: 'รับประกันโครงสร้าง',
    finalHeading: 'พร้อมเริ่มออกแบบบ้านของคุณแล้วหรือยัง?',
    finalSub: 'ใช้เครื่องออกแบบฟรี ไม่ต้องสมัครก็เริ่มได้ — เห็นแปลน 3 มิติ และราคาประเมินทันที',
    finalCta: 'เริ่มออกแบบเลย',
  },
  about: {
    eyebrow: 'เกี่ยวกับเรา',
    title: 'สร้างบ้านน็อคดาวน์คุณภาพ ในราคาที่จับต้องได้',
    body: 'CG เริ่มจากงานบ้านน็อคดาวน์สำเร็จรูป และเติบโตสู่งานอิเล็กทรอนิกส์ เฟอร์นิเจอร์ และบริการเช่ารถก่อสร้าง เรารวมการออกแบบ ผลิต และติดตั้งไว้ในทีมเดียว เพื่อให้ลูกค้าคุมงบและคุณภาพได้ตั้งแต่ต้นจนจบ',
    val1: 'โปร่งใส', val1d: 'ราคาชัดเจนตั้งแต่แรก ไม่มีบวกเพิ่มทีหลัง',
    val2: 'ครบวงจร', val2d: 'ออกแบบ ผลิต ขนส่ง ติดตั้ง ในทีมเดียว',
    val3: 'รวดเร็ว', val3d: 'บ้านสำเร็จรูปติดตั้งไว ใช้เวลาน้อยกว่าก่อสร้างปกติ',
    ceoEyebrow: 'ผู้บริหาร',
    ceoName: 'ชื่อ–สกุล ซีอีโอ',
    ceoTitle: 'ประธานเจ้าหน้าที่บริหาร (CEO)',
    ceoQuote: '“เราอยากให้ทุกคนมีบ้านที่ออกแบบเองได้ ในราคาที่จับต้องได้ และคุณภาพที่ไว้ใจได้”',
    ceoPhotoNote: 'รูป CEO (ใส่รูปจริงภายหลัง)',
  },
  contact: {
    eyebrow: 'ติดต่อเรา',
    title: 'อยากปรึกษาหรือขอใบเสนอราคา?',
    sub: 'กรอกข้อมูลไว้ ทีมงานจะติดต่อกลับโดยเร็ว หรือติดต่อช่องทางด้านล่างได้เลย',
    name: 'ชื่อ-นามสกุล', phone: 'เบอร์โทร', email: 'อีเมล', message: 'รายละเอียด',
    send: 'ส่งข้อความ', sent: 'ส่งเรียบร้อย ทีมงานจะติดต่อกลับโดยเร็ว',
    phoneLabel: 'โทร', lineLabel: 'LINE', emailLabel: 'อีเมล', addressLabel: 'ที่อยู่',
    localNotice: 'ตอนนี้ข้อความถูกเก็บในเบราว์เซอร์เท่านั้น ยังไม่ได้ส่งขึ้นเซิร์ฟเวอร์จริง',
  },
  footer: {
    tagline: 'บ้านน็อคดาวน์ออกแบบเอง พร้อมสินค้าอิเล็กทรอนิกส์ เฟอร์นิเจอร์ และรถก่อสร้างให้เช่า',
    servicesHead: 'บริการ', companyHead: 'บริษัท', contactHead: 'ติดต่อ',
    rights: 'สงวนลิขสิทธิ์',
  },
  placeholderNote: 'เนื้อหาและตัวเลขบางส่วนเป็นตัวอย่าง รอข้อมูลจริงของบริษัท',
}

const en = {
  nav: {
    home: 'Home', services: 'Services', models: 'House models', work: 'Portfolio',
    about: 'About', contact: 'Contact', designCta: 'Design a house', openApp: 'Open the designer', products: 'Products',
  },
  products: {
    eyebrow: 'Products',
    title: 'Our products and services',
    sub: 'Knock-down houses, electronics, furniture, and construction-equipment rental — browse by category.',
  },
  portfolio: {
    eyebrow: 'Portfolio',
    title: 'Projects we have actually built',
    sub: 'A sample of homes and installs we have delivered.',
  },
  catalog: {
    all: 'All',
    from: 'from',
    quote: 'Ask for pricing',
    viewDetail: 'View details',
    customize: 'Customize',
    requestQuote: 'Request a quote',
    backToProducts: '← Back to products',
    backToPortfolio: '← Back to portfolio',
    specsHead: 'Details',
    otherProducts: 'Other products',
    notFound: 'Item not found',
  },
  home: {
    eyebrow: 'Knock-down houses · design your own · clear pricing',
    title: 'Design your home, and we build it for real',
    lead: 'Draw your own knock-down house plan in the browser, see it in 3D with an instant price estimate, then send it to our team — design, manufacture, delivery and installation, all in one place.',
    ctaPrimary: 'Start designing your home',
    ctaSecondary: 'Browse house models',
    trust1: 'Clear pricing', trust1sub: 'Per-m² estimate, instantly',
    trust2: 'See it in 3D', trust2sub: 'Preview the form before you build',
    trust3: 'End to end', trust3sub: 'Design through installation',
    svcEyebrow: 'What we do',
    svcHeading: 'Knock-down houses are our core — with products and services that finish the job',
    svcSub: 'Start with a prefab house you design yourself, then add electronics, furniture, and construction-equipment rental.',
    svcMainBadge: 'Core',
    svc1: 'Knock-down houses', svc1d: 'Design the plan, we prefab it, deliver and install on site, on budget.',
    svc2: 'Electronics', svc2d: 'Electrical and electronic gear and systems for homes and installs.',
    svc3: 'Furniture', svc3d: 'Built-in and loose furniture, matched to your house design.',
    svc4: 'Equipment rental', svc4d: 'Construction vehicles and machinery for rent, with on-site support.',
    modelsEyebrow: 'Featured models',
    modelsHeading: 'Start from a ready plan, then make it yours',
    modelsSub: 'Every model opens in the designer — move walls, add rooms, see the new price.',
    modelCustomize: 'Customize',
    workEyebrow: 'Our work',
    workHeading: 'Homes and installs we have actually built',
    workAll: 'See all projects',
    stat1: 'homes delivered', stat2: 'years of experience', stat3: 'crew members', stat4: 'structural warranty',
    finalHeading: 'Ready to design your home?',
    finalSub: 'The designer is free — no sign-up to start. See the 3D plan and an instant estimate.',
    finalCta: 'Start designing',
  },
  about: {
    eyebrow: 'About us',
    title: 'Quality knock-down homes at a price you can reach',
    body: 'CG started with prefab knock-down houses and grew into electronics, furniture, and construction-equipment rental. We keep design, manufacturing and installation under one roof so customers control budget and quality from start to finish.',
    val1: 'Transparent', val1d: 'Clear pricing up front, no surprises later.',
    val2: 'End to end', val2d: 'Design, build, deliver and install in one team.',
    val3: 'Fast', val3d: 'Prefab installs quickly — less time than conventional builds.',
    ceoEyebrow: 'Leadership',
    ceoName: 'CEO name',
    ceoTitle: 'Chief Executive Officer',
    ceoQuote: '“We want everyone to have a home they design themselves — at a price they can reach and quality they can trust.”',
    ceoPhotoNote: 'CEO photo (add the real one later)',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Want advice or a quote?',
    sub: 'Leave your details and our team will get back to you, or reach us on the channels below.',
    name: 'Full name', phone: 'Phone', email: 'Email', message: 'Details',
    send: 'Send message', sent: 'Sent — our team will contact you shortly.',
    phoneLabel: 'Phone', lineLabel: 'LINE', emailLabel: 'Email', addressLabel: 'Address',
    localNotice: 'Right now this is saved in your browser only; it is not sent to a real server yet.',
  },
  footer: {
    tagline: 'Design-your-own knock-down houses, plus electronics, furniture, and construction-equipment rental.',
    servicesHead: 'Services', companyHead: 'Company', contactHead: 'Contact',
    rights: 'All rights reserved',
  },
  placeholderNote: 'Some copy and figures are placeholders pending the real company data.',
}

let registered = false
export function ensureMarketingI18n() {
  if (registered) return
  i18n.addResourceBundle('th', 'translation', { mkt: th }, true, true)
  i18n.addResourceBundle('en', 'translation', { mkt: en }, true, true)
  registered = true
}

ensureMarketingI18n()
