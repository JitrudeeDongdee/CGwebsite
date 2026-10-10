import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { formatCurrency } from '../pricing/estimate'
import { discountBadge, productPriceView, type PriceView } from './pricing'
import type { Product } from './types'

function useLocale() {
  const { i18n } = useTranslation()
  return i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'
}

/**
 * The price line for a product card: a "from" prefix when it spans variants, the
 * struck-through original when a discount is active, and the current price. Falls
 * back to "ask for pricing" when nothing is priced. Rendered inline so a page can
 * drop it inside its own styled price `Typography`.
 */
export function ProductPriceLine({ product, view }: { product: Product; view?: PriceView }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const pv = view ?? productPriceView(product)
  if (pv.current == null) return <>{t('mkt.catalog.quote')}</>
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
      {pv.from && (
        <Box component="span" sx={{ fontWeight: 400, fontSize: '0.8em', color: 'text.secondary' }}>
          {t('mkt.catalog.from')}
        </Box>
      )}
      {pv.original != null && (
        <Box component="span" sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 400, fontSize: '0.85em' }}>
          {formatCurrency(pv.original, 'THB', locale)}
        </Box>
      )}
      <Box component="span">{formatCurrency(pv.current, 'THB', locale)}</Box>
    </Box>
  )
}

/** Small chips shown on a card: the active discount, and "instalments" when set. */
export function ProductBadges({ product, sx }: { product: Product; sx?: object }) {
  const { t } = useTranslation()
  const badge = discountBadge(product.discount)
  if (!badge && !product.installment) return null
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, ...sx }}>
      {badge && <Chip size="small" color="error" label={badge} sx={{ height: 22, fontWeight: 700 }} />}
      {product.installment && (
        <Chip size="small" variant="outlined" color="success" label={t('mkt.catalog.installmentBadge')} sx={{ height: 22 }} />
      )}
    </Stack>
  )
}
