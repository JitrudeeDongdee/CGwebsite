import { db, explain } from './client'
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
