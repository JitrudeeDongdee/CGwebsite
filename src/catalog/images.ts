import type { Product, Project } from './types'

/**
 * The image path for a catalog row.
 *
 * `imagePath` (DB column `image_path`) wins when set; otherwise the convention
 * the seed content has always used — `products/<slug>.jpg`, `portfolio/<slug>.jpg`
 * — which resolves to the Storage bucket or to `public/` depending on whether
 * Supabase is configured (see `supabase/storage.ts`). So a row needs an explicit
 * path only when its file is named something else.
 */
export function productImagePath(product: Product): string {
  return product.imagePath ?? `products/${product.slug}.jpg`
}

export function projectImagePath(project: Project): string {
  return project.imagePath ?? `portfolio/${project.slug}.jpg`
}

/**
 * A project's page URL: `/portfolio/<category>/<slug>`.
 *
 * The category sits in the path so the detail page can show the right calls to
 * action (design a house vs. talk to us) and link back to that service's home
 * without a lookup. `/portfolio/<slug>` still works and redirects here.
 */
export function projectPath(project: Project): string {
  return `/portfolio/${project.category}/${project.slug}`
}
