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

/**
 * One post documenting a project — several of them make its timeline.
 *
 * Each update carries its own photos and its own words; the project around them
 * (id/slug, title, year, category) is shared.
 */
export interface ProjectSource {
  /** The post this update came from. Optional: an update can keep its photos and
   *  words after the link is removed. */
  url?: string
  /** What this update was, e.g. "ลงเสาเข็ม". Optional. */
  label?: string
  /** This update's own text. Optional — the label alone is often enough. */
  caption?: Localized
  /** This update's own photos, as paths in the catalog bucket. */
  images?: string[]
}

/**
 * `project` rows are portfolio work (shown on /portfolio and the service homes);
 * `community` rows are public-benefit works & donations (ผลงานสาธารณประโยชน์และ
 * การบริจาค — shown on /home/house and /community, never in the product/portfolio
 * listings). Same shape, so they share the admin editor and Storage gallery.
 */
export type ProjectKind = 'project' | 'community'

export interface Project {
  /** Stable identity. Used in URLs when there is no slug. */
  id: string
  /** What this row is and where it shows. Absent (older rows / seed) means 'project'. */
  kind?: ProjectKind
  /** Optional pretty URL segment; may be empty, and may be edited at any time. */
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
  /** The whole gallery, in display order, cover first. `imagePath` mirrors the cover. */
  images?: string[]
  featured: boolean
  /**
   * Link to where this was originally posted (a Facebook post, usually). The
   * content itself is copied into our own record — this is only a "see the
   * original" link, so nothing breaks if the post is edited or taken down.
   * Mirrors `sources[0]`.
   */
  sourceUrl?: string
  /** Every post about this job, oldest first — rendered as a timeline. */
  sources?: ProjectSource[]
  /**
   * The product/service this job delivered, when there is one — a fibre-optic
   * install is the same service the catalogue sells. Lets a visitor go from
   * "you did this" to "you can do this for me".
   */
  productId?: string
}
