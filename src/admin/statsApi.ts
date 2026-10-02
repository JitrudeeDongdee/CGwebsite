import { db, explain } from './client'

/**
 * Numbers for the back-office dashboard.
 *
 * Every figure is a `head: true` COUNT, so a dashboard that reads eleven totals
 * still transfers no rows — the alternative (fetch everything, count in JS)
 * would grow with the catalogue and shift the work onto a phone.
 *
 * Reads go through RLS as the signed-in staff member, so the unpublished rows
 * counted here are exactly the ones that person is allowed to see.
 */
export interface AdminStats {
  products: { total: number; published: number; noPhoto: number }
  projects: { total: number; published: number; noYear: number }
  community: { total: number; published: number }
  messages: { total: number; unhandled: number }
}

/** Counts rows matching `apply`, transferring none of them. */
async function count(table: string, apply: (q: ReturnType<typeof baseQuery>) => unknown): Promise<number> {
  const query = baseQuery(table)
  apply(query)
  const { count: n, error } = (await query) as { count: number | null; error: unknown }
  if (error) throw explain(error, `นับข้อมูลใน ${table}`)
  return n ?? 0
}

function baseQuery(table: string) {
  return db().from(table).select('*', { count: 'exact', head: true })
}

export async function loadAdminStats(): Promise<AdminStats> {
  // One round of parallel counts rather than a waterfall: they are independent,
  // and serially this is eleven round trips of latency for no reason.
  const [
    productsTotal,
    productsPublished,
    productsNoPhoto,
    projectsTotal,
    projectsPublished,
    projectsNoYear,
    communityTotal,
    communityPublished,
    messagesTotal,
    messagesUnhandled,
  ] = await Promise.all([
    count('products', (q) => q),
    count('products', (q) => q.eq('published', true)),
    // `image_path` is the cover; a row without one renders the category
    // placeholder on the public site.
    count('products', (q) => q.is('image_path', null)),
    // `kind` is null on rows created before the column existed, so "a project"
    // is "not community" rather than "kind = project".
    count('projects', (q) => q.neq('kind', 'community')),
    count('projects', (q) => q.neq('kind', 'community').eq('published', true)),
    count('projects', (q) => q.neq('kind', 'community').or('year.is.null,year.eq.')),
    count('projects', (q) => q.eq('kind', 'community')),
    count('projects', (q) => q.eq('kind', 'community').eq('published', true)),
    count('contact_messages', (q) => q),
    count('contact_messages', (q) => q.eq('handled', false)),
  ])

  return {
    products: { total: productsTotal, published: productsPublished, noPhoto: productsNoPhoto },
    projects: { total: projectsTotal, published: projectsPublished, noYear: projectsNoYear },
    community: { total: communityTotal, published: communityPublished },
    messages: { total: messagesTotal, unhandled: messagesUnhandled },
  }
}

export interface RecentEdit {
  id: string
  title: string
  table: 'products' | 'projects'
  updatedAt: string
  published: boolean
}

/** The last few things anyone changed, newest first. */
export async function loadRecentEdits(limit = 6): Promise<RecentEdit[]> {
  const [products, projects] = await Promise.all([
    db().from('products').select('id,name,published,updated_at').order('updated_at', { ascending: false }).limit(limit),
    db().from('projects').select('id,title,published,updated_at').order('updated_at', { ascending: false }).limit(limit),
  ])
  if (products.error) throw explain(products.error, 'โหลดสินค้าที่แก้ล่าสุด')
  if (projects.error) throw explain(projects.error, 'โหลดผลงานที่แก้ล่าสุด')

  const rows: RecentEdit[] = [
    ...(products.data ?? []).map((r) => ({
      id: r.id as string,
      title: (r.name as { th?: string } | null)?.th ?? '(ไม่มีชื่อ)',
      table: 'products' as const,
      updatedAt: r.updated_at as string,
      published: Boolean(r.published),
    })),
    ...(projects.data ?? []).map((r) => ({
      id: r.id as string,
      title: (r.title as { th?: string } | null)?.th ?? '(ไม่มีชื่อ)',
      table: 'projects' as const,
      updatedAt: r.updated_at as string,
      published: Boolean(r.published),
    })),
  ]
  // Merged from two tables, so the ordering has to be redone across both.
  return rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, limit)
}
