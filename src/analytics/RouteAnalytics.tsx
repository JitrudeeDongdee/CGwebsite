import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { gaEnabled, initGa, trackPageView } from './ga'

/**
 * Mount once inside the router. Loads GA (if configured) and reports every route
 * change as a page_view — including the first render, which GA's own automatic
 * page_view is turned off for.
 *
 * Renders nothing.
 */
export function RouteAnalytics() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (gaEnabled) initGa()
  }, [])

  useEffect(() => {
    trackPageView(`${pathname}${search}`)
  }, [pathname, search])

  return null
}
