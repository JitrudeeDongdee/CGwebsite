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
  return project.images?.[0] ?? project.imagePath ?? `portfolio/${projectRef(project)}.jpg`
}

/**
 * Every photo of a project, cover first. Falls back to the single cover so a row
 * saved before galleries existed still shows its one image.
 */
export function projectImagePaths(project: Project): string[] {
  if (project.images?.length) return project.images
  return [projectImagePath(project)]
}

/**
 * What identifies a project in a URL: its slug when it has one, else its id.
 *
 * The slug is a display choice and can be edited or left empty; the row's
 * identity is its uuid. Anything that resolves a project accepts either
 * (see `useProject`).
 */
export function projectRef(project: Project): string {
  return project.slug || project.id
}

/**
 * A project's page URL: `/portfolio/<category>/<slug or id>`.
 *
 * The category sits in the path so the detail page can show the right calls to
 * action (design a house vs. talk to us) and link back to that service's home
 * without a lookup. An older `/portfolio/<ref>` URL redirects here.
 */
export function projectPath(project: Project): string {
  return `/portfolio/${project.category}/${projectRef(project)}`
}
