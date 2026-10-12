/**
 * Contact-message notifier — a Cloudflare Pages Function.
 *
 * A Supabase **Database Webhook** on `public.contact_messages` (event: INSERT)
 * POSTs the new row here, and this function fans it out to the team over two
 * independent channels:
 *   - **e-mail** via the Brevo transactional API → contact@thaidongdee.com
 *   - **LINE** via the Messaging API → the staff group/room/user(s)
 *
 * Why a webhook and not a change to the form: the browser already inserts the
 * row directly (RLS lets anyone insert, only staff read). Firing from the DB
 * means every message is covered no matter where the insert came from, and the
 * Brevo key + LINE token never touch the browser bundle — the same shape as
 * `admin-users.ts` / `ga-stats.ts`.
 *
 * It is deliberately dependency-free (plain `fetch`), so nothing is pulled into
 * the edge bundle.
 *
 * Each channel is **best-effort and independent**: a channel whose env vars are
 * missing is skipped, and one channel failing never blocks the other. The
 * request is authenticated by a shared secret header so the endpoint cannot be
 * used to spam the team.
 *
 * ── Deploy (all Production env vars in Cloudflare → Pages → Settings →
 *    Environment variables; the keys/tokens as SECRETS; none use a VITE_ prefix):
 *   - `CONTACT_WEBHOOK_SECRET`      a random string; also set as the webhook's
 *                                   `x-webhook-secret` header in Supabase.
 *   E-mail (Brevo):
 *   - `BREVO_API_KEY`              a Brevo (v3) API key.
 *   - `NOTIFY_EMAIL_TO`            where the alert goes (e.g. contact@thaidongdee.com).
 *   - `NOTIFY_EMAIL_FROM`          a Brevo-verified sender address.
 *   - `NOTIFY_EMAIL_FROM_NAME`     optional display name for the sender.
 *   LINE (Messaging API):
 *   - `LINE_CHANNEL_ACCESS_TOKEN`  a long-lived channel access token.
 *   - `LINE_NOTIFY_TO`             one or more push targets (group/room/user id),
 *                                  comma- or newline-separated. REQUIRED for LINE
 *                                  — without it LINE is skipped (we never
 *                                  broadcast to the OA's followers by accident).
 *
 * Then create the webhook in Supabase → Database → Webhooks: table
 * `contact_messages`, event Insert, type HTTP Request, URL
 * `https://thaidongdee.com/api/notify-contact`, HTTP header
 * `x-webhook-secret: <CONTACT_WEBHOOK_SECRET>`.
 */

interface Env {
  CONTACT_WEBHOOK_SECRET?: string
  BREVO_API_KEY?: string
  NOTIFY_EMAIL_TO?: string
  NOTIFY_EMAIL_FROM?: string
  NOTIFY_EMAIL_FROM_NAME?: string
  LINE_CHANNEL_ACCESS_TOKEN?: string
  LINE_NOTIFY_TO?: string
}

type Ctx = { request: Request; env: Env }

/** The row Supabase sends under `record` (nullable columns may be absent). */
interface ContactRecord {
  id?: string
  name?: string | null
  organization?: string | null
  phone?: string | null
  email?: string | null
  subject?: string | null
  message?: string | null
  created_at?: string | null
}

interface WebhookPayload {
  type?: string
  table?: string
  schema?: string
  record?: ContactRecord
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

/** Length-independent-ish string compare for the shared secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const clean = (v: string | null | undefined): string => (v ?? '').trim()

/** A plain-text summary shared by both channels. */
function summarize(r: ContactRecord): { subject: string; lines: string[] } {
  const name = clean(r.name) || '(ไม่ระบุชื่อ)'
  const subjectLine = clean(r.subject) || 'ข้อความติดต่อใหม่'
  const lines: string[] = []
  lines.push(`ชื่อ: ${name}`)
  if (clean(r.organization)) lines.push(`บริษัท/หน่วยงาน: ${clean(r.organization)}`)
  if (clean(r.phone)) lines.push(`โทร: ${clean(r.phone)}`)
  if (clean(r.email)) lines.push(`อีเมล: ${clean(r.email)}`)
  if (clean(r.subject)) lines.push(`หัวข้อ: ${clean(r.subject)}`)
  if (clean(r.message)) lines.push('', 'ข้อความ:', clean(r.message))
  return { subject: subjectLine, lines }
}

async function sendEmail(env: Env, r: ContactRecord): Promise<{ ok: boolean; skipped?: boolean; detail?: string }> {
  const key = clean(env.BREVO_API_KEY)
  const to = clean(env.NOTIFY_EMAIL_TO)
  const from = clean(env.NOTIFY_EMAIL_FROM)
  if (!key || !to || !from) return { ok: false, skipped: true, detail: 'email env not set' }

  const { subject, lines } = summarize(r)
  const body: Record<string, unknown> = {
    sender: { email: from, name: clean(env.NOTIFY_EMAIL_FROM_NAME) || 'เว็บไซต์ไทยดวงดี' },
    to: [{ email: to }],
    subject: `[ติดต่อเรา] ${subject}`,
    textContent: lines.join('\n'),
  }
  // Let staff reply straight to the customer when they left an address.
  if (clean(r.email)) body.replyTo = { email: clean(r.email), name: clean(r.name) || undefined }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return { ok: false, detail: `brevo ${res.status}: ${(await res.text()).slice(0, 300)}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

async function sendLine(env: Env, r: ContactRecord): Promise<{ ok: boolean; skipped?: boolean; detail?: string }> {
  const token = clean(env.LINE_CHANNEL_ACCESS_TOKEN)
  const targets = clean(env.LINE_NOTIFY_TO)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  // No target → skip. We never fall back to broadcast: that would message the
  // OA's customers, not the team.
  if (!token || targets.length === 0) return { ok: false, skipped: true, detail: 'line env not set' }

  const { subject, lines } = summarize(r)
  const text = `📩 ${subject}\n\n${lines.join('\n')}`.slice(0, 4900) // LINE text cap is 5000
  const results: string[] = []
  let anyOk = false
  for (const to of targets) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
      })
      if (res.ok) anyOk = true
      else results.push(`${to.slice(0, 6)}… ${res.status}: ${(await res.text()).slice(0, 160)}`)
    } catch (e) {
      results.push(`${to.slice(0, 6)}… ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return anyOk ? { ok: true, detail: results.join(' | ') || undefined } : { ok: false, detail: results.join(' | ') }
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // The endpoint must be authenticated, or anyone could spam the team. Refuse
  // outright if the secret is not configured rather than running open.
  const secret = clean(env.CONTACT_WEBHOOK_SECRET)
  if (!secret) return json({ error: 'notifier not configured' }, 503)
  const given = clean(request.headers.get('x-webhook-secret'))
  if (!given || !safeEqual(given, secret)) return json({ error: 'unauthorized' }, 401)

  let payload: WebhookPayload
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  // Only act on inserts into contact_messages; anything else is a no-op 200 so
  // the webhook is not retried.
  const record = payload?.record
  if (payload?.type && payload.type !== 'INSERT') return json({ ok: true, ignored: payload.type })
  if (!record || typeof record !== 'object') return json({ ok: true, ignored: 'no record' })

  const [email, line] = await Promise.all([sendEmail(env, record), sendLine(env, record)])
  // Always 200 once authenticated: a channel failure is reported in the body
  // but must not trigger endless webhook retries that would re-spam whatever
  // did work.
  return json({ ok: true, email, line })
}
