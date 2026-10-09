import type { CertificateRow, CompanyInfoRow } from '../content/company'
import { DOCUMENTS_BUCKET } from '../supabase/storage'
import { db, downscaleImage, explain } from './client'

/**
 * Company registration facts (`company_info`, one row) and trust documents
 * (`certificates` + the `documents` bucket). Both written as the signed-in staff
 * user; RLS (`is_staff()`) decides, as everywhere else in the back office.
 */

/** Said instead of a raw "relation does not exist" before the migration runs. */
function explainMissing(error: { message?: string; code?: string } | null, action: string): Error {
  if (error?.code === 'PGRST205' || error?.code === '42P01' || /does not exist|schema cache/i.test(error?.message ?? '')) {
    return new Error(
      `${action}ไม่ได้: ยังไม่ได้สร้างตารางในฐานข้อมูล — ต้องรัน migration 20261008120000_company_info_and_certificates.sql ก่อน (pnpm run db:push)`,
    )
  }
  return explain(error, action)
}

// --- company_info -----------------------------------------------------------

export interface CompanyDraft {
  legalNameTh: string
  legalNameEn: string
  registrationNo: string
  /** `YYYY-MM-DD` (CE), from a date input. */
  registeredOn: string
  /** Baht, digits only; blank = unknown. */
  capital: string
  statusTh: string
  statusEn: string
  businessTypeTh: string
  businessTypeEn: string
  activitiesTh: string
  activitiesEn: string
}

export function draftFromCompany(row: CompanyInfoRow): CompanyDraft {
  return {
    legalNameTh: row.legal_name?.th ?? '',
    legalNameEn: row.legal_name?.en ?? '',
    registrationNo: row.registration_no ?? '',
    registeredOn: row.registered_on ?? '',
    capital: row.capital === null ? '' : String(Number(row.capital)),
    statusTh: row.status?.th ?? '',
    statusEn: row.status?.en ?? '',
    businessTypeTh: row.business_type?.th ?? '',
    businessTypeEn: row.business_type?.en ?? '',
    activitiesTh: row.activities?.th ?? '',
    activitiesEn: row.activities?.en ?? '',
  }
}

/** One language may be left blank; the site then shows the other rather than nothing. */
const pair = (th: string, en: string) => ({ th: th.trim() || en.trim(), en: en.trim() || th.trim() })

export async function loadCompany(): Promise<CompanyInfoRow | null> {
  const { data, error } = await db().from('company_info').select('*').eq('id', 1).maybeSingle()
  if (error) throw explainMissing(error, 'โหลดข้อมูลบริษัท')
  return data as CompanyInfoRow | null
}

export async function saveCompany(draft: CompanyDraft): Promise<CompanyInfoRow> {
  const regNo = draft.registrationNo.replace(/[\s-]/g, '')
  if (regNo && !/^\d{13}$/.test(regNo)) throw new Error('เลขทะเบียนนิติบุคคลต้องเป็นตัวเลข 13 หลัก')
  const capitalText = draft.capital.replace(/[,\s]/g, '')
  if (capitalText && !/^\d+(\.\d+)?$/.test(capitalText)) throw new Error('ทุนจดทะเบียนใส่เป็นตัวเลข (บาท) เท่านั้น')

  const { data, error } = await db()
    .from('company_info')
    .update({
      legal_name: pair(draft.legalNameTh, draft.legalNameEn),
      registration_no: regNo,
      registered_on: draft.registeredOn || null,
      capital: capitalText ? Number(capitalText) : null,
      status: pair(draft.statusTh, draft.statusEn),
      business_type: pair(draft.businessTypeTh, draft.businessTypeEn),
      activities: pair(draft.activitiesTh, draft.activitiesEn),
    })
    .eq('id', 1)
    .select()
  if (error) throw explainMissing(error, 'บันทึกข้อมูลบริษัท')
  // RLS turns a refused UPDATE into zero rows and a 200 — never report that as saved.
  if (!data || data.length === 0) throw new Error('บันทึกไม่สำเร็จ: บัญชีนี้ไม่มีสิทธิ์แก้ไข หรือยังไม่มีแถวข้อมูลบริษัทในฐานข้อมูล')
  return data[0] as CompanyInfoRow
}

// --- certificates -----------------------------------------------------------

export interface CertificateDraft {
  id: string
  titleTh: string
  titleEn: string
  issuerTh: string
  issuerEn: string
  docNo: string
  issuedOn: string
  expiresOn: string
  filePath: string
  fileType: 'image' | 'pdf' | ''
  published: boolean
}

export const EMPTY_CERTIFICATE: CertificateDraft = {
  id: '',
  titleTh: '',
  titleEn: '',
  issuerTh: '',
  issuerEn: '',
  docNo: '',
  issuedOn: '',
  expiresOn: '',
  filePath: '',
  fileType: '',
  published: true,
}

export function draftFromCertificate(row: CertificateRow): CertificateDraft {
  return {
    id: row.id,
    titleTh: row.title?.th ?? '',
    titleEn: row.title?.en ?? '',
    issuerTh: row.issuer?.th ?? '',
    issuerEn: row.issuer?.en ?? '',
    docNo: row.doc_no ?? '',
    issuedOn: row.issued_on ?? '',
    expiresOn: row.expires_on ?? '',
    filePath: row.file_path,
    fileType: row.file_type,
    published: row.published,
  }
}

export async function listCertificates(): Promise<CertificateRow[]> {
  const { data, error } = await db().from('certificates').select('*').order('sort_order').order('created_at')
  if (error) throw explainMissing(error, 'โหลดเอกสารรับรอง')
  return (data ?? []) as CertificateRow[]
}

export async function saveCertificate(draft: CertificateDraft, sortOrder: number): Promise<CertificateRow> {
  if (!draft.titleTh.trim() && !draft.titleEn.trim()) throw new Error('ใส่ชื่อเอกสารก่อน')
  if (!draft.filePath || !draft.fileType) throw new Error('อัปโหลดไฟล์เอกสารก่อน')
  if (draft.issuedOn && draft.expiresOn && draft.expiresOn < draft.issuedOn) {
    throw new Error('วันหมดอายุต้องอยู่หลังวันที่ออกเอกสาร')
  }
  const issuer = draftHasText(draft.issuerTh, draft.issuerEn) ? pair(draft.issuerTh, draft.issuerEn) : null
  const row = {
    title: pair(draft.titleTh, draft.titleEn),
    issuer,
    doc_no: draft.docNo.trim() || null,
    issued_on: draft.issuedOn || null,
    expires_on: draft.expiresOn || null,
    file_path: draft.filePath,
    file_type: draft.fileType,
    published: draft.published,
  }
  const query = draft.id
    ? db().from('certificates').update(row).eq('id', draft.id).select()
    : db().from('certificates').insert({ ...row, sort_order: sortOrder }).select()
  const { data, error } = await query
  if (error) throw explainMissing(error, 'บันทึกเอกสาร')
  if (!data || data.length === 0) throw new Error('บันทึกไม่สำเร็จ: บัญชีนี้ไม่มีสิทธิ์แก้ไข')
  return data[0] as CertificateRow
}

function draftHasText(...values: string[]): boolean {
  return values.some((v) => v.trim())
}

export async function setCertificatePublished(id: string, published: boolean): Promise<void> {
  const { data, error } = await db().from('certificates').update({ published }).eq('id', id).select('id')
  if (error) throw explainMissing(error, 'เปลี่ยนสถานะเอกสาร')
  if (!data || data.length === 0) throw new Error('เปลี่ยนสถานะไม่สำเร็จ: บัญชีนี้ไม่มีสิทธิ์แก้ไข')
}

/** Writes the whole order at once: `ids` in display order. */
export async function reorderCertificates(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, index) => db().from('certificates').update({ sort_order: index }).eq('id', id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw explainMissing(failed.error, 'จัดลำดับเอกสาร')
}

export async function deleteCertificate(row: CertificateRow): Promise<void> {
  const { error } = await db().from('certificates').delete().eq('id', row.id)
  if (error) throw explainMissing(error, 'ลบเอกสาร')
  await removeDocument(row.file_path)
}

const PDF_TYPE = 'application/pdf'

/**
 * Uploads a picked scan or PDF and returns its path + kind.
 *
 * Images are downscaled like every other upload (phone photos of a certificate
 * are 3–8 MB); a PDF goes up untouched — re-encoding it in the browser is not
 * something to attempt for a legal document.
 */
export async function uploadDocument(file: File): Promise<{ path: string; type: 'image' | 'pdf' }> {
  const isPdf = file.type === PDF_TYPE || /\.pdf$/i.test(file.name)
  if (!isPdf && !file.type.startsWith('image/')) throw new Error('รองรับเฉพาะไฟล์รูป (JPG/PNG/WebP) หรือ PDF')
  const body: Blob = isPdf ? file : await downscaleImage(file)
  if (body.size > 10 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 10 MB')

  const stamp = Date.now().toString(36)
  const safe = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  // downscaleImage hands back the original file when it was already small, else a JPEG.
  const ext = isPdf ? 'pdf' : body === file ? (file.name.split('.').pop() || 'jpg').toLowerCase() : 'jpg'
  const path = `certificates/${stamp}-${safe || 'document'}.${ext}`

  const { error } = await db()
    .storage.from(DOCUMENTS_BUCKET)
    .upload(path, body, { contentType: isPdf ? PDF_TYPE : body.type || 'image/jpeg', cacheControl: '3600', upsert: false })
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error('อัปโหลดไม่ได้: ยังไม่มีที่เก็บไฟล์ "documents" — ต้องรัน migration 20261008120000_company_info_and_certificates.sql ก่อน')
    }
    throw explain(error, 'อัปโหลดเอกสาร')
  }
  return { path, type: isPdf ? 'pdf' : 'image' }
}

export async function removeDocument(path: string): Promise<void> {
  if (!path) return
  const { error } = await db().storage.from(DOCUMENTS_BUCKET).remove([path])
  if (error && !/not found/i.test(error.message)) throw explain(error, 'ลบไฟล์เอกสาร')
}
