import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { DesignerPage } from './pages/DesignerPage'
import { AdminPage } from './pages/AdminPage'
import { SettingsMenu } from './ui/SettingsMenu'

function App() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar variant="dense">
          <Typography variant="h3" component="h1" sx={{ mr: 3 }}>
            {t('app.title')}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            <Button
              component={RouterLink}
              to="/"
              size="small"
              color={pathname === '/' ? 'primary' : 'inherit'}
            >
              {t('app.navDesigner')}
            </Button>
            <Button
              component={RouterLink}
              to="/admin"
              size="small"
              color={pathname === '/admin' ? 'primary' : 'inherit'}
            >
              {t('app.navAdmin')}
            </Button>
          </Stack>

          <SettingsMenu />
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<DesignerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}

export default App
