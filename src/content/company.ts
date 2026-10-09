import type { Localized } from '../catalog/types'

/**
 * Legal-entity facts shown on the About page to establish the business is a
 * registered juristic person. Source: the DBD (กรมพัฒนาธุรกิจการค้า)
 * registration.
 *
 * **Edit these in the back office (`/admin/company`)** — they live in the
 * `company_info` table. `COMPANY_FALLBACK` below is only what the site renders
 * when Supabase is not configured, the migration has not been applied, or the
 * fetch fails; keep it in step with the table so a fallback never shows stale
 * facts.
 *
 * A field left empty is hidden rather than shown blank, so a value that isn't
 * known yet simply doesn't appear (same convention as contact.json). Do NOT
 * invent the registration number, capital or dates — they must match the
 * หนังสือรับรอง exactly.
 */
export interface CompanyInfo {
  /** Full registered name (ห้างหุ้นส่วนจำกัด …). */
  legalName: Localized
  /** 13-digit juristic-person / tax number. */
  registrationNo: string
  /** Registration date as an ISO (CE) date, `YYYY-MM-DD`; formatted per language on display. */
  registeredOn: string | null
  /** Registered capital in baht. */
  capital: number | null
  /** DBD operating status. */
  status: Localized
  /** DBD business category. */
  businessType: Localized
  /** Scope of business as registered. */
  activities: Localized
}

export const COMPANY_FALLBACK: CompanyInfo = {
  legalName: {
    th: 'ห้างหุ้นส่วนจำกัด ไทย ดวงดี เอ็นจิเนียริ่ง',
    en: 'Thai Dongdee Engineering Limited Partnership',
  },
  registrationNo: '0673560001671',
  registeredOn: '2017-11-10',
  capital: 1500000,
  status: { th: 'ยังดำเนินกิจการอยู่', en: 'Active' },
  businessType: {
    th: 'ร้านขายปลีกเครื่องใช้ไฟฟ้าชนิดในครัวเรือน',
    en: 'Retail of household electrical appliances',
  },
  activities: {
    th: 'ขายเครื่องใช้ไฟฟ้า อุปกรณ์ก่อสร้าง ติดตั้ง จัดทำ ซ่อมบำรุง',
    en: 'Sale of electrical appliances and construction equipment; installation, fabrication and maintenance',
  },
}

/**
 * A trust document (licence, registration, certificate) shown on /about.
 * Rows live in the `certificates` table, files in the `documents` bucket.
 */
export interface Certificate {
  id: string
  title: Localized
  issuer: Localized | null
  docNo: string | null
  issuedOn: string | null
  expiresOn: string | null
  filePath: string
  fileType: 'image' | 'pdf'
}

/** The DB row shapes, shared by the site, the admin and the prerenderer. */
export interface CompanyInfoRow {
  legal_name: Localized | null
  registration_no: string | null
  registered_on: string | null
  capital: number | string | null
  status: Localized | null
  business_type: Localized | null
  activities: Localized | null
}

export interface CertificateRow {
  id: string
  title: Localized
  issuer: Localized | null
  doc_no: string | null
  issued_on: string | null
  expires_on: string | null
  file_path: string
  file_type: 'image' | 'pdf'
  sort_order: number
  published: boolean
}

const EMPTY: Localized = { th: '', en: '' }

export function companyFromRow(row: CompanyInfoRow): CompanyInfo {
  return {
    legalName: row.legal_name ?? EMPTY,
    registrationNo: row.registration_no ?? '',
    registeredOn: row.registered_on,
    // numeric comes back from PostgREST as a string.
    capital: row.capital === null || row.capital === '' ? null : Number(row.capital),
    status: row.status ?? EMPTY,
    businessType: row.business_type ?? EMPTY,
    activities: row.activities ?? EMPTY,
  }
}

export function certificateFromRow(row: CertificateRow): Certificate {
  return {
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    docNo: row.doc_no,
    issuedOn: row.issued_on,
    expiresOn: row.expires_on,
    filePath: row.file_path,
    fileType: row.file_type,
  }
}

/** Today in Bangkok as `YYYY-MM-DD`, so "expired" flips at Thai midnight, not UTC's. */
export function todayBangkok(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

/** An expired document is left off the public page rather than shown out of date. */
export function isExpired(cert: { expiresOn: string | null }, today = todayBangkok()): boolean {
  return Boolean(cert.expiresOn && cert.expiresOn < today)
}

/** `2017-11-10` → "10 พฤศจิกายน 2560" / "10 November 2017". */
export function formatIsoDate(iso: string | null, lang: 'th' | 'en'): string {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00+07:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  })
}

/** `1500000` → "1,500,000 บาท" / "THB 1,500,000". */
export function formatCapital(value: number | null, lang: 'th' | 'en'): string {
  if (value === null || !Number.isFinite(value)) return ''
  const n = value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return lang === 'en' ? `THB ${n}` : `${n} บาท`
}
