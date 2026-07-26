import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { MATERIAL_GRADES, type MaterialGrade, type PriceEstimate } from '../pricing/types'
import { formatCurrency } from '../pricing/estimate'

const GRADE_LABEL_KEYS: Record<MaterialGrade, string> = {
  economy: 'estimate.gradeEconomy',
  standard: 'estimate.gradeStandard',
  premium: 'estimate.gradePremium',
}

interface EstimatePanelProps {
  grade: MaterialGrade
  onGradeChange: (grade: MaterialGrade) => void
  estimate: PriceEstimate | null
  onSubmit: () => void
  /** True while the configured rates are still the placeholder defaults. */
  usingPlaceholderRates: boolean
}

export function EstimatePanel({
  grade,
  onGradeChange,
  estimate,
  onSubmit,
  usingPlaceholderRates,
}: EstimatePanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'

  return (
    <Paper elevation={0} sx={{ p: 2, width: 280, border: 1, borderColor: 'divider' }}>
      <Typography variant="overline" color="text.secondary">
        {t('estimate.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
        {t('estimate.grade')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={grade}
        onChange={(_, next: MaterialGrade | null) => next && onGradeChange(next)}
      >
        {MATERIAL_GRADES.map((option) => (
          <ToggleButton key={option} value={option}>
            {t(GRADE_LABEL_KEYS[option])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Divider sx={{ my: 2 }} />

      {estimate ? (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            {t('estimate.total')}
          </Typography>
          <Typography variant="h2" component="p" color="primary">
            {formatCurrency(estimate.total, estimate.currency, locale)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {estimate.areaSqm.toFixed(2)} {t('summary.squareMeters')} ×{' '}
            {formatCurrency(estimate.pricePerSqm, estimate.currency, locale)}{' '}
            {t('estimate.perSqm')} ={' '}
            {formatCurrency(estimate.areaCost, estimate.currency, locale)}
          </Typography>

          {/* Openings are a separate line so it's clear that adding a door
              or window is what moved the number. */}
          {estimate.openingsCost > 0 && (
            <Typography variant="caption" color="text.secondary">
              {t('estimate.openingsLine', {
                doors: estimate.openings.door,
                windows: estimate.openings.window,
              })}{' '}
              = {formatCurrency(estimate.openingsCost, estimate.currency, locale)}
            </Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('estimate.unavailable')}
        </Typography>
      )}

      {/*
        Required by the project plan: the customer must always be told this
        is preliminary, so it renders whenever a number is on screen.
      */}
      {estimate && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0 }}>
          <Typography variant="caption">{t('estimate.disclaimer')}</Typography>
        </Alert>
      )}

      {usingPlaceholderRates && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1, py: 0 }}>
          <Typography variant="caption">{t('estimate.placeholderWarning')}</Typography>
        </Alert>
      )}

      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={onSubmit}>
        {t('estimate.submit')}
      </Button>
    </Paper>
  )
}
