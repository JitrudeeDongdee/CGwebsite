import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import { HomePage } from './pages/HomePage'
import { MarketingLayout } from './marketing/MarketingLayout'
import { SiteHeader } from './ui/SiteHeader'
import { RouteAnalytics } from './analytics/RouteAnalytics'
import { RouteFallback } from './ui/RouteFallback'

/**
 * Everything except the landing page is code-split.
 *
 * The big win is `DesignerPage`: it is the ONLY route that reaches three.js /
 * react-three-fiber / drei (via `Scene3D`), which is most of the bundle. Someone
 * reading the marketing site should never download a 3D engine they don't open.
 * `HomePage` stays eager on purpose — it is what `/` redirects to, so lazy-loading
 * it would just add a round trip before the first paint.
 */
const DesignerPage = lazy(() => import('./pages/DesignerPage').then((m) => ({ default: m.DesignerPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminPortfolioPage = lazy(() =>
  import('./pages/AdminPortfolioPage').then((m) => ({ default: m.AdminPortfolioPage })),
)
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))

/**
 * Chrome for the app routes (designer / admin / login): the shared `SiteHeader`
 * plus a fixed-height column the designer's own scroll lives inside. Marketing
 * routes use `MarketingLayout`, which mounts the SAME header — so the top bar is
 * one unified component everywhere.
 */
function AppShell() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </Box>
  )
}

/** `/services/:service` → `/home/:service` (the route these pages used to live at). */
function ServiceRedirect() {
  const { service } = useParams()
  return <Navigate to={`/home/${service}`} replace />
}

function App() {
  return (
    <>
      {/* Reports SPA route changes to GA4; inert unless VITE_GA_ID is set. */}
      <RouteAnalytics />
    <Routes>
      <Route element={<MarketingLayout />}>
        {/* The house line is the landing page — `/home` is kept as an alias for it. */}
        <Route path="/home" element={<Navigate to="/home/house" replace />} />
        {/* Each service line gets the same home layout with its own content. */}
        <Route path="/home/:service" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        {/* The category is in the path so the page can show service-specific CTAs. */}
        <Route path="/portfolio/:service/:slug" element={<ProjectDetailPage />} />
        {/* Links made before that change (and any typed by hand) still resolve. */}
        <Route path="/portfolio/:slug" element={<ProjectDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route path="/design" element={<DesignerPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/portfolio" element={<AdminPortfolioPage />} />
      </Route>

      {/* Old service URLs, before they moved under /home. */}
      <Route path="/services/:service" element={<ServiceRedirect />} />

      {/* Landing on / goes to the marketing home; the designer tool lives at /design. */}
      <Route path="/" element={<Navigate to="/home/house" replace />} />
      <Route path="*" element={<Navigate to="/home/house" replace />} />
    </Routes>
    </>
  )
}

export default App
