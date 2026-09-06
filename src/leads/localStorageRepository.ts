import type { Lead, LeadRepository, LeadStatus } from './types'
import { supabase } from '../supabase/client'
import { SupabaseLeadRepository } from './supabaseRepository'

const STORAGE_KEY = 'cg:leads'

/**
 * Phase 1 storage: everything stays in this browser. Enough to build and
 * demo the full submit -> dashboard flow without a backend.
 *
 * Deliberately behind LeadRepository and async even though localStorage is
 * synchronous, so swapping in Supabase later is a one-file change with no
 * UI churn. Note for that migration: leads hold personal data (name, phone,
 * email), so the real backend needs row-level access rules — right now this
 * data never leaves the customer's own browser, which is why it is
 * acceptable here.
 */
export class LocalStorageLeadRepository implements LeadRepository {
  private read(): Lead[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Lead[]) : []
    } catch {
      return []
    }
  }

  private write(leads: Lead[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
  }

  list(): Promise<Lead[]> {
    const leads = this.read()
    leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return Promise.resolve(leads)
  }

  create(input: Omit<Lead, 'id' | 'createdAt' | 'status'>): Promise<Lead> {
    const lead: Lead = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'new',
    }
    this.write([...this.read(), lead])
    return Promise.resolve(lead)
  }

  updateStatus(id: string, status: LeadStatus): Promise<void> {
    this.write(this.read().map((lead) => (lead.id === id ? { ...lead, status } : lead)))
    return Promise.resolve()
  }
}

/**
 * The repository the app uses: Postgres when Supabase is configured, this
 * browser otherwise. Kept here so every existing import keeps working.
 */
export const leadRepository: LeadRepository = supabase
  ? new SupabaseLeadRepository()
  : new LocalStorageLeadRepository()
