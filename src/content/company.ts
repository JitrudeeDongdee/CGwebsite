import type { Localized } from '../catalog/types'

/**
 * Legal-entity facts shown on the About page to establish the business is a
 * registered juristic person. Source: the DBD (กรมพัฒนาธุรกิจการค้า)
 * registration — edit here when it changes.
 *
 * A field left empty ('' / '—') is hidden rather than shown blank, so a value
 * that isn't known yet simply doesn't appear (same convention as contact.json).
 * Do NOT invent the registration number, capital or dates — they must match the
 * หนังสือรับรอง exactly.
 */
export interface CompanyInfo {
  /** Full registered name (ห้างหุ้นส่วนจำกัด …). */
  legalName: Localized
  /** 13-digit juristic-person / tax number. */
  registrationNo: string
  /** Registration date, formatted for display (TH uses the Buddhist year). */
  registeredDate: Localized
  /** Same date as an ISO (CE) string, for JSON-LD `foundingDate`. */
  foundingDateIso: string
  /** Registered capital, formatted with its unit. */
  capital: Localized
  /** DBD operating status. */
  status: Localized
  /** DBD business category. */
  businessType: Localized
  /** Scope of business as registered. */
  activities: Localized
}

export const COMPANY: CompanyInfo = {
  legalName: {
    th: 'ห้างหุ้นส่วนจำกัด ไทย ดวงดี เอ็นจิเนียริ่ง',
    en: 'Thai Dongdee Engineering Limited Partnership',
  },
  registrationNo: '0673560001671',
  registeredDate: { th: '10 พฤศจิกายน 2560', en: '10 November 2017' },
  foundingDateIso: '2017-11-10',
  capital: { th: '1,500,000 บาท', en: 'THB 1,500,000' },
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
