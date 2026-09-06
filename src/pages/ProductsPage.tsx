import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { productsByCategory } from '../catalog/products'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { CatalogImage } from '../catalog/CatalogImage'
import { useLocalized } from '../catalog/useLocalized'
import type { ProductCategory } from '../catalog/types'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProductsPage() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'
  const [cat, setCat] = useState<ProductCategory | 'all'>('all')
  const products = productsByCategory(cat)

  const priceLabel = (from: number | null) =>
    from == null ? t('mkt.catalog.quote') : `${t('mkt.catalog.from')} ${formatCurrency(from, 'THB', locale)}`

  return (
    <Wrap sx={{ py: { xs: 5, md: 7 } }}>
      <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {t('mkt.products.eyebrow')}
      </Typography>
      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 28, md: 38 }, fontWeight: 600 }}>
        {t('mkt.products.title')}
      </Typography>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', maxWidth: '44em' }}>{t('mkt.products.sub')}</Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={cat}
        onChange={(_, next: ProductCategory | 'all' | null) => next && setCat(next)}
        sx={{ mt: 3, flexWrap: 'wrap' }}
      >
        <ToggleButton value="all">{t('mkt.catalog.all')}</ToggleButton>
        {PRODUCT_CATEGORIES.map((c) => (
          <ToggleButton key={c} value={c}>{t(CATEGORY_META[c].labelKey)}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 3 }}>
        {products.map((p) => (
          <Paper
            key={p.id}
            component={RouterLink}
            to={`/products/${p.slug}`}
            elevation={0}
            sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CatalogImage src={`products/${p.slug}.jpg`} category={p.category} alt={L(p.name)} />
            <Box sx={{ p: 2 }}>
              <Chip size="small" variant="outlined" label={t(CATEGORY_META[p.category].labelKey)} sx={{ mb: 1 }} />
              <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{L(p.name)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>{L(p.shortDesc)}</Typography>
              <Typography sx={{ mt: 1, color: 'secondary.main', fontWeight: 700 }}>
                {priceLabel(p.priceFrom)}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </Wrap>
  )
}
