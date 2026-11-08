import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { ROOF_PITCHES, ROOF_SHAPES, type RoofPitch, type RoofShape } from '../drawing/roof'
import {
  FRAME_MATERIALS,
  ROOF_COLORS,
  ROOF_FINISH,
  ROOF_MATERIALS,
  WALL_COLORS,
  WALL_FINISH,
  WALL_MATERIALS,
  type ColorOption,
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  )
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
    <Field label={label}>
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
    </Field>
  )
}

/**
 * The colour swatches. A named row rather than a colour picker: these are the
 * finishes the company actually supplies, and a free picker would invite a
 * customer to choose a colour nobody can quote.
 */
function Swatches({
  label,
  value,
  colors,
  onChange,
}: {
  label: string
  value: string
  colors: readonly ColorOption[]
  onChange: (hex: string) => void
}) {
  const { t } = useTranslation()

  return (
    <Field label={label}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {colors.map((option) => {
          const selected = value.toLowerCase() === option.hex.toLowerCase()
          return (
            <Tooltip key={option.id} title={t(`building3d.color.${option.id}`)}>
              <Box
                component="button"
                type="button"
                aria-label={t(`building3d.color.${option.id}`)}
                aria-pressed={selected}
                onClick={() => onChange(option.hex)}
                sx={{
                  width: 28,
                  height: 28,
                  p: 0,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  bgcolor: option.hex,
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'divider',
                  outline: selected ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                  outlineOffset: 1,
                }}
              />
            </Tooltip>
          )
        })}
      </Box>
    </Field>
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
        <Field label={t('building3d.view')}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.showRoof ? 'whole' : 'cutaway'}
            onChange={(_, next: 'whole' | 'cutaway' | null) =>
              next && onChange({ ...options, showRoof: next === 'whole' })
            }
          >
            <ToggleButton value="whole" sx={{ flex: 1, px: 1 }}>
              {t('building3d.whole')}
            </ToggleButton>
            <ToggleButton value="cutaway" sx={{ flex: 1, px: 1 }}>
              {t('building3d.cutaway')}
            </ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={options.furniture}
                onChange={(event) => onChange({ ...options, furniture: event.target.checked })}
              />
            }
            label={
              <Typography variant="body2">{t('building3d.furniture')}</Typography>
            }
            sx={{ mr: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={options.scenery}
                onChange={(event) => onChange({ ...options, scenery: event.target.checked })}
              />
            }
            label={<Typography variant="body2">{t('building3d.scenery')}</Typography>}
            sx={{ mr: 0 }}
          />
        </Field>

        <Field label={t('building3d.storeys')}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.storeys}
            onChange={(_, next: number | null) => next && onChange({ ...options, storeys: next })}
          >
            <ToggleButton value={1} sx={{ flex: 1, px: 1 }}>
              {t('building3d.storey1')}
            </ToggleButton>
            <ToggleButton value={2} sx={{ flex: 1, px: 1 }}>
              {t('building3d.storey2')}
            </ToggleButton>
          </ToggleButtonGroup>
          {options.storeys > 1 && (
            <Typography variant="caption" color="text.secondary">
              {t('building3d.storeyNote')}
            </Typography>
          )}
        </Field>

        <Field label={t('building3d.roofShape')}>
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
        </Field>

        {options.roof !== 'flat' && (
          <Choice<RoofPitch>
            label={t('building3d.pitch')}
            value={options.pitch}
            values={ROOF_PITCHES}
            labelPrefix="building3d.pitches"
            onChange={(pitch) => onChange({ ...options, pitch })}
          />
        )}

        <Choice<RoofMaterial>
          label={t('building3d.roofMaterial')}
          value={options.roofMaterial}
          values={ROOF_MATERIALS}
          labelPrefix="building3d.roofMat"
          onChange={(roofMaterial) =>
            onChange({
              ...options,
              roofMaterial,
              // Pick the colour this material usually comes in; the customer
              // can still change it on the row below.
              roofColor: ROOF_FINISH[roofMaterial].defaultColor,
            })
          }
        />

        <Swatches
          label={t('building3d.roofColor')}
          value={options.roofColor}
          colors={ROOF_COLORS}
          onChange={(roofColor) => onChange({ ...options, roofColor })}
        />

        <Choice<WallMaterial>
          label={t('building3d.wallMaterial')}
          value={options.wall}
          values={WALL_MATERIALS}
          labelPrefix="building3d.wallMat"
          onChange={(wall) =>
            onChange({ ...options, wall, wallColor: WALL_FINISH[wall].defaultColor })
          }
        />

        <Swatches
          label={t('building3d.wallColor')}
          value={options.wallColor}
          colors={WALL_COLORS}
          onChange={(wallColor) => onChange({ ...options, wallColor })}
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
