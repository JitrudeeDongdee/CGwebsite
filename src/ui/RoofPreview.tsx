import { useTheme } from '@mui/material/styles'
import type { RoofShape } from '../drawing/roof'

const W = 48
const H = 34

/** Section profile of each roof shape, drawn over a stub of wall. */
const PROFILE: Record<RoofShape, string> = {
  gable: `M 3 ${H - 9} L ${W / 2} 6 L ${W - 3} ${H - 9}`,
  hip: `M 3 ${H - 9} L 13 6 L ${W - 13} 6 L ${W - 3} ${H - 9}`,
  shed: `M 3 ${H - 9} L ${W - 3} 6`,
  flat: `M 3 9 L ${W - 3} 9`,
}

/**
 * Roof shapes are nearly impossible to tell apart by name, so each option in
 * the catalogue carries a small section drawing of its profile instead.
 *
 * Bare SVG with no chrome of its own: it sits inside a `Swatch`, which owns
 * the tile, the selected ring and the caption, like every other option on the
 * screen.
 */
export function RoofShapePreview({ shape }: { shape: RoofShape }) {
  const theme = useTheme()

  return (
    <svg width={W} height={H} aria-hidden>
      <path
        d={PROFILE[shape]}
        fill="none"
        stroke={theme.scene.wall}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Wall stubs, so the profile reads as a roof on a building. */}
      <line x1={7} y1={H - 9} x2={7} y2={H - 2} stroke={theme.scene.dimension} strokeWidth={1.5} />
      <line
        x1={W - 7}
        y1={H - 9}
        x2={W - 7}
        y2={H - 2}
        stroke={theme.scene.dimension}
        strokeWidth={1.5}
      />
    </svg>
  )
}
