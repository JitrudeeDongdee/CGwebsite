import { supabase } from '../supabase/client'

const STORAGE_KEY = 'cg:contact-messages'

export interface ContactMessage {
  name: string
  phone: string
  email: string
  message: string
}

/**
 * Sends a contact-form message.
 *
 * With Supabase configured it lands in `contact_messages`, which RLS lets
 * anyone insert into and only staff read back. Without it, the old
 * localStorage behaviour is kept so a checkout with no env still works — but
 * that path reaches nobody, which is why `messagesReachTheTeam` exists: the
 * form must not promise a reply it cannot deliver.
 */
export const messagesReachTheTeam = supabase !== null

export async function sendContactMessage(input: ContactMessage): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('contact_messages').insert({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      message: input.message || null,
    })
    if (error) throw error
    return
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: unknown = raw ? JSON.parse(raw) : []
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...(Array.isArray(list) ? list : []), { ...input, at: new Date().toISOString() }]),
    )
  } catch {
    /* ignore storage errors */
  }
}
