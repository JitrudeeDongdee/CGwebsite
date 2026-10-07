import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { CatalogImage } from '../../catalog/CatalogImage'
import { productImagePath } from '../../catalog/images'
import { trackProductSelect } from '../../analytics/ga'
import { useLocalized } from '../../catalog/useLocalized'
import type { Product } from '../../catalog/types'
import { Wrap, Eyebrow, CardSkeletonGrid, type PriceLabel } from './shared'

/**
 * Featured block: the service line's catalog products, in the same card grid
 * for every category (the house line included — it no longer gets the special
 * iso-thumbnail "models" treatment).
 */
export function FeaturedSection({
  catProducts,
  allProductsTo,
  priceLabel,
  loading = false,
  heading,
}: {
  catProducts: Product[]
  allProductsTo: string
  priceLabel: PriceLabel
  /** Catalogue still loading — show skeleton cards for the (async) product grid. */
  loading?: boolean
  /** Section h2 — a service line can say what it is instead of the generic label. */
  heading?: string
}) {
  const { t } = useTranslation()
  const L = useLocalized()

  return (
    <Box id="models" component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Wrap>
        {/* Heading and the "see all" link share one row. */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ maxWidth: '42em' }}>
            <Eyebrow>{t('mkt.service.eyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
              {heading ?? t('mkt.service.productsHead')}
            </Typography>
          </Box>
          <Button component={RouterLink} to={allProductsTo} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ flexShrink: 0 }}>
            {t('mkt.service.allProducts')}
          </Button>
        </Stack>

        {loading ? (
          <CardSkeletonGrid count={4} />
        ) : catProducts.length === 0 ? (
          <Typography color="text.secondary">{t('mkt.service.productsEmpty')}</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {catProducts.map((p) => (
              <Paper
                key={p.id}
                component={RouterLink}
                to={`/products/${p.slug}`}
                onClick={() => trackProductSelect({ id: p.slug || p.id, name: p.name.en, category: p.category, price: p.priceFrom }, 'home_featured')}
                elevation={0}
                sx={{
                  borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                  textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
                  display: 'flex', flexDirection: 'column',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <CatalogImage src={productImagePath(p)} category={p.category} alt={L(p.name)} ratio={{ xs: '16 / 9', md: '4 / 3' }} />
                <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{L(p.name)}</Typography>
                  <Typography sx={{ mt: 'auto', pt: 1, color: 'secondary.main', fontWeight: 700 }}>{priceLabel(p.priceFrom)}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Wrap>
    </Box>
  )
}
