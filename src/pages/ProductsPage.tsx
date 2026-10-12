import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Pagination from '@mui/material/Pagination'
import { useProductsByCategory } from '../catalog/CatalogProvider'
import { CatalogImage } from '../catalog/CatalogImage'
import { trackProductSelect } from '../analytics/ga'
import { productImagePath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'
import { ProductBadges, ProductPriceLine } from '../catalog/ProductPrice'
import { matchesQuery, paginate, useCatalogQuery } from '../catalog/useCatalogQuery'
import { CatalogToolbar } from '../ui/CatalogToolbar'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useSeo } from '../seo/useSeo'

ensureMarketingI18n()

/** Products per page in the catalog grid. */
const PAGE_SIZE = 16

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProductsPage() {
  const { t } = useTranslation()
  useSeo({ title: t('mkt.products.title'), description: t('mkt.products.sub') })
  const L = useLocalized()
  const { cat, query, requestedPage, update } = useCatalogQuery()

  const matches = useProductsByCategory(cat).filter((p) =>
    matchesQuery([p.name.th, p.name.en, p.shortDesc.th, p.shortDesc.en, p.slug], query),
  )
  const { page, pageCount, items: products } = paginate(matches, requestedPage, PAGE_SIZE)

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

      <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mt: 2 }}>
        {products.map((p) => (
          <Paper
            key={p.id}
            component={RouterLink}
            to={`/products/${p.slug}`}
            onClick={() => trackProductSelect({ id: p.slug || p.id, name: p.name.en, category: p.category, price: p.priceFrom }, 'products_page')}
            elevation={0}
            sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s', display: 'flex', flexDirection: 'column', height: '100%', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CatalogImage src={productImagePath(p)} category={p.category} alt={L(p.name)} thumb />
            {/* Flex column so the price can pin to the bottom edge (mt:auto) and
                line up across a row; the grid already stretches cards to equal height. */}
            <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 17 } }}>{L(p.name)}</Typography>
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <ProductBadges product={p} sx={{ mb: 1 }} />
                <Typography component="div" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                  <ProductPriceLine product={p} />
                </Typography>
              </Box>
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
