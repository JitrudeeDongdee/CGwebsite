import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface AreaSummaryProps {
  area: number | null
  wallCount: number
}

export function AreaSummary({ area, wallCount }: AreaSummaryProps) {
  const { t } = useTranslation()

  return (
    <Paper elevation={0} sx={{ p: 2, minWidth: 200, border: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="text.secondary">
        {t('summary.title')}
      </Typography>

      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('summary.roomArea')}
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

      <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'baseline' }}>
        <Typography variant="body2" color="text.secondary">
          {t('summary.wallCount')}
        </Typography>
        <Typography variant="body2">
          {wallCount} {t('summary.wallUnit')}
        </Typography>
      </Stack>
    </Paper>
  )
}
