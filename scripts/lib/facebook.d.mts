// Types for facebook.mjs (plain ESM, runs under node with no build step) — they
// exist so the type-checked vite-dev-api.mts can import it.
export interface PostPreview {
  type?: string
  title?: string
  description?: string
  imageUrl?: string
  canonicalUrl?: string
  /** ISO date from article:published_time, when Facebook provides one. */
  publishedTime?: string
}
export function fetchPostPreview(url: string): Promise<PostPreview>
export function downloadImage(imageUrl: string): Promise<{ body: Buffer; contentType: string }>
