import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.tsx'
import { AppThemeProvider } from './theme/AppThemeProvider'
import { AuthProvider } from './auth/AuthProvider'
import { CatalogProvider } from './catalog/CatalogProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <AuthProvider>
        <CatalogProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CatalogProvider>
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
)
