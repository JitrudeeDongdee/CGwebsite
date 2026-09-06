import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Pagination from '@mui/material/Pagination'
import { productsByCategory } from '../catalog/products'
import { CATEGORY_META } from '../catalog/categories'
import { CatalogImage } from '../catalog/CatalogImage'
import { useLocalized } from '../catalog/useLocalized'
import { matchesQuery, paginate, useCatalogQuery } from '../catalog/useCatalogQuery'
import { CatalogToolbar } from '../ui/CatalogToolbar'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

/** Products per page in the catalog grid. */
const PAGE_SIZE = 6

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProductsPage() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'
  const { cat, query, requestedPage, update } = useCatalogQuery()

  const matches = productsByCategory(cat).filter((p) =>
    matchesQuery([p.name.th, p.name.en, p.shortDesc.th, p.shortDesc.en, p.slug], query),
  )
  const { page, pageCount, items: products } = paginate(matches, requestedPage, PAGE_SIZE)

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

      <CatalogToolbar
        category={cat}
        query={query}
        onCategory={(next) => update({ category: next })}
        onQuery={(next) => update({ q: next })}
        searchPlaceholder={t('mkt.catalog.search')}
        resultCount={matches.length}
      />

      {matches.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>{t('mkt.catalog.noResults')}</Typography>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 2 }}>
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

      {pageCount > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'center', mt: 4 }}>
          <Pagination
            page={page}
            count={pageCount}
            color="primary"
            shape="rounded"
            onChange={(_, next) => update({ page: next })}
          />
        </Stack>
      )}
    </Wrap>
  )
}
