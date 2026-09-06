import { supabase } from '../supabase/client'
import type { Lead, LeadContact, LeadRepository, LeadStatus } from './types'

/**
 * Leads in Postgres. RLS decides who may do what (see the init migration):
 * anyone may INSERT — that is the public form — but only a signed-in staff
 * account may read or update. So `create` works for a visitor while `list`
 * legitimately comes back empty for one; that is the policy working, not a bug.
 */
export class SupabaseLeadRepository implements LeadRepository {
  private get db() {
    if (!supabase) throw new Error('supabase is not configured')
    return supabase
  }

  async list(): Promise<Lead[]> {
    const { data, error } = await this.db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(
      (row): Lead => ({
        id: row.id as string,
        contact: {
          name: row.name ?? '',
          phone: row.phone ?? '',
          email: row.email ?? '',
          province: row.province ?? '',
          timeline: row.timeline ?? '',
        } satisfies LeadContact,
        status: row.status as LeadStatus,
        createdAt: row.created_at as string,
        plan: row.plan,
        grade: row.grade,
        estimate: row.estimate,
      }),
    )
  }

  async create(input: Omit<Lead, 'id' | 'createdAt' | 'status'>): Promise<Lead> {
    const { data, error } = await this.db
      .from('leads')
      .insert({
        name: input.contact.name,
        phone: input.contact.phone,
        email: input.contact.email || null,
        province: input.contact.province || null,
        timeline: input.contact.timeline || null,
        plan: input.plan,
        grade: input.grade,
        estimate: input.estimate,
      })
      // A visitor may insert but not select, so asking for the row back would
      // fail the policy. Build the returned Lead locally instead.
      .select('id, created_at')
      .maybeSingle()
    if (error) throw error
    return {
      ...input,
      id: (data?.id as string) ?? crypto.randomUUID(),
      createdAt: (data?.created_at as string) ?? new Date().toISOString(),
      status: 'new',
    }
  }

  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    const { error } = await this.db.from('leads').update({ status }).eq('id', id)
    if (error) throw error
  }
}
