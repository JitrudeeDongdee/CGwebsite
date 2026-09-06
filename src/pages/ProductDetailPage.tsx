import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import { useProduct, useProjectsForProduct } from '../catalog/CatalogProvider'
import { CATEGORY_META } from '../catalog/categories'
import { CatalogImage } from '../catalog/CatalogImage'
import { projectImagePath, projectPath } from '../catalog/images'
import { productImagePath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProductDetailPage() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'
  const { slug } = useParams()
  const product = useProduct(slug)
  // Jobs delivered with this service — proof that the listing is real work.
  const relatedProjects = useProjectsForProduct(product?.id)

  if (!product) {
    return (
      <Wrap sx={{ py: 8 }}>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>{t('mkt.catalog.notFound')}</Typography>
        <Link component={RouterLink} to="/products" sx={{ mt: 2, display: 'inline-block' }}>{t('mkt.catalog.backToProducts')}</Link>
      </Wrap>
    )
  }

  const isHouse = product.category === 'house'

  return (
    <Wrap sx={{ py: { xs: 4, md: 6 } }}>
      <Link component={RouterLink} to="/products" color="text.secondary" sx={{ fontSize: 14 }}>
        {t('mkt.catalog.backToProducts')}
      </Link>

      <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 2, alignItems: 'start' }}>
        <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <CatalogImage src={productImagePath(product)} category={product.category} alt={L(product.name)} ratio="4 / 3" />
        </Paper>

        <Box>
          <Chip size="small" variant="outlined" label={t(CATEGORY_META[product.category].labelKey)} sx={{ mb: 1.5 }} />
          <Typography variant="h1" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 600 }}>{L(product.name)}</Typography>
          <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{L(product.shortDesc)}</Typography>

          <Typography sx={{ mt: 2, color: 'secondary.main', fontWeight: 700, fontSize: 22 }}>
            {product.priceFrom == null
              ? t('mkt.catalog.quote')
              : `${t('mkt.catalog.from')} ${formatCurrency(product.priceFrom, 'THB', locale)}${product.priceUnit ? ' ' + L(product.priceUnit) : ''}`}
          </Typography>

          <Paper elevation={0} sx={{ mt: 2.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
              {t('mkt.catalog.specsHead')}
            </Typography>
            <Box sx={{ px: 2, pb: 1 }}>
              {product.specs.map((s, i) => (
                <Box key={i}>
                  {i > 0 && <Divider />}
                  <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body2" color="text.secondary">{L(s.label)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{L(s.value)}</Typography>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>

          <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
            {isHouse ? (
              <Button component={RouterLink} to="/design" variant="contained" color="secondary" size="large">
                {t('mkt.catalog.customize')}
              </Button>
            ) : (
              <Button component={RouterLink} to="/contact" variant="contained" color="secondary" size="large">
                {t('mkt.catalog.requestQuote')}
              </Button>
            )}
            <Button component={RouterLink} to="/contact" variant="outlined" size="large">
              {t('mkt.nav.contact')}
            </Button>
          </Stack>
        </Box>
      </Box>

      {relatedProjects.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 600, mb: 2 }}>
            {t('mkt.catalog.relatedProjects')}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
            {relatedProjects.map((project) => (
              <Box
                key={project.id}
                component={RouterLink}
                to={projectPath(project)}
                sx={{
                  position: 'relative', borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider',
                  textDecoration: 'none', display: 'block', transition: 'border-color .15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <CatalogImage src={projectImagePath(project)} category={project.category} alt={L(project.title)} />
                <Box
                  sx={{
                    position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column',
                    justifyContent: 'flex-end', color: '#fff',
                    background: 'linear-gradient(0deg, rgba(11,34,49,0.88), transparent 55%)',
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {L(project.location)}{project.year ? ` · ${project.year}` : ''}
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{L(project.title)}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

    </Wrap>
  )
}
