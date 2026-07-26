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
import { ToolSidebar } from '../ui/ToolSidebar'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { findOpeningAt, placeOpenings } from '../drawing/openings'
import { BottomToolbar } from '../ui/BottomToolbar'
import { DRAW_TOOL, SELECT_TOOL, type ToolMode } from '../drawing/tools'
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
    placeOpening,
    removeOpening,
    applyTemplate,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDrawingState()

  const [grade, setGrade] = useState<MaterialGrade>('standard')
  const [formOpen, setFormOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null)
  const [tool, setTool] = useState<ToolMode>(DRAW_TOOL)
  const [fitToken, setFitToken] = useState(0)
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
      const opening = findOpeningAt(placeOpenings(state, exteriorWallIds), point)
      const node = opening ? null : findNodeAt(state, point)
      const wall = opening || node ? null : findWallAt(state, point)
      setContextTarget({
        screen,
        nodeId: node?.id ?? null,
        wallId: wall?.id ?? null,
        openingId: opening?.id ?? null,
      })
    },
    [state, exteriorWallIds],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack shortcuts while the user is typing in the lead form.
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (e.key === 'Escape') {
        // Drop back to plain drawing rather than leaving a tool armed.
        setTool((current) => (current.type === 'opening' ? DRAW_TOOL : current))
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

  const handleLoadTemplate = (templateId: string) => {
    const template = PLAN_TEMPLATES.find((item) => item.id === templateId)
    if (!template) return
    applyTemplate(template.build())
    setTool(SELECT_TOOL)
    cancelDrawingRef.current?.()
    setFitToken((n) => n + 1)
  }

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
      <ToolSidebar
        activeOpening={tool.type === 'opening' ? { kind: tool.kind, width: tool.width } : null}
        onSelectOpening={(next) =>
          setTool(next ? { type: 'opening', ...next } : DRAW_TOOL)
        }
        onLoadTemplate={handleLoadTemplate}
      />

      <Box sx={{ position: 'relative', flexGrow: 1, minWidth: 0 }}>
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
        tool={tool}
        fitToken={fitToken}
        placeOpening={placeOpening}
      />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ position: 'absolute', bottom: 12, left: 12, maxWidth: '70%', pointerEvents: 'none' }}
      >
        {t('canvas.hint')}
        <br />
        {t('canvas.hint2')}
        <br />
        {t('canvas.zoomHint')}
      </Typography>
      <BottomToolbar
        tool={tool}
        onSelectTool={(type) => setTool(type === 'draw' ? DRAW_TOOL : SELECT_TOOL)}
        onUndo={undo}
        onRedo={redo}
        onFit={() => setFitToken((n) => n + 1)}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      </Box>

      <Stack
        spacing={1}
        sx={{
          width: 288,
          flexShrink: 0,
          borderLeft: 1,
          borderColor: 'divider',
          overflowY: 'auto',
          p: 2,
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

      <CanvasContextMenu
        target={contextTarget}
        onClose={() => setContextTarget(null)}
        onDeleteOpening={removeOpening}
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
