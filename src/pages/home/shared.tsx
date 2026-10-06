import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { ProductCategory } from '../../catalog/types'

/** Shared layout + bits used by more than one HomePage section. */

export function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  )
}

/**
 * A row of cards that is a grid on a desktop and a swipeable rail on a phone.
 *
 * Stacking cards one per row cost whole screens of scrolling; a two-column grid
 * fixed that but left an odd card alone on the last row, which reads as broken
 * rather than as "that's all of them". A rail keeps them in one line whatever
 * the count, and bleeds to the screen edge so the next card peeks instead of
 * looking cut off.
 */
export const RAIL_SX = {
  display: { xs: 'flex', md: 'grid' },
  gap: 1.5,
  overflowX: { xs: 'auto', md: 'visible' },
  scrollSnapType: { xs: 'x mandatory', md: 'none' },
  mx: { xs: -3, md: 0 },
  px: { xs: 3, md: 0 },
  pb: { xs: 1, md: 0 },
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const

/** Each card in a rail: a fixed slice of the phone screen, its own snap point. */
export const RAIL_CARD_SX = { flex: { xs: '0 0 78%', md: '1 1 auto' }, scrollSnapAlign: 'start' } as const

/** One portfolio card on the home page. */
export type WorkCard = {
  key: string
  place: string
  year: string
  title: string
  to: string | null
  /** Every photo of the job (cover first), shown as a per-card carousel; empty
   *  for the seed house samples, which fall back to the category panel. */
  images?: string[]
  category: ProductCategory
}

/** `(from) → "สอบถามราคา" | "เริ่มต้น ฿x"` — the home page's price line. */
export type PriceLabel = (from: number | null) => string

/**
 * One placeholder card, same frame (border + image slot on top, text below) as
 * the Featured/Portfolio/Community cards, so the grid keeps its full shape and
 * height while the catalogue is still loading instead of collapsing to nothing
 * and then jumping when the real rows arrive.
 */
export function CardSkeleton({ ratio = { xs: '16 / 9', md: '4 / 3' } }: { ratio?: string | object } = {}) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
      {/* Image slot — an aspect-ratio box (same shape as CatalogImage) with the
          skeleton filling it, so the grey image placeholder actually reserves the
          picture's height instead of collapsing to a thin strip. */}
      <Box sx={{ aspectRatio: ratio, overflow: 'hidden' }}>
        <Skeleton variant="rectangular" animation="wave" sx={{ width: '100%', height: '100%' }} />
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Skeleton width="45%" height={16} />
        <Skeleton width="85%" height={22} sx={{ mt: 0.5 }} />
      </Box>
    </Paper>
  )
}

/** A grid of `count` skeleton cards, laid out like the real card grids. */
export function CardSkeletonGrid({
  count,
  columns = { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
  ratio,
}: {
  count: number
  columns?: object
  /** Image-slot aspect ratio — match the real cards so nothing jumps on load. */
  ratio?: string | object
}) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: columns }}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} ratio={ratio} />
      ))}
    </Box>
  )
}
