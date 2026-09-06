import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Box from '@mui/material/Box'
import { DesignerPage } from './pages/DesignerPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { MarketingLayout } from './marketing/MarketingLayout'
import { SiteHeader } from './ui/SiteHeader'

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
      <Outlet />
    </Box>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/portfolio/:slug" element={<ProjectDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route path="/" element={<DesignerPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
