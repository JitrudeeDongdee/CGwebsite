import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { IsoThumbnail } from '../../ui/ItemPreview'
import { formatCurrency } from '../../pricing/estimate'
import { CatalogImage } from '../../catalog/CatalogImage'
import { productImagePath } from '../../catalog/images'
import { useLocalized } from '../../catalog/useLocalized'
import type { Product } from '../../catalog/types'
import type { PLAN_TEMPLATES } from '../../drawing/templates'
import { Wrap, Eyebrow, RAIL_SX, RAIL_CARD_SX, type PriceLabel } from './shared'

type Model = (typeof PLAN_TEMPLATES)[number]

/** Rough per-sqm rate used only for the house models' "from" figure on the home page. */
const RATE = 18000

/**
 * Featured block: house plans on the home + house line (drawn as iso thumbnails),
 * the line's catalog products otherwise.
 */
export function FeaturedSection({
  isHouseish,
  models,
  catProducts,
  allProductsTo,
  priceLabel,
  locale,
}: {
  isHouseish: boolean
  models: Model[]
  catProducts: Product[]
  allProductsTo: string
  priceLabel: PriceLabel
  locale: string
}) {
  const { t } = useTranslation()
  const L = useLocalized()

  return (
    <Box id="models" component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Wrap>
        {/* Heading and the "see all" link share one row. */}
        <Stack direction="row" sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ maxWidth: '42em' }}>
            <Eyebrow>{isHouseish ? t('mkt.home.modelsEyebrow') : t('mkt.service.eyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
              {isHouseish ? t('mkt.home.modelsHeading') : t('mkt.service.productsHead')}
            </Typography>
            {isHouseish && <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.modelsSub')}</Typography>}
          </Box>
          <Button component={RouterLink} to={allProductsTo} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ flexShrink: 0 }}>
            {t('mkt.service.allProducts')}
          </Button>
        </Stack>

        {isHouseish ? (
          <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(4, 1fr)' } }}>
            {models.map((m) => (
              <Paper key={m.id} elevation={0} sx={{ ...RAIL_CARD_SX, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', py: { xs: 1.5, md: 2.5 }, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                  <IsoThumbnail state={m.build()} size={120} />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{t(m.nameKey)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" variant="outlined" label={`${m.width}×${m.depth} ${t('summary.squareMeters')}`} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 1.5 }}>
                    <Typography sx={{ color: 'secondary.main', fontWeight: 700 }}>
                      {formatCurrency(m.width * m.depth * RATE, 'THB', locale)}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="/design"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {t('mkt.home.modelCustomize')}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : catProducts.length === 0 ? (
          <Typography color="text.secondary">{t('mkt.service.productsEmpty')}</Typography>
        ) : (
          <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(4, 1fr)' } }}>
            {catProducts.map((p) => (
              <Paper
                key={p.id}
                component={RouterLink}
                to={`/products/${p.slug}`}
                elevation={0}
                sx={{
                  ...RAIL_CARD_SX,
                  borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                  textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <CatalogImage src={productImagePath(p)} category={p.category} alt={L(p.name)} ratio={{ xs: '16 / 9', md: '4 / 3' }} />
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{L(p.name)}</Typography>
                  {/* Clamped rather than free-flowing: in two columns a long
                      description made one card twice the height of its neighbour. */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.5, minHeight: { md: 40 },
                      display: '-webkit-box', WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: { xs: 2, md: 'none' }, overflow: 'hidden',
                      // Clipped just short of two lines: see ProductsPage — Thai
                      // tone marks otherwise peek over the cut.
                      lineHeight: 1.6, maxHeight: { xs: '2.85em', md: 'none' },
                    }}
                  >
                    {L(p.shortDesc)}
                  </Typography>
                  <Typography sx={{ mt: 1, color: 'secondary.main', fontWeight: 700 }}>{priceLabel(p.priceFrom)}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Wrap>
    </Box>
  )
}
