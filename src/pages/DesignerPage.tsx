import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useDrawingState } from '../drawing/useDrawingState'
import { findNodeAt, findWallAt } from '../drawing/geometry'
import type { Point } from '../drawing/types'
import { DrawingCanvas } from '../scene/DrawingCanvas'
import { AreaSummary } from '../ui/AreaSummary'
import { EstimatePanel } from '../ui/EstimatePanel'
import { LeadFormDialog } from '../ui/LeadFormDialog'
import { CanvasContextMenu, type ContextTarget } from '../ui/CanvasContextMenu'
import { estimatePrice } from '../pricing/estimate'
import { PLACEHOLDER_PRICE_CONFIG, loadPriceConfig } from '../pricing/config'
import type { MaterialGrade } from '../pricing/types'
import { leadRepository } from '../leads/localStorageRepository'
import type { LeadContact } from '../leads/types'

export function DesignerPage() {
  const { t } = useTranslation()
  const {
    state,
    roomArea,
    rooms,
    exteriorWallIds,
    addWall,
    beginNodeDrag,
    updateNodePosition,
    finalizeNodeMove,
    removeWall,
    removeNode,
    copyWall,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDrawingState()

  const [grade, setGrade] = useState<MaterialGrade>('standard')
  const [formOpen, setFormOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null)
  const cancelDrawingRef = useRef<(() => void) | null>(null)

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

  const handleContextMenu = useCallback(
    (point: Point, screen: { x: number; y: number }) => {
      const node = findNodeAt(state, point)
      const wall = node ? null : findWallAt(state, point)
      setContextTarget({ screen, nodeId: node?.id ?? null, wallId: wall?.id ?? null })
    },
    [state],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack shortcuts while the user is typing in the lead form.
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (e.key === 'Escape') {
        cancelDrawingRef.current?.()
        return
      }

      const modifier = e.metaKey || e.ctrlKey
      if (!modifier || e.key.toLowerCase() !== 'z') return

      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

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
        rooms={rooms}
        exteriorWallIds={exteriorWallIds}
        addWall={addWall}
        beginNodeDrag={beginNodeDrag}
        updateNodePosition={updateNodePosition}
        finalizeNodeMove={finalizeNodeMove}
        onContextMenu={handleContextMenu}
        cancelRef={cancelDrawingRef}
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
        <AreaSummary
          area={roomArea}
          roomCount={rooms.length}
          wallCount={state.walls.length}
        />
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
        sx={{ position: 'absolute', bottom: 16, left: 16, maxWidth: 480, pointerEvents: 'none' }}
      >
        {t('canvas.hint')}
        <br />
        {t('canvas.hint2')}
        <br />
        {t('canvas.zoomHint')}
      </Typography>

      <CanvasContextMenu
        target={contextTarget}
        onClose={() => setContextTarget(null)}
        onDeleteWall={removeWall}
        onDeleteNode={removeNode}
        onCopyWall={copyWall}
        onUndo={undo}
        onRedo={redo}
        onClearAll={clearAll}
        canUndo={canUndo}
        canRedo={canRedo}
        hasGeometry={state.walls.length > 0}
      />

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
