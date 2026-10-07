import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { AdminImage } from './AdminImage'

/** Responsive grid the cards sit in. One column on a phone, four on a wide screen. */
export const ADMIN_GRID_SX = {
  mt: 2,
  display: 'grid',
  gap: 2,
  // Equal-height rows: every card in a row is as tall as the tallest, and the
  // reserved text heights inside the card keep different rows matching too.
  alignItems: 'stretch',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, 1fr)',
    md: 'repeat(3, 1fr)',
    lg: 'repeat(4, 1fr)',
  },
} as const

/**
 * One row of an admin listing, drawn as a card.
 *
 * Deliberately a shell with slots rather than a component per screen: products
 * and portfolio items carry different fields, but the chrome — cover, title,
 * slug, a chip row, and a footer of controls — is the same, and two copies of
 * it would drift apart the first time one screen gained a button.
 *
 * The cover is an aspect-ratio box that the image fills, never a sized `<img>`:
 * a bare image contributes its intrinsic height and makes rows of cards
 * different heights (see MEMORY.md).
 */
export function AdminGridCard({
  imagePath,
  title,
  subtitle,
  chips,
  meta,
  footer,
  dimmed,
}: {
  imagePath?: string
  title: string
  subtitle?: string
  chips?: ReactNode
  meta?: ReactNode
  footer: ReactNode
  /** Drafts are shown faded, so an unpublished row is obvious while scanning. */
  dimmed?: boolean
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // Every card is the same height whatever its title or chips do: the grid
        // stretches cards in a row, and the reserved heights below keep rows
        // matching each other too.
        height: '100%',
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      <AdminImage path={imagePath} />

      <Stack spacing={0.75} sx={{ p: 1.75, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            // Thai tone marks sit above the line box, so a clamp at exactly two
            // line-heights shows the top of the third line (see MEMORY.md).
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            // minHeight as well as maxHeight: a one-line title must still take
            // two lines' worth of space, or cards end up different heights.
            minHeight: '2.7em',
            maxHeight: '2.7em',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {subtitle}
          </Typography>
        )}
        {chips && <Box sx={{ pt: 0.25, minHeight: 32 }}>{chips}</Box>}
        {meta && <Box sx={{ mt: 'auto', pt: 0.5 }}>{meta}</Box>}
      </Stack>

      <Stack
        direction="row"
        sx={{ px: 0.75, py: 0.5, alignItems: 'center', borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}
      >
        {footer}
      </Stack>
    </Paper>
  )
}
