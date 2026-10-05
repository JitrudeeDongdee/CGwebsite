import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase browser client, or `null` when the project isn't configured.
 *
 * `null` is a supported state, not an error: without the two env vars the app
 * falls back to the bundled seed catalog and keeps working (see
 * `catalog/repository.ts`). That is what makes a fresh checkout, a preview build
 * and CI all run with no secrets.
 *
 * The anon key is *meant* to be public — it identifies the project, it does not
 * grant anything. Every permission is decided by RLS in the database
 * (supabase/migrations/0001_init.sql). Never put the service_role key here: it
 * bypasses RLS entirely and would be readable by anyone who opens devtools.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const supabaseEnabled = supabase !== null

/**
 * The canonical public origin for links that leave the app and must come back —
 * the sign-up confirmation and password-reset e-mails. On the deployed site the
 * running origin already IS the real site, but a sign-up started from a local dev
 * server would otherwise bake `http://localhost:…` into the e-mail, so a
 * `VITE_SITE_URL` override takes precedence when set. (It must also be on
 * Supabase's redirect allow-list, or the link falls back to the project's Site URL.)
 */
export function siteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined
  const base = configured && configured.trim() ? configured : window.location.origin
  return base.replace(/\/$/, '')
}
