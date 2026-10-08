import { useTranslation } from 'react-i18next'
import data from './articles.json'
import type { Localized, ProductCategory } from '../catalog/types'

/**
 * Knowledge articles (`/articles`, `/articles/:slug`) — **edit `articles.json`**.
 *
 * Plain JSON rather than a database table because `scripts/prerender.mjs` and
 * `scripts/generate-seo-files.mjs` read the same file to write each article's
 * static HTML and sitemap entry; neither script imports TypeScript, so a `.ts`
 * source would have to be copied into them by hand and would drift.
 *
 * An article is written to answer something people actually search before they
 * hire anyone ("On Grid ต่างกับ Off Grid ยังไง"), then point at the real jobs and
 * products that back it up through `related`. Keep prices out of the text until
 * the company has confirmed real figures.
 */
export interface ArticleSection {
  heading: Localized
  body?: { th: string[]; en: string[] }
  bullets?: { th: string[]; en: string[] }
}

export interface Article {
  slug: string
  /** ISO date (YYYY-MM-DD) — shown on the page and used as the sitemap lastmod. */
  published: string
  category: ProductCategory
  title: Localized
  description: Localized
  sections: ArticleSection[]
  related: { to: string; label: Localized }[]
}

export const ARTICLES: Article[] = (data as Article[])
  .slice()
  .sort((a, b) => b.published.localeCompare(a.published))

export function getArticle(slug: string | undefined): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}

/** Formats an ISO date for the active language (Thai uses the Buddhist year). */
export function useArticleDate() {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'en' ? 'en-GB' : 'th-TH'
  return (iso: string) =>
    new Date(`${iso}T00:00:00+07:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' })
}
