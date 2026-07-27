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
import { findFixtureAt } from '../drawing/fixtures'
import { pointInPolygon } from '../drawing/rooms'
import { RoomNameDialog } from '../ui/RoomNameDialog'
import { Scene3D, type Building3DOptions } from '../scene3d/Scene3D'
import { Building3DPanel } from '../ui/Building3DPanel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
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
    placeFixture,
    updateFixturePosition,
    finalizeFixtureMove,
    turnFixture,
    removeFixture,
    dragWallBy,
    finalizeWallMove,
    nameRoom,
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
  const [renaming, setRenaming] = useState(false)
  const [view, setView] = useState<'plan' | 'three'>('plan')
  const [building3d, setBuilding3d] = useState<Building3DOptions>({
    roof: 'gable',
    wall: 'plaster',
    frame: 'aluminium',
    roofMaterial: 'tile',
  })
  const cancelDrawingRef = useRef<(() => void) | null>(null)

  const priceConfig = useMemo(() => loadPriceConfig(), [])
  const openingCounts = useMemo(
    () => ({
      door: state.openings.filter((o) => o.kind === 'door').length,
      window: state.openings.filter((o) => o.kind === 'window').length,
    }),
    [state.openings],
  )
  const estimate = useMemo(
    () => estimatePrice(roomArea, grade, priceConfig, openingCounts),
    [roomArea, grade, priceConfig, openingCounts],
  )

  const usingPlaceholderRates = useMemo(
    () =>
      JSON.stringify(priceConfig.pricePerSqm) ===
      JSON.stringify(PLACEHOLDER_PRICE_CONFIG.pricePerSqm),
    [priceConfig],
  )

  const handleContextMenu = useCallback(
    (point: Point, screen: { x: number; y: number }) => {
      const fixture = findFixtureAt(state.fixtures, point)
      const opening = fixture ? null : findOpeningAt(placeOpenings(state, exteriorWallIds), point)
      const node = fixture || opening ? null : findNodeAt(state, point)
      const wall = fixture || opening || node ? null : findWallAt(state, point)
      const room = rooms.find((item) => pointInPolygon(point, item.polygon))
      const existingLabel = room
        ? state.roomLabels.find((item) => pointInPolygon(item, room.polygon))
        : undefined

      setContextTarget({
        screen,
        point,
        nodeId: node?.id ?? null,
        wallId: wall?.id ?? null,
        openingId: opening?.id ?? null,
        fixtureId: fixture?.id ?? null,
        roomLabelId: existingLabel?.id ?? null,
        roomLabelName: existingLabel ? existingLabel.name : '',
        insideRoom: room !== undefined,
      })
    },
    [state, exteriorWallIds, rooms],
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
        activeFixture={tool.type === 'fixture' ? tool.kind : null}
        onSelectFixture={(kind) =>
          setTool(kind ? { type: 'fixture', kind } : SELECT_TOOL)
        }
      />

      <Box sx={{ position: 'relative', flexGrow: 1, minWidth: 0 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, next: 'plan' | 'three' | null) => next && setView(next)}
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2,
          bgcolor: 'background.paper',
        }}
      >
        <ToggleButton value="plan">{t('view.plan')}</ToggleButton>
        <ToggleButton value="three">{t('view.three')}</ToggleButton>
      </ToggleButtonGroup>

      {view === 'three' ? (
        <Scene3D state={state} exteriorWallIds={exteriorWallIds} options={building3d} />
      ) : (
      <>
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
        placeFixture={placeFixture}
        updateFixturePosition={updateFixturePosition}
        finalizeFixtureMove={finalizeFixtureMove}
        dragWallBy={dragWallBy}
        finalizeWallMove={finalizeWallMove}
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
      </>
      )}
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
        {view === 'three' && (
          <Building3DPanel options={building3d} onChange={setBuilding3d} />
        )}
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
        onDeleteFixture={removeFixture}
        onRotateFixture={turnFixture}
        onRenameRoom={() => setRenaming(true)}
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

      <RoomNameDialog
        open={renaming}
        initialName={
          contextTarget?.roomLabelName.startsWith('rooms.')
            ? t(contextTarget.roomLabelName)
            : (contextTarget?.roomLabelName ?? '')
        }
        onClose={() => setRenaming(false)}
        onSave={(name) => {
          if (!contextTarget) return
          nameRoom(contextTarget.point, name, contextTarget.roomLabelId ?? undefined)
        }}
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
