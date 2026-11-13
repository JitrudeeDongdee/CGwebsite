import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

/**
 * One option tile, and the only one.
 *
 * Every picker in the catalogue dock is built from this — wall types, doors,
 * furniture, roof shapes, materials AND colours — so a colour reads as the
 * same kind of choice as a sofa, and the dock stays one grid rather than five
 * differently-shaped lists. Before this the same screen offered colours as
 * circles, materials as a segmented text control, and furniture as full-width
 * list rows, which is three answers to one question.
 */

/** Tile edge for a catalogue item. */
export const SWATCH = 58
/** Tile edge for a variant row — the colours under a material. */
export const SWATCH_SMALL = 32

interface SwatchProps {
  label: string
  selected: boolean
  onClick: () => void
  /** Fills the tile with a flat colour: the colour-variant case. */
  color?: string
  /** A drawing of the thing, for everything that is not a bare colour. */
  children?: ReactNode
  /** Shown under the tile. Left off the colour row, where the tooltip has it. */
  caption?: string
  /** Second line under the caption — a thickness, a size in metres. */
  hint?: string
  size?: number
}

export function Swatch({
  label,
  selected,
  onClick,
  color,
  children,
  caption,
  hint,
  size = SWATCH,
}: SwatchProps) {
  return (
    <Tooltip title={hint ? `${label} · ${hint}` : label} enterDelay={400}>
      <ButtonBase
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.375,
          borderRadius: 1.5,
          width: caption ? size + 10 : size,
          p: 0.25,
        }}
      >
        <Box
          sx={{
            height: size,
            borderRadius: 1.5,
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            bgcolor: color ?? 'action.hover',
            border: 2,
            borderColor: selected ? 'primary.main' : 'divider',
            // Ring rather than a thicker border: a border that changes width
            // would move every neighbouring tile on selection.
            outline: selected ? '2px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: 1,
            transition: 'border-color 120ms',
          }}
        >
          {children}
        </Box>
        {caption && (
          <Typography
            variant="caption"
            sx={{
              lineHeight: 1.15,
              fontSize: 10.5,
              textAlign: 'center',
              color: selected ? 'primary.main' : 'text.secondary',
              fontWeight: selected ? 600 : 400,
              // Thai tone marks sit well above the baseline, so a clamp at
              // exactly two line-heights shears them off: see MEMORY.md.
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxHeight: '2.15em',
            }}
          >
            {caption}
          </Typography>
        )}
      </ButtonBase>
    </Tooltip>
  )
}

/** The grid the tiles sit in. */
export function SwatchGrid({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{children}</Box>
}

/** A labelled block inside a dock tab. */
export function DockSection({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Stack spacing={0.75}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {hint}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  )
}
