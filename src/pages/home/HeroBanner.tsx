import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { ImageCarousel } from '../../ui/ImageCarousel'
import { CATEGORY_META } from '../../catalog/categories'
import type { ProductCategory } from '../../catalog/types'
import { Wrap } from './shared'
import type { Hero } from './HeroSection'

/**
 * Image-led hero: a full-bleed photo slideshow with the copy set over it.
 *
 * The alternative to `HeroSection`, which is a two-column text block with a
 * picture beside it. Both are kept — this one leads with the work, which suits a
 * contractor whose photos are the proof; the other reads better when the words
 * are what matter. `HomePage` picks one.
 *
 * Reuses `ImageCarousel` rather than writing a second slideshow: the scroll-snap
 * track, the forward-only loop and the auto-advance are already solved there.
 */

/** Banner height. Fixed per breakpoint so switching service lines never makes
 *  the page jump, and so the copy block always has the same room. */
const BANNER_HEIGHT = { xs: 460, sm: 520, md: 620, lg: 660 }

/** Truncate a one-line label instead of wrapping (two buttons on a phone). */
const ELLIPSIS = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
} as const

/**
 * Clamp Thai copy to `lines`.
 *
 * `maxHeight` sits deliberately SHORT of the exact line boundary: Thai tone
 * marks and upper vowels are drawn well above their baseline, so a clamp at
 * exactly N line-heights lets the top of the next line poke through the cut
 * (see MEMORY.md).
 */
const clamp = (lines: number, lineHeight: number) => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical' as const,
  WebkitLineClamp: lines,
  overflow: 'hidden',
  lineHeight,
  maxHeight: `${(lines * lineHeight - 0.15).toFixed(2)}em`,
})

export function HeroBanner({
  hero,
  heroImages,
  cat,
  ctaTo,
  allProductsTo,
}: {
  hero: Hero
  /** Best seller's photo first, then covers of real jobs in the same line. */
  heroImages: string[]
  cat: ProductCategory | null
  ctaTo: string
  allProductsTo: string
}) {
  const { t } = useTranslation()
  const category: ProductCategory = cat ?? 'house'

  return (
    <Box component="section" sx={{ position: 'relative', height: BANNER_HEIGHT, overflow: 'hidden' }}>
      {heroImages.length > 0 ? (
        <ImageCarousel
          images={heroImages}
          category={category}
          alt={hero.title}
          height="100%"
          interval={5500}
          // Full-bleed: no rounded corners, and the full-size files — this slot
          // is up to 660px tall, where a 400px thumbnail visibly softens.
          rounded={false}
        />
      ) : (
        // No photos for this line yet. A flat category panel still gives the
        // copy something to sit on, rather than white text on white.
        <Box sx={{ height: '100%', bgcolor: CATEGORY_META[category].color }} />
      )}

      {/* Scrim + copy. `pointerEvents: none` so the carousel underneath keeps
          its drag, arrows and dots; the buttons switch it back on. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-end',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.15) 62%, rgba(0,0,0,0.30) 100%)',
        }}
      >
        <Wrap sx={{ width: '100%', pb: { xs: 5, md: 7 } }}>
          <Box sx={{ maxWidth: { xs: '100%', md: '40rem' }, color: '#fff' }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                opacity: 0.85,
              }}
            >
              {hero.eyebrow}
            </Typography>

            {/* Stays the page's h1 — the local-search headline lives here. */}
            <Typography
              variant="h1"
              sx={{
                mt: 1,
                fontSize: { xs: 30, sm: 38, md: 52 },
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textShadow: '0 2px 18px rgba(0,0,0,0.45)',
                ...clamp(3, 1.2),
              }}
            >
              {hero.title}
            </Typography>

            <Typography
              sx={{
                mt: { xs: 1.5, md: 2 },
                fontSize: { xs: 15, md: 18 },
                opacity: 0.92,
                textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                ...clamp(2, 1.55),
              }}
            >
              {hero.lead}
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ mt: { xs: 2.5, md: 3.5 }, gap: 1.5, pointerEvents: 'auto' }}
            >
              <Button
                component={RouterLink}
                to={ctaTo}
                variant="contained"
                color="secondary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ flex: { xs: 1, md: '0 0 auto' }, minWidth: 0, '& .MuiButton-endIcon': { flexShrink: 0 } }}
              >
                <Box component="span" sx={ELLIPSIS}>{hero.ctaPrimary}</Box>
              </Button>
              <Button
                component={RouterLink}
                to={allProductsTo}
                variant="outlined"
                size="large"
                sx={{
                  flex: { xs: 1, md: '0 0 auto' },
                  minWidth: 0,
                  // White on the photo: an outlined button in the theme's own
                  // colours disappears against a dark image.
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                <Box component="span" sx={ELLIPSIS}>
                  {cat ? t('mkt.service.allProducts') : t('mkt.home.ctaSecondary')}
                </Box>
              </Button>
            </Stack>
          </Box>
        </Wrap>
      </Box>
    </Box>
  )
}

/**
 * The three selling points that used to sit inside the hero's text column.
 * Kept as a strip under the banner so the banner itself stays a picture — the
 * copy is real content and dropping it would lose it from the page.
 */
export function HeroTrustStrip({ hero }: { hero: Hero }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Wrap sx={{ py: { xs: 2, md: 2.5 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1.5, md: 3 },
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          {hero.trust.map((item) => (
            <Box key={item.head}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, md: 15 } }}>{item.head}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 13, md: 14 } }}>
                {item.sub}
              </Typography>
            </Box>
          ))}
        </Box>
      </Wrap>
    </Box>
  )
}
