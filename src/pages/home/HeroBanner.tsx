import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ImageCarousel } from '../../ui/ImageCarousel'
import { CATEGORY_META } from '../../catalog/categories'
import { Wrap } from './shared'
import type { ProductCategory } from '../../catalog/types'
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
 *  the page jump, and so the copy block always has the same room. The phone
 *  stays short — a tall banner there is mostly empty scrim and pushes the real
 *  content below the fold — while desktop gets more room, where a wide screen
 *  makes a short band look like a stripe rather than a picture.
 *
 *  ⚠️ Desktop is capped against the viewport, not a flat number. The headline
 *  sits at the BOTTOM of the banner, under ~230px of header and service strip,
 *  so a fixed tall banner pushes the h1 off-screen on a 768px-tall laptop —
 *  measured at 700px, it ended at y=889. The cap keeps the headline (and the local-search phrase
 *  in it) visible without scrolling on a short screen, while a tall monitor
 *  still gets the full height. It depends only on the viewport, so switching
 *  service lines still never changes it. */
const BANNER_MAX = 'calc(100vh - 230px)'
const BANNER_HEIGHT = {
  xs: 320,
  sm: 380,
  md: `min(540px, ${BANNER_MAX})`,
  lg: `min(600px, ${BANNER_MAX})`,
}

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
}: {
  hero: Hero
  /** Best seller's photo first, then covers of real jobs in the same line. */
  heroImages: string[]
  cat: ProductCategory | null
}) {
  const category: ProductCategory = cat ?? 'house'

  return (
    // Full-bleed on a phone, where side margins just waste the little width
    // there is; from `md` it lines up with every other section (same 1180 +
    // px:3 as `Wrap`) so the page keeps one left edge all the way down.
    <Box component="section" sx={{ maxWidth: { md: 1180 }, mx: { md: 'auto' }, px: { md: 3 }, mt: { md: 3 } }}>
      <Box sx={{ position: 'relative', height: BANNER_HEIGHT, overflow: 'hidden', borderRadius: { md: 3 } }}>
        {heroImages.length > 0 ? (
          <ImageCarousel
            images={heroImages}
            category={category}
            alt={hero.title}
            height="100%"
            interval={5500}
            // The wrapper clips the corners, so the carousel must not round its
            // own — doubled radii leave pale slivers at each corner. Full-size
            // files: this slot is up to 600px tall, where a 400px copy softens.
            rounded={false}
          />
        ) : (
          // No photos for this line yet. A flat category panel still gives the
          // copy something to sit on, rather than white text on white.
          <Box sx={{ height: '100%', bgcolor: CATEGORY_META[category].color }} />
        )}

        {/* Scrim + copy. `pointerEvents: none` right through, so the carousel
            underneath keeps its drag, arrows and dots — there is nothing
            clickable up here since the CTAs were removed. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            // Two scrims, because one is not enough on a bright photo: a strong
            // bottom-up wash under the copy, plus a left-to-right one so the
            // text keeps its backing even where the picture is pale. Tuned
            // against the brightest image in the set, not an average one.
            background: [
              'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.08) 78%, rgba(0,0,0,0.32) 100%)',
              'linear-gradient(to right, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0) 75%)',
            ].join(', '),
          }}
        >
          <Box sx={{ width: '100%', px: { xs: 3, md: 4 }, pb: { xs: 4, md: 5 } }}>
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
                  ...clamp(2, 1.2),
                }}
              >
                {hero.title}
              </Typography>
            </Box>
          </Box>
        </Box>
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
            // Three across on every width, phones included. The type steps
            // down instead of the columns stacking, so the strip stays one
            // glanceable row rather than becoming three more things to scroll.
            gap: { xs: 1, sm: 2, md: 3 },
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {hero.trust.map((item) => (
            <Box key={item.head}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 12.5, sm: 14, md: 15 }, lineHeight: 1.4 }}>
                {item.head}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, lineHeight: 1.45 }}
              >
                {item.sub}
              </Typography>
            </Box>
          ))}
        </Box>
      </Wrap>
    </Box>
  )
}
