import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useDrawingState } from '../drawing/useDrawingState'
import { findNodeAt, findWallAt } from '../drawing/geometry'
import type { Point } from '../drawing/types'
import { PlanEditor } from '../sheet/PlanEditor'
import { AreaSummary } from '../ui/AreaSummary'
import { EstimatePanel } from '../ui/EstimatePanel'
import { LeadFormDialog } from '../ui/LeadFormDialog'
import { CanvasContextMenu, type ContextTarget } from '../ui/CanvasContextMenu'
import { ToolSidebar } from '../ui/ToolSidebar'
import { wallTypeById } from '../drawing/wallTypes'
import { findOpeningAt, placeOpenings } from '../drawing/openings'
import { findFixtureAt } from '../drawing/fixtures'
import { pointInPolygon } from '../drawing/rooms'
import { RoomNameDialog } from '../ui/RoomNameDialog'
import { Scene3DLoading } from '../ui/Scene3DLoading'
import { useSeo } from '../seo/useSeo'
import type { Building3DOptions } from '../scene3d/Scene3D'
import type { HouseFinish } from '../drawing/houseStyle'
import { ROOF_FINISH, WALL_FINISH } from '../drawing/materials'

/**
 * three.js + r3f + drei is ~570 kB of the designer's chunk, and it is only needed
 * once someone actually switches to the 3D view. Splitting it here means opening
 * /design loads the 2D editor alone; the 3D engine downloads on the first click
 * of the "3D" toggle.
 */
const Scene3D = lazy(() => import('../scene3d/Scene3D').then((m) => ({ default: m.Scene3D })))
import { Building3DPanel } from '../ui/Building3DPanel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { BottomToolbar } from '../ui/BottomToolbar'
import { DRAW_TOOL, SELECT_TOOL, type ToolMode } from '../drawing/tools'
import { estimatePrice } from '../pricing/estimate'
import { PLACEHOLDER_PRICE_CONFIG, loadPriceConfig } from '../pricing/config'
import type { MaterialGrade } from '../pricing/types'
import { leadRepository } from '../leads/localStorageRepository'
import type { LeadContact } from '../leads/types'
import { PlanGallery } from '../ui/PlanGallery'
import { useAuth } from '../auth/AuthProvider'
import type { DrawingState } from '../drawing/types'

/** The little chevron that opens or closes one side panel. */
function PanelHandle({
  side,
  open,
  onToggle,
  label,
}: {
  side: 'left' | 'right'
  open: boolean
  onToggle: () => void
  label: string
}) {
  // Points the way it will move the panel: a left handle shows "<" while the
  // panel is open (click to tuck it away) and ">" once it is shut.
  const pointsLeft = side === 'left' ? open : !open
  return (
    <Tooltip title={label} placement={side === 'left' ? 'right' : 'left'}>
      <IconButton
        onClick={onToggle}
        size="small"
        aria-label={label}
        sx={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          [side]: 4,
          zIndex: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          // Tall and narrow, so it reads as a panel edge rather than a button
          // floating on the drawing.
          borderRadius: 1.5,
          width: 22,
          height: 56,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        {pointsLeft ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}

/**
 * Whether a side panel is open, remembered per visitor.
 *
 * The two panels cost 520px of a fixed-height layout, which is most of a small
 * laptop — so the house itself gets whatever is left. Both therefore start
 * CLOSED below `lg` and open above it, and an explicit choice always wins over
 * that default, in either direction.
 *
 * Read inside the initialiser rather than an effect: starting open and snapping
 * shut after mount would reflow the canvas (and re-fit the plan) on every load.
 * localStorage throws outright when site data is blocked, so every access is
 * wrapped — a panel that cannot remember its state is still a working panel.
 */
function usePanelOpen(key: string, defaultOpen: boolean) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved === 'open') return true
      if (saved === 'closed') return false
    } catch {
      /* blocked site data — fall through to the width-based default */
    }
    return defaultOpen
  })

  const set = useCallback(
    (next: boolean) => {
      setOpen(next)
      try {
        localStorage.setItem(key, next ? 'open' : 'closed')
      } catch {
        /* ignore — the choice just will not survive a reload */
      }
    },
    [key],
  )

  return [open, set] as const
}

export function DesignerPage() {
  const { t } = useTranslation()
  const { requireAuth } = useAuth()
  // /design is in the sitemap, so Google is actively invited here — but the page
  // carried index.html's site-wide title and no canonical, which made it a
  // duplicate of the home page. It is not prerendered (three.js), so this is the
  // only place the head gets set.
  useSeo({ title: t('app.seoTitle'), description: t('app.seoDesc') })
  const theme = useTheme()
  // 232 + 288 of chrome leaves a 1024px screen about 500px for the drawing.
  const roomy = useMediaQuery(theme.breakpoints.up('lg'))
  const [toolsOpen, setToolsOpen] = usePanelOpen('cg:designer-tools-panel', roomy)
  const [infoOpen, setInfoOpen] = usePanelOpen('cg:designer-info-panel', roomy)
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
  /** False until the 3D view has drawn a frame; the loading cover reads it. */
  const [sceneReady, setSceneReady] = useState(false)
  const [building3d, setBuilding3d] = useState<Building3DOptions>({
    roof: 'gable',
    pitch: 'medium',
    storeys: 1,
    wall: 'plaster',
    wallColor: WALL_FINISH.plaster.defaultColor,
    frame: 'aluminium',
    roofMaterial: 'tile',
    roofColor: ROOF_FINISH.tile.defaultColor,
    showRoof: true,
    furniture: true,
    scenery: true,
    eaves: 'normal',
  })
  const cancelDrawingRef = useRef<(() => void) | null>(null)

  // Never leave the cover up for ever. If the first frame does not arrive —
  // WebGL refused, the context was lost, the tab was in the background the
  // whole time — hiding the canvas hides the evidence too.
  useEffect(() => {
    if (view !== 'three' || sceneReady) return
    const timer = window.setTimeout(() => setSceneReady(true), 8000)
    return () => window.clearTimeout(timer)
  }, [view, sceneReady])

  // Pull the 3D engine down while the customer is still drawing, and draw its
  // surface patterns ahead of time. Measured on the live site: 241 kB gzip
  // (920 kB parsed) plus ~1.5 s of pattern drawing, all of it on the click.
  // Doing it on idle costs a visit that never opens 3D one background
  // download, and turns the click itself into roughly nothing.
  useEffect(() => {
    let cancelled = false

    const warm = () => {
      if (cancelled) return
      void import('../scene3d/Scene3D')
        .then((module) => {
          if (!cancelled) module.warmDefaultPatterns()
        })
        .catch(() => {
          /* the view loads normally on click if this never ran */
        })
    }

    // Deliberately after the editor has settled, never competing with it.
    const idle = window.requestIdleCallback
    if (idle) {
      const handle = idle(warm, { timeout: 6000 })
      return () => {
        cancelled = true
        window.cancelIdleCallback?.(handle)
      }
    }

    const timer = window.setTimeout(warm, 2500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

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

  // A plan arrives either as a template id (sidebar) or a full state (gallery
  // card / uploaded file); both funnel through here so loading behaves the same.
  const handleLoadPlanState = (next: DrawingState, finish?: HouseFinish) => {
    applyTemplate(next)
    // A sample plan carries the finishes it is meant to be seen in.
    if (finish) setBuilding3d((current) => ({ ...current, ...finish }))
    setTool(SELECT_TOOL)
    cancelDrawingRef.current?.()
    setFitToken((n) => n + 1)
  }

  // Picking a wall type arms draw mode with that thickness.
  const handleSelectWallType = (id: string) => {
    setTool({ type: 'draw', wallTypeId: id, thickness: wallTypeById(id).thickness })
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* Editor fills the viewport; the gallery sits just below the fold so
          it's reached by scrolling down, per the agreed layout. */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', flexShrink: 0 }}>
      {toolsOpen && (
      <ToolSidebar
        activeOpening={tool.type === 'opening' ? { kind: tool.kind, width: tool.width } : null}
        onSelectOpening={(next) =>
          setTool(next ? { type: 'opening', ...next } : DRAW_TOOL)
        }
        activeWallTypeId={tool.type === 'draw' ? tool.wallTypeId : null}
        onSelectWallType={handleSelectWallType}
        view={view === 'three' ? '3d' : '2d'}
        activeFixture={tool.type === 'fixture' ? tool.kind : null}
        onSelectFixture={(kind) =>
          setTool(kind ? { type: 'fixture', kind } : SELECT_TOOL)
        }
      />
      )}

      <Box sx={{ position: 'relative', flexGrow: 1, minWidth: 0 }}>
      {/* Edge handles, vertically centred: the top-left corner is taken by the
          plan/3D toggle and the bottom by the hint text and the toolbar. They
          live inside the canvas box (the only `position: relative` ancestor) so
          they stay reachable whether their panel is open or shut. */}
      <PanelHandle
        side="left"
        open={toolsOpen}
        onToggle={() => setToolsOpen(!toolsOpen)}
        label={t(toolsOpen ? 'app.panelToolsHide' : 'app.panelToolsShow')}
      />
      <PanelHandle
        side="right"
        open={infoOpen}
        onToggle={() => setInfoOpen(!infoOpen)}
        label={t(infoOpen ? 'app.panelInfoHide' : 'app.panelInfoShow')}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, next: 'plan' | 'three' | null) => {
          if (!next) return
          // Scene3D unmounts when the view leaves 3D, so coming back draws
          // from scratch and the cover has to come back with it.
          if (next === 'three') setSceneReady(false)
          setView(next)
        }}
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
        <>
          <Suspense fallback={null}>
            <Scene3D
              state={state}
              exteriorWallIds={exteriorWallIds}
              options={building3d}
              onReady={() => setSceneReady(true)}
            />
          </Suspense>
          {/* One cover for the whole wait — the chunk download AND the first
              frame. The Suspense fallback alone ended at the download, which
              is why the canvas sat blank afterwards. */}
          {!sceneReady && <Scene3DLoading state={state} />}
        </>
      ) : (
      <>
      <PlanEditor
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

      {infoOpen && (
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
          onSubmit={() => requireAuth(() => setFormOpen(true))}
          usingPlaceholderRates={usingPlaceholderRates}
        />
      </Stack>
      )}
      </Box>

      <PlanGallery currentState={state} onLoadPlan={handleLoadPlanState} />

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
