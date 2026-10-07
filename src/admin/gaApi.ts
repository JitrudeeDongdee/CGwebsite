import { supabase } from '../supabase/client'

/**
 * GA4 visitor stats for the dashboard, read through the `/api/ga-stats` Pages
 * Function (the Google service-account key can't live in the browser).
 *
 * `configured: false` is a normal state, not an error: it means the GA env vars
 * aren't set on Cloudflare yet, and `reason` carries the specific message so the
 * dashboard can tell the admin exactly what to do rather than show a dead card.
 */
export interface GaTotals {
  users: number
  sessions: number
  views: number
}

export interface GaStats {
  configured: true
  activeUsers: number
  last7: GaTotals
  last28: GaTotals
  topPages: Array<{ path: string; views: number }>
  topProducts: Array<{ name: string; views: number }>
}

export type GaStatsResult = GaStats | { configured: false; reason: string }

export async function loadGaStats(): Promise<GaStatsResult> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('ไม่ได้เข้าสู่ระบบ')

  const res = await fetch('/api/ga-stats', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: '{}',
  })

  // The endpoint always answers JSON; a non-JSON body means the function isn't
  // deployed (the SPA fallback served index.html) — treat it as "not set up".
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    return { configured: false, reason: 'ยังไม่ได้ deploy ฟังก์ชัน /api/ga-stats' }
  }

  // 503 = configured-but-incomplete (missing env vars); its message names them.
  if (res.status === 503) return { configured: false, reason: (json as { error?: string })?.error || 'ยังไม่ได้ตั้งค่า GA4' }
  if (!res.ok) throw new Error((json as { error?: string })?.error || `อ่านสถิติไม่สำเร็จ (${res.status})`)
  return json as GaStats
}
