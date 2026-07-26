import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import DoorFront from '@mui/icons-material/DoorFront'
import Window from '@mui/icons-material/Window'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { OPENING_PRESETS } from '../drawing/openings'
import { FIXTURE_CATALOG } from '../drawing/fixtures'
import type { FixtureKind, OpeningKind } from '../drawing/types'

export interface OpeningTool {
  kind: OpeningKind
  width: number
}

interface ToolSidebarProps {
  activeOpening: OpeningTool | null
  onSelectOpening: (tool: OpeningTool | null) => void
  onLoadTemplate: (templateId: string) => void
  activeFixture: FixtureKind | null
  onSelectFixture: (kind: FixtureKind | null) => void
}

export function ToolSidebar({
  activeOpening,
  onSelectOpening,
  onLoadTemplate,
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
        {t('templates.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {t('templates.hint')}
      </Typography>

      <Stack spacing={1}>
        {PLAN_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant="outlined"
            size="small"
            onClick={() => onLoadTemplate(template.id)}
            sx={{ justifyContent: 'space-between', textAlign: 'left' }}
          >
            <span>{t(template.nameKey)}</span>
            <Typography variant="caption" color="text.secondary">
              {template.width}×{template.depth}
            </Typography>
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
              startIcon={preset.kind === 'door' ? <DoorFront /> : <Window />}
              onClick={() =>
                onSelectOpening(
                  selected ? null : { kind: preset.kind, width: preset.width },
                )
              }
              sx={{ justifyContent: 'flex-start' }}
            >
              {t(preset.labelKey)}
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
            sx={{ justifyContent: 'space-between', textAlign: 'left' }}
          >
            <span>{t(spec.labelKey)}</span>
            <Typography variant="caption" color="text.secondary">
              {spec.width}×{spec.depth}
            </Typography>
          </Button>
        ))}
      </Stack>
    </Paper>
  )
}
