import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { SiteHeader, Brand } from '../ui/SiteHeader'
import { ensureMarketingI18n } from './i18n'

ensureMarketingI18n()

export function MarketingLayout() {
  return (
    <Box sx={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <MarketingFooter />
    </Box>
  )
}

function MarketingFooter() {
  const { t } = useTranslation()
  const col = (head: string, items: string[]) => (
    <Stack spacing={0.5}>
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>{head}</Typography>
      {items.map((it) => (
        <Typography key={it} variant="body2" color="text.secondary">
          {it}
        </Typography>
      ))}
    </Stack>
  )
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 5, mt: 4 }}>
      <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3 }}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: '1.6fr 1fr 1fr 1fr' } }}>
          <Stack spacing={1.5}>
            <Brand />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '26em' }}>
              {t('mkt.footer.tagline')}
            </Typography>
          </Stack>
          {col(t('mkt.footer.servicesHead'), [t('mkt.home.svc1'), t('mkt.home.svc2'), t('mkt.home.svc3'), t('mkt.home.svc4')])}
          {col(t('mkt.footer.companyHead'), [t('mkt.nav.about'), t('mkt.nav.work'), t('mkt.nav.models'), t('mkt.nav.contact')])}
          {col(t('mkt.footer.contactHead'), ['โทร 0X-XXX-XXXX', 'LINE @cghome', 'hello@cg.co.th'])}
        </Box>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">© 2567 CG Home. {t('mkt.footer.rights')}.</Typography>
          <Typography variant="caption" color="text.secondary">{t('mkt.placeholderNote')}</Typography>
        </Stack>
      </Box>
    </Box>
  )
}
