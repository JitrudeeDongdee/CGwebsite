import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
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
  gap: 2,
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
  /** Cover-image path (resolved by CatalogImage); undefined for the seed house samples. */
  img?: string
  category: ProductCategory
}

/** `(from) → "สอบถามราคา" | "เริ่มต้น ฿x"` — the home page's price line. */
export type PriceLabel = (from: number | null) => string
