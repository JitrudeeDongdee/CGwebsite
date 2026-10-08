import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../supabase/client'
import {
  COMPANY_FALLBACK,
  certificateFromRow,
  companyFromRow,
  isExpired,
  type Certificate,
  type CertificateRow,
  type CompanyInfo,
  type CompanyInfoRow,
} from '../content/company'

/**
 * Company registration facts + trust documents, loaded once for the public site.
 *
 * Same shape as `CatalogProvider`: it starts from the bundled fallback so the
 * About page never paints empty, and it KEEPS that fallback when the fetch
 * fails — which is also what happens before the `company_info` migration is
 * applied (PostgREST answers 404 for a table that does not exist). So the code
 * and the migration can ship in either order.
 *
 * `initial` is for the prerenderer: `useEffect` never runs there, and without it
 * the static About page would carry no certificates.
 */
export interface InitialCompany {
  /** `null` when the build could not read `company_info` — render the fallback. */
  info: CompanyInfo | null
  certificates: Certificate[]
}

interface CompanyValue {
  info: CompanyInfo
  certificates: Certificate[]
  source: 'fallback' | 'supabase'
}

const CompanyContext = createContext<CompanyValue | null>(null)

/**
 * What a visitor may see. RLS already hides unpublished rows from the public,
 * but a signed-in staff member's session can read them — filter here too, or
 * staff would see drafts on the live About page and think they were published.
 */
function publicCertificates(rows: CertificateRow[]): Certificate[] {
  return rows.filter((r) => r.published).map(certificateFromRow).filter((c) => !isExpired(c))
}

export function CompanyProvider({ children, initial }: { children: ReactNode; initial?: InitialCompany }) {
  const [info, setInfo] = useState<CompanyInfo>(initial?.info ?? COMPANY_FALLBACK)
  const [certificates, setCertificates] = useState<Certificate[]>(initial?.certificates ?? [])
  const [source, setSource] = useState<'fallback' | 'supabase'>(initial?.info ? 'supabase' : 'fallback')

  useEffect(() => {
    if (initial || !supabase) return
    let cancelled = false
    void (async () => {
      const [company, certs] = await Promise.all([
        supabase.from('company_info').select('*').eq('id', 1).maybeSingle(),
        supabase.from('certificates').select('*').order('sort_order').order('created_at'),
      ])
      if (cancelled) return
      if (company.error || certs.error) {
        // Expected until the migration is applied; anything else is still not
        // worth blanking the legal block over.
        console.warn('[company] keeping the bundled fallback:', company.error ?? certs.error)
      }
      if (company.data) {
        setInfo(companyFromRow(company.data as CompanyInfoRow))
        setSource('supabase')
      }
      if (certs.data) {
        setCertificates(publicCertificates(certs.data as CertificateRow[]))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  const value = useMemo(() => ({ info, certificates, source }), [info, certificates, source])
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export function useCompany(): CompanyValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used inside <CompanyProvider>')
  return ctx
}
