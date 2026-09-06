import type { Localized, ProductCategory } from '../catalog/types'

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

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init)
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`)
  return data as T
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const listAdminProducts = () => call<ProductRow[]>('/products')

export const saveProduct = (draft: ProductDraft) => call<ProductRow>('/products', json(draft))

const patch = (id: string, body: Record<string, unknown>) =>
  call<ProductRow>(`/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const setProductPublished = (id: string, published: boolean) => patch(id, { published })

/** One best seller per category — the API clears the previous one. */
export const setProductBestSeller = (id: string, bestSeller: boolean) => patch(id, { best_seller: bestSeller })

export const deleteProduct = (id: string) => call(`/products/${id}`, { method: 'DELETE' })

export const uploadProductImage = (slug: string, filename: string, data: string) =>
  call<{ path: string }>('/upload', json({ slug, filename, data, kind: 'products' }))
