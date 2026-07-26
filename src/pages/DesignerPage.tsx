import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useDrawingState } from '../drawing/useDrawingState'
import { DrawingCanvas } from '../scene/DrawingCanvas'
import { AreaSummary } from '../ui/AreaSummary'
import { EstimatePanel } from '../ui/EstimatePanel'
import { LeadFormDialog } from '../ui/LeadFormDialog'
import { estimatePrice } from '../pricing/estimate'
import { PLACEHOLDER_PRICE_CONFIG, loadPriceConfig } from '../pricing/config'
import type { MaterialGrade } from '../pricing/types'
import { leadRepository } from '../leads/localStorageRepository'
import type { LeadContact } from '../leads/types'

export function DesignerPage() {
  const { t } = useTranslation()
  const { state, addWall, updateNodePosition, finalizeNodeMove, roomArea } = useDrawingState()

  const [grade, setGrade] = useState<MaterialGrade>('standard')
  const [formOpen, setFormOpen] = useState(false)
  const [sent, setSent] = useState(false)

  const priceConfig = useMemo(() => loadPriceConfig(), [])
  const estimate = useMemo(
    () => estimatePrice(roomArea, grade, priceConfig),
    [roomArea, grade, priceConfig],
  )

  const usingPlaceholderRates = useMemo(
    () =>
      JSON.stringify(priceConfig.pricePerSqm) ===
      JSON.stringify(PLACEHOLDER_PRICE_CONFIG.pricePerSqm),
    [priceConfig],
  )

  const handleSubmit = async (contact: LeadContact) => {
    await leadRepository.create({
      contact,
      // Snapshot so later edits to the canvas don't mutate what was sent.
      plan: structuredClone(state),
      grade,
      estimate,
    })
    setFormOpen(false)
    setSent(true)
  }

  return (
    <Box sx={{ position: 'relative', flexGrow: 1, minHeight: 0 }}>
      <DrawingCanvas
        state={state}
        addWall={addWall}
        updateNodePosition={updateNodePosition}
        finalizeNodeMove={finalizeNodeMove}
      />

      <Stack
        spacing={1}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          alignItems: 'stretch',
          maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto',
        }}
      >
        <AreaSummary area={roomArea} wallCount={state.walls.length} />
        <EstimatePanel
          grade={grade}
          onGradeChange={setGrade}
          estimate={estimate}
          onSubmit={() => setFormOpen(true)}
          usingPlaceholderRates={usingPlaceholderRates}
        />
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ position: 'absolute', bottom: 16, left: 16, maxWidth: 420, pointerEvents: 'none' }}
      >
        {t('canvas.hint')}
        <br />
        {t('canvas.zoomHint')}
      </Typography>

      <LeadFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        hasEstimate={estimate !== null}
      />

      <Snackbar open={sent} autoHideDuration={5000} onClose={() => setSent(false)}>
        <Alert severity="success" onClose={() => setSent(false)}>
          {t('lead.success')}
        </Alert>
      </Snackbar>
    </Box>
  )
}
