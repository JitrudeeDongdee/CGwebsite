import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useSeo } from '../seo/useSeo'

ensureMarketingI18n()

/**
 * A real "not found" screen.
 *
 * Unknown paths used to `<Navigate>` to the house home page. That is a **soft
 * 404**: the CDN answers 200, the crawler is handed a page, and a typo'd or
 * long-dead URL quietly becomes another copy of the landing page competing with
 * it in the index. Saying "this does not exist" and marking it `noindex` keeps
 * those URLs out while still offering a way onward.
 *
 * It cannot send a real 404 status — this is a static host and the CDN has
 * already replied 200 by the time React runs. `noindex` is the part that
 * actually matters to a search engine; the status code is cosmetic once the
 * page says it is empty.
 */
export function NotFoundPage() {
  const { t } = useTranslation()
  useSeo({ title: t('mkt.notFound.title'), description: t('mkt.notFound.body'), index: false })

  return (
    <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center', px: 3, py: { xs: 8, md: 12 } }}>
      <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: '34em' }}>
        <Typography sx={{ fontSize: 56, fontWeight: 700, color: 'text.disabled', lineHeight: 1 }}>404</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 600 }}>
          {t('mkt.notFound.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>{t('mkt.notFound.body')}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
          <Button component={RouterLink} to="/home/contracting" variant="contained">
            {t('mkt.notFound.home')}
          </Button>
          <Button component={RouterLink} to="/products" variant="outlined">
            {t('mkt.nav.products')}
          </Button>
          <Button component={RouterLink} to="/contact" variant="outlined">
            {t('mkt.nav.contact')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
