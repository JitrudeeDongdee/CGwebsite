import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { MAX_FLOORS } from '../drawing/floors'

/**
 * Which storey you are drawing.
 *
 * Each floor is its own plan now, so there has to be somewhere to say which
 * one is on screen. It sits on the canvas rather than in the catalogue dock
 * because it decides what the canvas IS, not what you are about to place —
 * and it is stacked top storey first, the way a building is drawn in section,
 * so "ชั้น 2" is above "ชั้น 1" rather than beside it.
 *
 * With one floor it shows nothing but the add button: a lone "ชั้น 1" chip on
 * a single-storey house is a control that explains a concept nobody asked
 * about yet.
 */
export function FloorSwitcher({
  count,
  active,
  onSelect,
  onAdd,
  onRemove,
  mode = '2d',
  shown,
  onShow,
}: {
  count: number
  active: number
  onSelect: (index: number) => void
  onAdd: () => void
  onRemove: () => void
  /**
   * In 2D a floor is the one you EDIT; in 3D it is how far up the house is
   * built, so you can look at the ground floor without the one above it in
   * the way. They are separate states: picking a floor to look at in 3D
   * should not silently change which plan a later edit lands on.
   */
  mode?: '2d' | '3d'
  /** 3D only: the top storey shown, or null for the whole house. */
  shown?: number | null
  onShow?: (level: number | null) => void
}) {
  const { t } = useTranslation()
  // Top storey first.
  const levels = Array.from({ length: count }, (_, i) => count - 1 - i)
  const threeD = mode === '3d'
  const current = threeD ? shown : active
  const pick = (level: number) => (threeD ? onShow?.(level) : onSelect(level))

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 58,
        left: 12,
        zIndex: 2,
        p: 0.5,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        alignItems: 'stretch',
      }}
    >
      {/* 3D only: back to the whole house after looking at one storey. */}
      {count > 1 && threeD && (
        <Tooltip title={t('floors.whole')} placement="right">
          <ButtonBase
            onClick={() => onShow?.(null)}
            aria-label={t('floors.whole')}
            aria-pressed={shown === null}
            sx={{
              px: 1,
              py: 0.5,
              minWidth: 62,
              borderRadius: 1.5,
              border: 1,
              borderColor: shown === null ? 'primary.main' : 'transparent',
              bgcolor: shown === null ? 'action.selected' : 'transparent',
              color: shown === null ? 'primary.main' : 'text.secondary',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: shown === null ? 700 : 400, lineHeight: 1.2 }}
            >
              {t('floors.whole')}
            </Typography>
          </ButtonBase>
        </Tooltip>
      )}

      {count > 1 &&
        levels.map((level) => {
          const selected = level === current
          const title = threeD
            ? t('floors.upTo', { n: level + 1 })
            : t('floors.show', { n: level + 1 })
          return (
            <Tooltip key={level} title={title} placement="right">
              <ButtonBase
                onClick={() => pick(level)}
                aria-label={title}
                aria-pressed={selected}
                sx={{
                  px: 1,
                  py: 0.5,
                  minWidth: 62,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'transparent',
                  bgcolor: selected ? 'action.selected' : 'transparent',
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: selected ? 700 : 400, lineHeight: 1.2 }}
                >
                  {t('floors.nth', { n: level + 1 })}
                </Typography>
              </ButtonBase>
            </Tooltip>
          )
        })}

      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
        {!threeD && count < MAX_FLOORS && (
          <Tooltip title={t('floors.add')} placement="right">
            <ButtonBase
              onClick={onAdd}
              aria-label={t('floors.add')}
              sx={{ p: 0.5, borderRadius: 1.5, color: 'text.secondary' }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </ButtonBase>
          </Tooltip>
        )}
        {/* The ground floor cannot go: a house has one. */}
        {!threeD && count > 1 && active > 0 && (
          <Tooltip title={t('floors.remove', { n: active + 1 })} placement="right">
            <ButtonBase
              onClick={onRemove}
              aria-label={t('floors.remove', { n: active + 1 })}
              sx={{ p: 0.5, borderRadius: 1.5, color: 'text.secondary' }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </ButtonBase>
          </Tooltip>
        )}
      </Box>
    </Paper>
  )
}
