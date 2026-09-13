import type { Localized, ProductCategory } from '../catalog/types'
import { db, explain, removeFromBucket, uploadToBucket } from './client'

/**
 * The product half of the development-only admin API (`vite-dev-api.mts`).
 * Mirrors `portfolioApi.ts`; the shapes differ because a product has a price
 * and a spec table where a project has a timeline.
 */

export interface ProductRow {
  id: string
  slug: string | null
  category: ProductCategory
  name: Localized
  short_desc: Localized | null
  price_from: string | number | null
  price_unit: Localized | null
  specs: { label: Localized; value: Localized }[] | null
  featured: boolean
  best_seller: boolean
  published: boolean
  image_path: string | null
  images: string[] | null
}

export interface SpecDraft {
  labelTh: string
  labelEn: string
  valueTh: string
  valueEn: string
}

export interface ProductDraft {
  id: string
  slug: string
  category: ProductCategory
  nameTh: string
  nameEn: string
  shortDescTh: string
  shortDescEn: string
  /** Empty means "ask for a price", which is a real state for rentals and jobs. */
  priceFrom: string
  priceUnitTh: string
  priceUnitEn: string
  specs: SpecDraft[]
  images: string[]
  cover: string
  featured: boolean
  bestSeller: boolean
  published: boolean
}

export const EMPTY_SPEC: SpecDraft = { labelTh: '', labelEn: '', valueTh: '', valueEn: '' }

export const EMPTY_PRODUCT: ProductDraft = {
  id: '',
  slug: '',
  category: 'house',
  nameTh: '',
  nameEn: '',
  shortDescTh: '',
  shortDescEn: '',
  priceFrom: '',
  priceUnitTh: '',
  priceUnitEn: '',
  specs: [{ ...EMPTY_SPEC }],
  images: [],
  cover: '',
  featured: false,
  bestSeller: false,
  published: true,
}

export function draftFromProduct(row: ProductRow): ProductDraft {
  return {
    id: row.id,
    slug: row.slug ?? '',
    category: row.category,
    nameTh: row.name?.th ?? '',
    nameEn: row.name?.en ?? '',
    shortDescTh: row.short_desc?.th ?? '',
    shortDescEn: row.short_desc?.en ?? '',
    priceFrom: row.price_from == null ? '' : String(row.price_from),
    priceUnitTh: row.price_unit?.th ?? '',
    priceUnitEn: row.price_unit?.en ?? '',
    specs: row.specs?.length
      ? row.specs.map((spec) => ({
          labelTh: spec.label?.th ?? '',
          labelEn: spec.label?.en ?? '',
          valueTh: spec.value?.th ?? '',
          valueEn: spec.value?.en ?? '',
        }))
      : [{ ...EMPTY_SPEC }],
    images: row.images?.length ? row.images : row.image_path ? [row.image_path] : [],
    cover: row.image_path ?? '',
    featured: row.featured,
    bestSeller: row.best_seller,
    published: row.published,
  }
}

const TABLE = 'products'

export async function listAdminProducts(): Promise<ProductRow[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw explain(error, 'โหลดรายการสินค้า')
  return (data ?? []) as ProductRow[]
}

const pair = (th: string, en: string) => ({ th: th.trim() || en.trim(), en: en.trim() || th.trim() })

export async function saveProduct(draft: ProductDraft): Promise<ProductRow> {
  const slug = draft.slug.trim()
  if (slug && !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error('slug ใช้ได้เฉพาะ a-z 0-9 และ - เท่านั้น')
  }
  if (!draft.nameTh && !draft.nameEn) throw new Error('ต้องใส่ชื่อสินค้าอย่างน้อยหนึ่งภาษา')

  const cover = draft.images.includes(draft.cover) ? draft.cover : draft.images[0]
  const ordered = cover ? [cover, ...draft.images.filter((path) => path !== cover)] : draft.images

  const payload = {
    slug: slug || null,
    category: draft.category,
    name: pair(draft.nameTh, draft.nameEn),
    short_desc: pair(draft.shortDescTh, draft.shortDescEn),
    // Blank is a real state — "สอบถามราคา" — not a zero.
    price_from: draft.priceFrom.trim() === '' ? null : Number(draft.priceFrom),
    price_unit: draft.priceUnitTh.trim() || draft.priceUnitEn.trim() ? pair(draft.priceUnitTh, draft.priceUnitEn) : null,
    specs: draft.specs
      .filter((spec) => spec.labelTh.trim() || spec.labelEn.trim() || spec.valueTh.trim() || spec.valueEn.trim())
      .map((spec) => ({ label: pair(spec.labelTh, spec.labelEn), value: pair(spec.valueTh, spec.valueEn) })),
    featured: Boolean(draft.featured),
    best_seller: Boolean(draft.bestSeller),
    published: Boolean(draft.published),
    image_path: cover ?? null,
    images: ordered,
  }

  if (payload.best_seller) await clearBestSeller(draft.category, draft.id)

  const query = draft.id
    ? db().from(TABLE).update(payload).eq('id', draft.id)
    : db().from(TABLE).insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw explain(error, 'บันทึกสินค้า')
  return data as ProductRow
}

/** One best seller per category — the previous holder loses the star first. */
async function clearBestSeller(category: string, exceptId?: string) {
  let query = db().from(TABLE).update({ best_seller: false }).eq('category', category).eq('best_seller', true)
  if (exceptId) query = query.neq('id', exceptId)
  const { error } = await query
  if (error) throw explain(error, 'เปลี่ยนสินค้าขายดี')
}

export async function setProductPublished(id: string, published: boolean): Promise<ProductRow> {
  const { data, error } = await db().from(TABLE).update({ published }).eq('id', id).select().single()
  if (error) throw explain(error, published ? 'เผยแพร่สินค้า' : 'เอาสินค้าออกจากเว็บ')
  return data as ProductRow
}

export async function setProductBestSeller(id: string, bestSeller: boolean): Promise<ProductRow> {
  if (bestSeller) {
    const { data: row } = await db().from(TABLE).select('category').eq('id', id).single()
    if (row?.category) await clearBestSeller(row.category as string, id)
  }
  const { data, error } = await db().from(TABLE).update({ best_seller: bestSeller }).eq('id', id).select().single()
  if (error) throw explain(error, 'เปลี่ยนสินค้าขายดี')
  return data as ProductRow
}

export async function deleteProduct(id: string): Promise<void> {
  const { data: existing } = await db().from(TABLE).select('image_path,images').eq('id', id).single()
  const { error } = await db().from(TABLE).delete().eq('id', id)
  if (error) throw explain(error, 'ลบสินค้า')
  const orphans = [...new Set([...(existing?.images ?? []), existing?.image_path].filter(Boolean))]
  for (const path of orphans as string[]) await removeFromBucket(path)
}

export const uploadProductImage = (folder: string, file: File) => uploadToBucket(folder, file, 'products')

export const deleteProductImage = (path: string) => removeFromBucket(path)
