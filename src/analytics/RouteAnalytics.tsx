import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { gaEnabled, disableGa, initGa, trackPageView } from './ga'
import { CONSENT_EVENT, consentGranted, type ConsentRecord } from '../consent/consent'

/**
 * Mount once inside the router. Loads GA **only after consent** and reports
 * every route change as a page_view — including the first render, which GA's
 * own automatic page_view is turned off for.
 *
 * Opt-in, not opt-out: PDPA treats analytics as processing that needs consent
 * BEFORE it happens, so an undecided visitor is treated exactly like one who
 * declined. Nothing loads, nothing is sent.
 *
 * Renders nothing.
 */
export function RouteAnalytics() {
  const { pathname, search } = useLocation()
  const [allowed, setAllowed] = useState(false)

  // The stored choice is only readable in the browser, so it is read after mount
  // (the prerenderer has no localStorage), and again whenever it changes — a
  // visitor who accepts gets analytics from that moment, with no reload.
  useEffect(() => {
    setAllowed(consentGranted())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentRecord | null>).detail
      if (detail) setAllowed(detail.choice === 'granted')
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (!gaEnabled) return
    if (allowed) initGa()
    // Withdrawing consent cannot unload a script that is already in the page, so
    // GA's own opt-out flag is set instead and its cookies are cleared. From
    // here on it collects nothing; a reload leaves no trace of it at all.
    else disableGa()
  }, [allowed])

  useEffect(() => {
    if (allowed) trackPageView(`${pathname}${search}`)
  }, [allowed, pathname, search])

  return null
}
