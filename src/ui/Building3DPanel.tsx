import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { ROOF_SHAPES, type RoofShape } from '../drawing/roof'
import {
  FRAME_MATERIALS,
  ROOF_MATERIALS,
  WALL_MATERIALS,
  type FrameMaterial,
  type RoofMaterial,
  type WallMaterial,
} from '../drawing/materials'
import type { Building3DOptions } from '../scene3d/Scene3D'
import { RoofPreview } from './RoofPreview'

interface Building3DPanelProps {
  options: Building3DOptions
  onChange: (options: Building3DOptions) => void
}

function Choice<T extends string>({
  label,
  value,
  values,
  labelPrefix,
  onChange,
}: {
  label: string
  value: T
  values: readonly T[]
  labelPrefix: string
  onChange: (next: T) => void
}) {
  const { t } = useTranslation()

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: T | null) => next && onChange(next)}
        sx={{ flexWrap: 'wrap' }}
      >
        {values.map((item) => (
          <ToggleButton key={item} value={item} sx={{ flex: '1 0 auto', px: 1 }}>
            {t(`${labelPrefix}.${item}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  )
}

export function Building3DPanel({ options, onChange }: Building3DPanelProps) {
  const { t } = useTranslation()

  return (
    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="text.secondary">
        {t('building3d.title')}
      </Typography>

      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack spacing={0.75}>
          <Typography variant="body2" color="text.secondary">
            {t('building3d.roofShape')}
          </Typography>
          {/* Roof shapes are hard to tell apart by name, so each option
              carries a small section drawing of its profile. */}
          <Stack direction="row" spacing={0.5}>
            {ROOF_SHAPES.map((shape) => (
              <RoofPreview
                key={shape}
                shape={shape}
                selected={options.roof === shape}
                label={t(`building3d.roof.${shape}`)}
                onClick={() => onChange({ ...options, roof: shape })}
              />
            ))}
          </Stack>
        </Stack>

        <Choice<RoofMaterial>
          label={t('building3d.roofMaterial')}
          value={options.roofMaterial}
          values={ROOF_MATERIALS}
          labelPrefix="building3d.roofMat"
          onChange={(roofMaterial) => onChange({ ...options, roofMaterial })}
        />

        <Choice<WallMaterial>
          label={t('building3d.wallMaterial')}
          value={options.wall}
          values={WALL_MATERIALS}
          labelPrefix="building3d.wallMat"
          onChange={(wall) => onChange({ ...options, wall })}
        />

        <Choice<FrameMaterial>
          label={t('building3d.frameMaterial')}
          value={options.frame}
          values={FRAME_MATERIALS}
          labelPrefix="building3d.frameMat"
          onChange={(frame) => onChange({ ...options, frame })}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {t('building3d.note')}
      </Typography>
    </Paper>
  )
}

export type { RoofShape }
