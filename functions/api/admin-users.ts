/**
 * Admin user-management endpoint — a Cloudflare Pages Function.
 *
 * Everything here needs the Supabase **service_role** key, which bypasses RLS
 * and therefore must never reach the browser. So it lives server-side: the
 * browser calls `/api/admin-users` with the signed-in user's own access token,
 * this function verifies that token AND that the caller is an `admin` in
 * `public.profiles`, and only then performs the privileged Auth operation.
 *
 * Deploy: ships automatically with the Pages build (the `functions/` dir). The
 * ONE manual step is setting `SUPABASE_SERVICE_ROLE_KEY` as a Production secret
 * in Cloudflare → the Pages project → Settings → Environment variables. Without
 * it the endpoint returns 503 and the admin UI explains what to do.
 *
 * Deliberately dependency-free (plain `fetch` to GoTrue + PostgREST) so the
 * function bundles tiny and doesn't pull @supabase/supabase-js into the edge.
 */

interface Env {
  SUPABASE_URL?: string
  VITE_SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type Ctx = { request: Request; env: Env }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

const fail = (status: number, message: string) => json({ error: message }, status)

const handlePost = async ({ request, env }: Ctx): Promise<Response> => {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''
  const service = env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !anon) return fail(500, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / ANON_KEY)')
  if (!service)
    return fail(
      503,
      'ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน Cloudflare Pages → Settings → Environment variables (Production) — เพิ่มแล้ว deploy ใหม่หนึ่งครั้ง',
    )

  // 1) Who is calling? Verify their access token against GoTrue.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return fail(401, 'ไม่ได้เข้าสู่ระบบ')
  const meRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, authorization: `Bearer ${token}` },
  })
  if (!meRes.ok) return fail(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  const me = (await meRes.json()) as { id?: string }
  if (!me.id) return fail(401, 'ไม่พบผู้ใช้จากเซสชัน')

  // 2) Are they an admin? (service_role read so RLS can't hide it)
  const svc = { apikey: service, authorization: `Bearer ${service}` }
  const roleRes = await fetch(`${url}/rest/v1/profiles?id=eq.${me.id}&select=role`, { headers: svc })
  const roleRows = roleRes.ok ? ((await roleRes.json()) as Array<{ role?: string }>) : []
  if (roleRows[0]?.role !== 'admin') return fail(403, 'ต้องเป็นผู้ดูแล (admin) เท่านั้น')

  // 3) Do the work.
  let body: { action?: string; id?: string; email?: string; name?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return fail(400, 'รูปแบบคำขอไม่ถูกต้อง')
  }
  const action = body.action
  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/login`

  // PUT a patch onto an auth user via the admin API.
  const adminPatch = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: { ...svc, 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return fail(res.status, `แก้ไขไม่สำเร็จ: ${await res.text()}`)
    return json({ ok: true })
  }

  switch (action) {
    case 'list': {
      const [usersRes, profRes] = await Promise.all([
        fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, { headers: svc }),
        fetch(`${url}/rest/v1/profiles?select=id,role`, { headers: svc }),
      ])
      if (!usersRes.ok) return fail(usersRes.status, `โหลดผู้ใช้ไม่สำเร็จ: ${await usersRes.text()}`)
      const usersJson = (await usersRes.json()) as {
        users?: Array<{
          id: string
          email?: string
          created_at?: string
          last_sign_in_at?: string | null
          email_confirmed_at?: string | null
          confirmed_at?: string | null
          user_metadata?: { full_name?: string; name?: string }
        }>
      }
      const roles = new Map(
        (profRes.ok ? ((await profRes.json()) as Array<{ id: string; role?: string }>) : []).map((r) => [r.id, r.role]),
      )
      const users = (usersJson.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        role: (roles.get(u.id) as string | undefined) ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
      }))
      return json({ users })
    }

    case 'invite': {
      if (!body.email) return fail(400, 'ต้องระบุอีเมล')
      const res = await fetch(`${url}/auth/v1/invite`, {
        method: 'POST',
        headers: { ...svc, 'content-type': 'application/json' },
        body: JSON.stringify({ email: body.email, data: {}, redirect_to: redirectTo }),
      })
      if (!res.ok) return fail(res.status, `เชิญผู้ใช้ไม่สำเร็จ: ${await res.text()}`)
      return json({ ok: true })
    }

    case 'reset': {
      if (!body.email) return fail(400, 'ต้องระบุอีเมล')
      // `recover` sends a reset email; it uses the anon key, not service_role.
      const res = await fetch(`${url}/auth/v1/recover`, {
        method: 'POST',
        headers: { apikey: anon, 'content-type': 'application/json' },
        body: JSON.stringify({ email: body.email, redirect_to: redirectTo }),
      })
      if (!res.ok) return fail(res.status, `ส่งอีเมลรีเซ็ตไม่สำเร็จ: ${await res.text()}`)
      return json({ ok: true })
    }

    case 'updateEmail': {
      if (!body.id || !body.email) return fail(400, 'ต้องระบุผู้ใช้และอีเมลใหม่')
      // email_confirm: true — an admin vouches for the address, so it is valid
      // immediately without a round-trip confirmation email.
      return adminPatch(body.id, { email: body.email, email_confirm: true })
    }

    case 'updateName': {
      if (!body.id) return fail(400, 'ต้องระบุผู้ใช้')
      const name = (body.name ?? '').trim()
      return adminPatch(body.id, { user_metadata: { full_name: name, name } })
    }

    default:
      return fail(400, `ไม่รู้จักคำสั่ง: ${action ?? '(ว่าง)'}`)
  }
}

// Single catch-all handler so no method falls through to the SPA fallback.
export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method === 'POST') return handlePost({ request, env })
  return fail(405, 'ใช้ได้เฉพาะ POST')
}
