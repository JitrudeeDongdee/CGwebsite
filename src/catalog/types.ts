/**
 * Catalog content types for the marketing site (products + portfolio). Content
 * is bilingual via `Localized`. Right now the data is a static seed (see
 * `products.ts` / `projects.ts`); it can be swapped for an async repository /
 * backend later without changing the page components, which read through the
 * helpers exported alongside the seed.
 */

export type ProductCategory = 'house' | 'electronics' | 'furniture' | 'rental' | 'contracting'

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
  /** URL slug, and the default image name: `products/<slug>.jpg` */
  slug: string
  category: ProductCategory
  name: Localized
  shortDesc: Localized
  /** THB from-price, or null when it's quote-only. */
  priceFrom: number | null
  /** e.g. "ต่อวัน" for rentals; omitted for one-off prices. */
  priceUnit?: Localized
  specs: ProductSpec[]
  /** Image path, when it isn't the `products/<slug>.jpg` default (see catalog/images.ts). */
  imagePath?: string
  featured: boolean
  /** Marked as a best seller — shown with a badge, and picked for the hero card. */
  bestSeller?: boolean
}

export interface Project {
  id: string
  /** URL slug, and the default image name: `portfolio/<slug>.jpg` */
  slug: string
  title: Localized
  location: Localized
  /** Buddhist-era year string as shown, e.g. "2567". */
  year: string
  category: ProductCategory
  area?: string
  description: Localized
  /** Image path, when it isn't the `portfolio/<slug>.jpg` default (see catalog/images.ts). */
  imagePath?: string
  featured: boolean
  /**
   * Link to where this was originally posted (a Facebook post, usually). The
   * content itself is copied into our own record — this is only a "see the
   * original" link, so nothing breaks if the post is edited or taken down.
   */
  sourceUrl?: string
}
