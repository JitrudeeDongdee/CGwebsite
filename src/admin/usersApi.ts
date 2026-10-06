import { db, explain } from './client'
import { supabase } from '../supabase/client'
import type { StaffRole } from '../auth/AuthProvider'

/**
 * Who can sign in, and what they may do.
 *
 * Reading is open to any staff member (`profiles_self_read` covers it); only an
 * admin can change a role, which is enforced by `profiles_admin_update` in
 * migration `20260913140000`.
 */
export interface ProfileRow {
  id: string
  email: string | null
  role: StaffRole
  created_at: string
}

export async function listProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('id,email,role,created_at')
    .order('created_at', { ascending: true })
  if (error) throw explain(error, 'โหลดรายชื่อผู้ใช้')
  return (data ?? []) as ProfileRow[]
}

/**
 * Grants or revokes a role.
 *
 * `.select()` is not decoration here. Without an UPDATE policy PostgREST
 * answers **200 with an empty array** — the write matched no rows and said so
 * only by returning nothing. A UI that ignored the body would report success
 * for a change that never happened, which is how the missing policy went
 * unnoticed in the first place. So: no rows back means it did not happen, and
 * the person is told exactly why.
 */
export async function setRole(id: string, role: StaffRole): Promise<ProfileRow> {
  const { data, error } = await db().from('profiles').update({ role }).eq('id', id).select()
  if (error) throw explain(error, 'เปลี่ยนสิทธิ์')
  if (!data || data.length === 0) {
    throw new Error(
      'เปลี่ยนสิทธิ์ไม่ได้: ฐานข้อมูลปฏิเสธการแก้ไข — ยังไม่ได้รัน migration ' +
        '20260913140000_admin_manages_roles.sql หรือบัญชีนี้ไม่ใช่ admin',
    )
  }
  return data[0] as ProfileRow
}

// --- Auth-admin operations, via the /api/admin-users Pages Function ----------
// These need the service_role key, which can't be in the browser, so they go
// through a server endpoint that re-checks the caller is an admin.

/** A user as the auth-admin endpoint returns it (richer than `profiles`). */
export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  role: StaffRole
  createdAt: string | null
  lastSignInAt: string | null
  confirmed: boolean
}

/** POST an action to the admin endpoint with the caller's own access token. */
async function callAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('ไม่ได้เข้าสู่ระบบ')
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  // The endpoint always answers JSON; a non-JSON body means the function isn't
  // deployed (or the SPA fallback served index.html) — say so clearly.
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    throw new Error('ไม่พบบริการจัดการผู้ใช้ (ยังไม่ได้ deploy ฟังก์ชัน /api/admin-users)')
  }
  if (!res.ok) throw new Error((json as { error?: string })?.error || `ทำรายการไม่สำเร็จ (${res.status})`)
  return json as T
}

/** Full user list from the auth-admin endpoint (names, last sign-in, confirmed). */
export async function listAuthUsers(): Promise<AuthUser[]> {
  const { users } = await callAdmin<{ users: AuthUser[] }>('list')
  return users
}

/** Invite a brand-new user by email (they get a link to set their password). */
export async function inviteUser(email: string): Promise<void> {
  await callAdmin('invite', { email })
}

/** Send a password reset / set-password email to an existing user. */
export async function sendPasswordReset(email: string): Promise<void> {
  await callAdmin('reset', { email })
}

/** Change a user's email (confirmed immediately — an admin vouches for it). */
export async function updateUserEmail(id: string, email: string): Promise<void> {
  await callAdmin('updateEmail', { id, email })
}

/** Change a user's display name (stored in auth user metadata). */
export async function updateUserName(id: string, name: string): Promise<void> {
  await callAdmin('updateName', { id, name })
}
