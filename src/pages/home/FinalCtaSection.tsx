import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { ProductCategory } from '../../catalog/types'
import { Wrap } from './shared'

/** Closing call to action. `ctaPrimary` is the hero's primary label, reused here. */
export function FinalCtaSection({
  cat,
  ctaTo,
  ctaPrimary,
}: {
  cat: ProductCategory | null
  ctaTo: string
  ctaPrimary: string
}) {
  const { t } = useTranslation()

  return (
    <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, textAlign: 'center' }}>
      <Wrap>
        <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 34 }, fontWeight: 600 }}>
          {cat ? t('mkt.service.finalHeading') : t('mkt.home.finalHeading')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: '32em', mx: 'auto', mt: 1.5, mb: 3 }}>
          {cat ? t('mkt.service.finalSub') : t('mkt.home.finalSub')}
        </Typography>
        <Button component={RouterLink} to={ctaTo} variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
          {cat ? ctaPrimary : t('mkt.home.finalCta')}
        </Button>
      </Wrap>
    </Box>
  )
}
