import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { RoofShape } from '../drawing/roof'

const W = 40
const H = 26

/** Section profile of each roof shape, drawn over a stub of wall. */
const PROFILE: Record<RoofShape, string> = {
  gable: `M 2 ${H - 6} L ${W / 2} 4 L ${W - 2} ${H - 6}`,
  hip: `M 2 ${H - 6} L 11 4 L ${W - 11} 4 L ${W - 2} ${H - 6}`,
  shed: `M 2 ${H - 6} L ${W - 2} 4`,
  flat: `M 2 6 L ${W - 2} 6`,
}

export function RoofPreview({
  shape,
  label,
  selected,
  onClick,
}: {
  shape: RoofShape
  label: string
  selected: boolean
  onClick: () => void
}) {
  const theme = useTheme()

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        flexDirection: 'column',
        gap: 0.25,
        p: 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
      }}
    >
      <svg width={W} height={H} aria-hidden>
        <path
          d={PROFILE[shape]}
          fill="none"
          stroke={theme.scene.wall}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Wall stubs, so the profile reads as a roof on a building. */}
        <line
          x1={5}
          y1={H - 6}
          x2={5}
          y2={H - 1}
          stroke={theme.scene.dimension}
          strokeWidth={1.5}
        />
        <line
          x1={W - 5}
          y1={H - 6}
          x2={W - 5}
          y2={H - 1}
          stroke={theme.scene.dimension}
          strokeWidth={1.5}
        />
      </svg>
      <Typography variant="caption" sx={{ lineHeight: 1.1 }}>
        {label}
      </Typography>
    </ButtonBase>
  )
}
