/**
 * GA4 visitor-stats endpoint — a Cloudflare Pages Function.
 *
 * The GA4 Data API is read with a Google **service-account** key, which must
 * never reach the browser. So, exactly like `admin-users.ts`, the browser calls
 * `/api/ga-stats` with the signed-in user's own access token, this function
 * verifies that token AND that the caller is an `admin` in `public.profiles`,
 * and only then talks to Google.
 *
 * It is deliberately dependency-free: the service-account JWT is signed with
 * WebCrypto (`crypto.subtle`, available in the Workers runtime), so nothing like
 * `google-auth-library` or `jsonwebtoken` is pulled into the edge bundle.
 *
 * Deploy: ships automatically with the Pages build (the `functions/` dir). The
 * manual steps are three Production env vars in Cloudflare → Pages → Settings →
 * Environment variables:
 *   - `GA4_PROPERTY_ID`     e.g. 557855535  (the numeric property id, NOT G-…)
 *   - `GA_SA_CLIENT_EMAIL`  the service account's email
 *   - `GA_SA_PRIVATE_KEY`   the service account's private key (a **secret**)
 * The service account must also be granted **Viewer** on the GA4 property
 * (GA → Admin → Property access management). Until all three are set the
 * endpoint returns 503 and the dashboard explains what is missing.
 */

interface Env {
  SUPABASE_URL?: string
  VITE_SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  GA4_PROPERTY_ID?: string
  GA_SA_CLIENT_EMAIL?: string
  GA_SA_PRIVATE_KEY?: string
}

type Ctx = { request: Request; env: Env }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const fail = (status: number, message: string) => json({ error: message }, status)

// --- service-account JWT → Google OAuth access token -------------------------

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToPkcs8(pem: string): ArrayBuffer {
  // A key pasted into a dashboard field often arrives with literal "\n"
  // instead of real newlines — normalise both forms.
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = b64url(
    enc.encode(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  )
  const signingInput = `${header}.${claim}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput))
  const jwt = `${signingInput}.${b64url(new Uint8Array(sig))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })
  const data = (await res.json()) as { access_token?: string; error_description?: string; error?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(`ขอโทเคน Google ไม่สำเร็จ: ${data.error_description || data.error || res.status}`)
  }
  return data.access_token
}

// --- GA4 Data API ------------------------------------------------------------

type GaRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }

async function runReport(token: string, propertyId: string, path: string, body: unknown): Promise<GaRow[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GA4 ${path}: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { rows?: GaRow[] }
  return data.rows ?? []
}

const num = (row: GaRow | undefined, i = 0) => Math.round(Number(row?.metricValues?.[i]?.value ?? 0)) || 0

/** Sessions / users / page-views over one date range (no dimensions → one row). */
async function totals(token: string, pid: string, startDate: string) {
  const rows = await runReport(token, pid, 'runReport', {
    dateRanges: [{ startDate, endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
  })
  const r = rows[0]
  return { users: num(r, 0), sessions: num(r, 1), views: num(r, 2) }
}

const handlePost = async ({ request, env }: Ctx): Promise<Response> => {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''
  const service = env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !anon) return fail(500, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / ANON_KEY)')
  if (!service)
    return fail(503, 'ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน Cloudflare Pages (Production) — เพิ่มแล้ว deploy ใหม่หนึ่งครั้ง')

  // 1) Who is calling? Verify their access token against GoTrue.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return fail(401, 'ไม่ได้เข้าสู่ระบบ')
  const meRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } })
  if (!meRes.ok) return fail(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  const me = (await meRes.json()) as { id?: string }
  if (!me.id) return fail(401, 'ไม่พบผู้ใช้จากเซสชัน')

  // 2) Are they an admin? (service_role read so RLS can't hide it)
  const svc = { apikey: service, authorization: `Bearer ${service}` }
  const roleRes = await fetch(`${url}/rest/v1/profiles?id=eq.${me.id}&select=role`, { headers: svc })
  const roleRows = roleRes.ok ? ((await roleRes.json()) as Array<{ role?: string }>) : []
  if (roleRows[0]?.role !== 'admin') return fail(403, 'ต้องเป็นผู้ดูแล (admin) เท่านั้น')

  // 3) Is GA configured? Name the missing piece so the dashboard can say it.
  const pid = (env.GA4_PROPERTY_ID || '').trim()
  const clientEmail = (env.GA_SA_CLIENT_EMAIL || '').trim()
  const privateKey = env.GA_SA_PRIVATE_KEY || ''
  const missing = [
    !pid && 'GA4_PROPERTY_ID',
    !clientEmail && 'GA_SA_CLIENT_EMAIL',
    !privateKey && 'GA_SA_PRIVATE_KEY',
  ].filter(Boolean)
  if (missing.length)
    return fail(503, `ยังไม่ได้ตั้งค่า ${missing.join(', ')} ใน Cloudflare Pages (Production) แล้ว deploy ใหม่`)

  // 4) Read GA4.
  let accessToken: string
  try {
    accessToken = await getAccessToken(clientEmail, privateKey)
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : 'ขอโทเคน Google ไม่สำเร็จ')
  }

  // Headline numbers are fatal if they fail; the extra breakdowns are
  // best-effort (a wrong item metric name must not blank the whole card).
  let activeUsers = 0
  let last7 = { users: 0, sessions: 0, views: 0 }
  let last28 = { users: 0, sessions: 0, views: 0 }
  try {
    ;[activeUsers, last7, last28] = await Promise.all([
      runReport(accessToken, pid, 'runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }).then((r) => num(r[0])),
      totals(accessToken, pid, '7daysAgo'),
      totals(accessToken, pid, '28daysAgo'),
    ])
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : 'อ่านข้อมูล GA4 ไม่สำเร็จ')
  }

  const topPages = await runReport(accessToken, pid, 'runReport', {
    dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 6,
  })
    .then((rows) => rows.map((r) => ({ path: r.dimensionValues?.[0]?.value ?? '', views: num(r) })))
    .catch(() => [])

  // Which specific products people look at — view_item carries item_name.
  const topProducts = await runReport(accessToken, pid, 'runReport', {
    dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'itemName' }],
    metrics: [{ name: 'itemsViewed' }],
    orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
    limit: 8,
  })
    .then((rows) =>
      rows
        .map((r) => ({ name: r.dimensionValues?.[0]?.value ?? '', views: num(r) }))
        .filter((p) => p.name && p.name !== '(not set)'),
    )
    .catch(() => [])

  return json({ configured: true, activeUsers, last7, last28, topPages, topProducts })
}

// Single catch-all so no method falls through to the SPA fallback.
export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method === 'POST') return handlePost({ request, env })
  return fail(405, 'ใช้ได้เฉพาะ POST')
}
