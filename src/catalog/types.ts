/**
 * Catalog content types for the marketing site (products + portfolio). Content
 * is bilingual via `Localized`. Right now the data is a static seed (see
 * `products.ts` / `projects.ts`); it can be swapped for an async repository /
 * backend later without changing the page components, which read through the
 * helpers exported alongside the seed.
 */

export type ProductCategory = 'house' | 'electronics' | 'furniture' | 'rental'

export interface Localized {
  th: string
  en: string
}

export interface ProductSpec {
  label: Localized
  value: Localized
}

export interface Product {
  id: string
  /** URL slug + image filename stem: public/products/<slug>.jpg */
  slug: string
  category: ProductCategory
  name: Localized
  shortDesc: Localized
  /** THB from-price, or null when it's quote-only. */
  priceFrom: number | null
  /** e.g. "ต่อวัน" for rentals; omitted for one-off prices. */
  priceUnit?: Localized
  specs: ProductSpec[]
  featured: boolean
}

export interface Project {
  id: string
  /** URL slug + image filename stem: public/portfolio/<slug>.jpg */
  slug: string
  title: Localized
  location: Localized
  /** Buddhist-era year string as shown, e.g. "2567". */
  year: string
  category: ProductCategory
  area?: string
  description: Localized
  featured: boolean
}
