import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StarIcon from '@mui/icons-material/Star'
import { IsoThumbnail } from '../../ui/ItemPreview'
import { ImageCarousel } from '../../ui/ImageCarousel'
import { CATEGORY_META } from '../../catalog/categories'
import { useLocalized } from '../../catalog/useLocalized'
import type { Product, ProductCategory } from '../../catalog/types'
import type { PLAN_TEMPLATES } from '../../drawing/templates'
import { Wrap, Eyebrow, type PriceLabel } from './shared'

type Model = (typeof PLAN_TEMPLATES)[number]

/** The hero's copy, resolved by HomePage from the home or the service i18n group. */
export interface Hero {
  eyebrow: string
  title: string
  lead: string
  ctaPrimary: string
  trust: { head: string; sub: string }[]
}

/**
 * Hero height, shared by the company home and every service page so switching
 * services never makes the page jump. Taller on medium screens, where the copy
 * needs more lines to fit.
 */
const HERO_HEIGHT = { md: 700, lg: 600 }

/** Hero card media height — the same for the plan thumbnail and a product photo. */
const HERO_MEDIA_HEIGHT = 240

/**
 * Holds a block of the hero's variable-length copy at a fixed number of lines
 * per breakpoint (clamped, so longer copy can't push the hero taller). On
 * mobile the hero grows with its content as usual.
 */
const clamp = (lines: { md: number; lg: number }, lineHeight: number, fontSize: number) => {
  const box = (n: number) => `${(n * lineHeight * fontSize).toFixed(2)}px`
  return {
    lineHeight,
    display: { xs: 'block', md: '-webkit-box' },
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: { md: lines.md, lg: lines.lg },
    overflow: 'hidden',
    minHeight: { md: box(lines.md), lg: box(lines.lg) },
  }
}

export function HeroSection({
  hero,
  heroProduct,
  heroPlan,
  heroImages,
  cat,
  ctaTo,
  allProductsTo,
  priceLabel,
}: {
  hero: Hero
  heroProduct: Product | undefined
  heroPlan: Model | undefined
  /** The product photo plus related same-category project photos, for the carousel. */
  heroImages: string[]
  cat: ProductCategory | null
  ctaTo: string
  allProductsTo: string
  priceLabel: PriceLabel
}) {
  const { t } = useTranslation()
  const L = useLocalized()
  const theme = useTheme()

  return (
    <Box
      sx={{
        backgroundImage: `linear-gradient(0deg, ${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {/* The hero keeps the same height on every service page (HERO_HEIGHT),
          so switching services doesn't make the page jump. */}
      <Wrap sx={{ py: { xs: 4, md: 9 }, display: 'flex', alignItems: 'center', height: HERO_HEIGHT }}>
        <Box sx={{ width: '100%', display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
          <Box>
            <Eyebrow>{hero.eyebrow}</Eyebrow>
            <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 32, md: 48 }, fontWeight: 600, letterSpacing: '-0.01em', ...clamp({ md: 3, lg: 2 }, 1.15, 48) }}>
              {hero.title}
            </Typography>
            <Typography sx={{ mt: { xs: 1.5, md: 2.5 }, mb: { xs: 2.5, md: 3.5 }, color: 'text.secondary', fontSize: { xs: 16, md: 18 }, maxWidth: '34em', ...clamp({ md: 4, lg: 3 }, 1.5, 18) }}>
              {hero.lead}
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              <Button component={RouterLink} to={ctaTo} variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
                {hero.ctaPrimary}
              </Button>
              <Button component={RouterLink} to={allProductsTo} variant="outlined" size="large" sx={{ flexShrink: 0 }}>
                {cat ? t('mkt.service.allProducts') : t('mkt.home.ctaSecondary')}
              </Button>
            </Stack>
            <Box sx={{ mt: { xs: 2.5, md: 4 }, display: 'grid', gap: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              {hero.trust.map((item, i) => (
                <Box key={item.head} sx={{ gridColumn: { xs: i === 2 ? '1 / -1' : 'auto', sm: 'auto' } }}>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: 17, md: 20 }, color: 'primary.main', ...clamp({ md: 2, lg: 2 }, 1.3, 20) }}>{item.head}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={clamp({ md: 4, lg: 3 }, 1.4, 12)}>{item.sub}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {heroProduct && (
            <Paper
              component={RouterLink}
              to={`/products/${heroProduct.slug}`}
              elevation={0}
              sx={{
                p: 2.5, border: 1, borderColor: 'divider', borderRadius: 3,
                display: 'block', textDecoration: 'none', color: 'inherit',
                transition: 'border-color .15s',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                {heroProduct.bestSeller && (
                  <Chip icon={<StarIcon />} label={t('mkt.catalog.bestSeller')} size="small" color="secondary" />
                )}
                <Chip label={t(CATEGORY_META[heroProduct.category].labelKey)} size="small" color="primary" variant="outlined" />
              </Stack>
              {heroPlan ? (
                <Box sx={{ display: 'grid', placeItems: 'center', height: HERO_MEDIA_HEIGHT }}>
                  <IsoThumbnail state={heroPlan.build()} size={220} />
                </Box>
              ) : (
                // The product's own photo leads, followed by real jobs from the same
                // service line — a looping, swipeable carousel so the best seller is
                // shown both as a product and as delivered work. Missing photos fall
                // back to the flat category panel.
                <ImageCarousel
                  images={heroImages}
                  category={heroProduct.category}
                  alt={L(heroProduct.name)}
                  height={HERO_MEDIA_HEIGHT}
                />
              )}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mr: 1 }}>{L(heroProduct.name)}</Typography>
                <Typography sx={{ color: 'secondary.main', fontWeight: 700, whiteSpace: 'nowrap' }}>{priceLabel(heroProduct.priceFrom)}</Typography>
              </Stack>
            </Paper>
          )}
        </Box>
      </Wrap>
    </Box>
  )
}
