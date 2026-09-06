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
const AdminHomePage = lazy(() => import('./pages/AdminHomePage').then((m) => ({ default: m.AdminHomePage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
// The two admin portfolio screens. Guarding the dynamic import behind
// `import.meta.env.DEV` (statically `false` in a prod build) puts the `import()`
// in a dead branch, so Rollup drops both chunks from the deployed bundle — the
// routes below are gated the same way. They need `/api/*` from
// `vite-dev-api.mts`, which only runs under `pnpm run dev`.
const AdminPortfolioListPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminPortfolioListPage').then((m) => ({ default: m.AdminPortfolioListPage })))
  : undefined
const AdminPortfolioEditPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminPortfolioEditPage').then((m) => ({ default: m.AdminPortfolioEditPage })))
  : undefined
const AdminProductListPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminProductListPage').then((m) => ({ default: m.AdminProductListPage })))
  : undefined
const AdminProductEditPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AdminProductEditPage').then((m) => ({ default: m.AdminProductEditPage })))
  : undefined
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })))

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
        {/* Public-benefit works & donations — its own public page (reads published
            community rows through the anon client, so it works in production too). */}
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route path="/design" element={<DesignerPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Admin home lists the modules; the legacy leads table moves to /admin/leads. */}
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/leads" element={<AdminPage />} />
        {/* Dev-only: the admin API these screens call lives in the dev server
            (vite-dev-api.mts), so in a production build the routes are tree-shaken
            out and the URLs fall through to the catch-all redirect. The list is
            for scanning and publishing; the editor is its own screen. */}
        {AdminProductListPage && AdminProductEditPage && (
          <>
            <Route path="/admin/products" element={<AdminProductListPage />} />
            <Route path="/admin/products/edit" element={<AdminProductEditPage />} />
            <Route path="/admin/products/edit/:id" element={<AdminProductEditPage />} />
          </>
        )}
        {AdminPortfolioListPage && AdminPortfolioEditPage && (
          <>
            <Route path="/admin/portfolio" element={<AdminPortfolioListPage />} />
            <Route path="/admin/portfolio/edit" element={<AdminPortfolioEditPage />} />
            <Route path="/admin/portfolio/edit/:id" element={<AdminPortfolioEditPage />} />
            {/* Same two screens, in "community" mode (chosen by the path). */}
            <Route path="/admin/community" element={<AdminPortfolioListPage />} />
            <Route path="/admin/community/edit" element={<AdminPortfolioEditPage />} />
            <Route path="/admin/community/edit/:id" element={<AdminPortfolioEditPage />} />
          </>
        )}
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
