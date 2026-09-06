import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { OPENING_PRESETS } from '../drawing/openings'
import { FIXTURE_CATALOG } from '../drawing/fixtures'
import { WALL_TYPES } from '../drawing/wallTypes'
import { FixturePreview, OpeningPreview, WallTypePreview } from './ItemPreview'
import type { FixtureKind, OpeningKind } from '../drawing/types'

export interface OpeningTool {
  kind: OpeningKind
  width: number
}

interface ToolSidebarProps {
  activeOpening: OpeningTool | null
  onSelectOpening: (tool: OpeningTool | null) => void
  /** Currently armed wall type (draw mode), or null when not drawing walls. */
  activeWallTypeId: string | null
  onSelectWallType: (id: string) => void
  activeFixture: FixtureKind | null
  onSelectFixture: (kind: FixtureKind | null) => void
}

export function ToolSidebar({
  activeOpening,
  onSelectOpening,
  activeWallTypeId,
  onSelectWallType,
  activeFixture,
  onSelectFixture,
}: ToolSidebarProps) {
  const { t } = useTranslation()

  return (
    <Paper
      elevation={0}
      square
      sx={{
        width: 232,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {t('wallTypes.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('wallTypes.hint')}
      </Typography>

      <Stack spacing={1}>
        {WALL_TYPES.map((wallType) => (
          <Button
            key={wallType.id}
            variant={activeWallTypeId === wallType.id ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onSelectWallType(wallType.id)}
            sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1, py: 0.75 }}
          >
            <WallTypePreview thickness={wallType.thickness} />
            <Stack sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
              <span>{t(wallType.labelKey)}</span>
              <Typography variant="caption" color="text.secondary">
                {wallType.thickness ? `${(wallType.thickness * 100).toFixed(0)} cm` : t('wallTypes.autoHint')}
              </Typography>
            </Stack>
          </Button>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="overline" color="text.secondary">
        {t('openings.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {activeOpening ? t('openings.placeHint') : t('openings.hint')}
      </Typography>

      <Stack spacing={1}>
        {OPENING_PRESETS.map((preset) => {
          const selected =
            activeOpening?.kind === preset.kind && activeOpening.width === preset.width
          return (
            <Button
              key={`${preset.kind}-${preset.width}`}
              variant={selected ? 'contained' : 'outlined'}
              size="small"
              onClick={() =>
                onSelectOpening(
                  selected ? null : { kind: preset.kind, width: preset.width },
                )
              }
              sx={{ justifyContent: 'flex-start', gap: 1, py: 0.75 }}
            >
              <OpeningPreview kind={preset.kind} width={preset.width} />
              <span>{t(preset.labelKey)}</span>
            </Button>
          )
        })}
      </Stack>

      {activeOpening && (
        <Button
          fullWidth
          size="small"
          color="inherit"
          onClick={() => onSelectOpening(null)}
          sx={{ mt: 1 }}
        >
          {t('openings.cancel')}
        </Button>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="overline" color="text.secondary">
        {t('fixtures.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('fixtures.hint')}
      </Typography>

      <Stack spacing={1}>
        {FIXTURE_CATALOG.map((spec) => (
          <Button
            key={spec.kind}
            variant={activeFixture === spec.kind ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onSelectFixture(activeFixture === spec.kind ? null : spec.kind)}
            sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1, py: 0.75 }}
          >
            <FixturePreview kind={spec.kind} />
            <Stack sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
              <span>{t(spec.labelKey)}</span>
              <Typography variant="caption" color="text.secondary">
                {spec.width}×{spec.depth}
              </Typography>
            </Stack>
          </Button>
        ))}
      </Stack>
    </Paper>
  )
}
