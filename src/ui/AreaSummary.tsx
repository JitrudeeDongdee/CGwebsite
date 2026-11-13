import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface AreaSummaryProps {
  /** Enclosed rooms of the storey on screen, or null when none are closed. */
  area: number | null
  roomCount: number
  wallCount: number
  /** Every storey's area, ground floor first. One entry = a single-storey house. */
  floorAreas?: (number | null)[]
  /** The storey on screen, so its row can be marked. */
  activeFloor?: number
  /** Drop the card chrome — inside the catalogue dock it is a card already. */
  bare?: boolean
}

export function AreaSummary({
  area,
  roomCount,
  wallCount,
  floorAreas,
  activeFloor = 0,
  bare,
}: AreaSummaryProps) {
  const { t } = useTranslation()
  const floors = floorAreas ?? []
  // With one storey the headline number already IS the house, so a breakdown
  // would just repeat it back.
  const showFloors = floors.length > 1
  const houseTotal = floors.reduce((sum: number, one) => sum + (one ?? 0), 0)

  return (
    <Paper
      elevation={0}
      sx={
        bare
          ? { p: 0, width: '100%', bgcolor: 'transparent' }
          : { p: 2, minWidth: 200, border: 1, borderColor: 'divider' }
      }
    >
      <Typography variant="overline" color="text.secondary">
        {t('summary.title')}
      </Typography>

      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {showFloors ? t('summary.floorArea', { n: activeFloor + 1 }) : t('summary.roomArea')}
        </Typography>
        {area !== null ? (
          <Typography variant="h2" component="p" color="primary">
            {area.toFixed(2)}{' '}
            <Typography variant="body1" component="span" color="text.secondary">
              {t('summary.squareMeters')}
            </Typography>
          </Typography>
        ) : (
          <>
            <Typography variant="body1">{t('summary.noRoom')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('summary.noRoomHint')}
            </Typography>
          </>
        )}
      </Stack>

      {showFloors && (
        <Stack spacing={0.25} sx={{ mt: 1.5 }}>
          {floors.map((one, level) => (
            <Stack
              key={level}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
            >
              <Typography
                variant="body2"
                color={level === activeFloor ? 'primary' : 'text.secondary'}
                sx={{ fontWeight: level === activeFloor ? 600 : 400 }}
              >
                {t('floors.nth', { n: level + 1 })}
              </Typography>
              <Typography variant="body2">
                {one !== null ? `${one.toFixed(2)} ${t('summary.squareMeters')}` : '—'}
              </Typography>
            </Stack>
          ))}
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', pt: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('summary.houseTotal')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {houseTotal.toFixed(2)} {t('summary.squareMeters')}
            </Typography>
          </Stack>
        </Stack>
      )}

      <Stack spacing={0.5} sx={{ mt: 2 }}>
        {roomCount > 0 && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography variant="body2" color="text.secondary">
              {t('summary.roomCount')}
            </Typography>
            <Typography variant="body2">
              {roomCount} {t('summary.roomUnit')}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="body2" color="text.secondary">
            {t('summary.wallCount')}
          </Typography>
          <Typography variant="body2">
            {wallCount} {t('summary.wallUnit')}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  )
}
