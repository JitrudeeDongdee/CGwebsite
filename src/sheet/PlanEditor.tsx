import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import type { DrawingState, FixtureKind, OpeningKind, Point } from '../drawing/types'
import type { ToolMode } from '../drawing/tools'
import type { Room } from '../drawing/rooms'
import { useInteraction } from '../scene/useInteraction'
import { snapToGrid, findWallAt } from '../drawing/geometry'
import { offsetAlongWall } from '../drawing/openings'
import { fixtureSpec } from '../drawing/fixtures'
import { EXTERIOR_WALL_THICKNESS } from '../drawing/wallOutline'
import { PlanSheet, fitView, type SheetView } from './PlanSheet'
import { sheetBounds } from './planSheetGeometry'

interface PlanEditorProps {
  state: DrawingState
  rooms: Room[]
  exteriorWallIds: ReadonlySet<string>
  addWall: (start: Point, end: Point, thickness?: number) => void
  beginNodeDrag: () => void
  updateNodePosition: (nodeId: string, point: Point) => void
  finalizeNodeMove: (nodeId: string, point: Point) => void
  onContextMenu: (point: Point, screen: { x: number; y: number }) => void
  tool: ToolMode
  fitToken: number
  placeOpening: (wallId: string, offset: number, width: number, kind: OpeningKind) => void
  placeFixture: (kind: FixtureKind, point: Point) => void
  updateFixturePosition: (fixtureId: string, point: Point) => void
  finalizeFixtureMove: (fixtureId: string, point: Point) => void
  dragWallBy: (wallId: string, delta: Point) => void
  finalizeWallMove: (wallId: string) => void
  cancelRef: React.RefObject<(() => void) | null>
}

const MIN_VIEW_WIDTH = 2
const MAX_VIEW_WIDTH = 400

/**
 * The 2D floor-plan editor, drawn as vector SVG. It renders the same
 * `PlanSheet` used for the PDF, and layers interaction on top: pan (middle
 * button / Space-drag), wheel-zoom to the cursor, and — reusing the shared,
 * framework-agnostic `useInteraction` state machine — click-to-draw walls plus
 * drag-to-move for corners, walls and fixtures. Pointer positions are turned
 * into world metres through the SVG's own CTM, so one code path serves mouse
 * and touch alike.
 */
export function PlanEditor({
  state,
  rooms,
  exteriorWallIds,
  addWall,
  beginNodeDrag,
  updateNodePosition,
  finalizeNodeMove,
  onContextMenu,
  tool,
  fitToken,
  placeOpening,
  placeFixture,
  updateFixturePosition,
  finalizeFixtureMove,
  dragWallBy,
  finalizeWallMove,
  cancelRef,
}: PlanEditorProps) {
  const { scene } = useTheme()
  const svgRef = useRef<SVGSVGElement>(null)

  const { draft, moveSnap, cursor, onDown, onMove, onUp, cancelDrawing } = useInteraction({
    state,
    addWall,
    beginNodeDrag,
    updateNodePosition,
    finalizeNodeMove,
    tool,
    placeOpening,
    placeFixture,
    updateFixturePosition,
    finalizeFixtureMove,
    dragWallBy,
    finalizeWallMove,
  })
  cancelRef.current = cancelDrawing

  const [view, setView] = useState<SheetView>(() => fitView(sheetBounds(state)))

  // Re-frame the plan on demand (fit button / template load), never mid-edit.
  const lastFit = useRef(fitToken)
  useEffect(() => {
    if (lastFit.current === fitToken) return
    lastFit.current = fitToken
    setView(fitView(sheetBounds(state)))
  }, [fitToken, state])

  /** Screen pixel → world metres, via the SVG's live coordinate matrix. */
  const toWorld = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  // Pan gesture state kept in refs — it must survive native events without a
  // re-render, same reasoning as the drawing state machine.
  const pan = useRef<{ startX: number; startY: number; startView: SheetView } | null>(null)
  const spaceHeld = useRef(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const unitsPerPixel = useCallback(
    (v: SheetView) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return v.width
      // preserveAspectRatio="meet" fits the whole viewBox, so the scale is
      // uniform on both axes.
      return Math.max(v.width / rect.width, v.height / rect.height)
    },
    [],
  )

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return // right button: context menu handles it
    e.currentTarget.setPointerCapture(e.pointerId)

    if (e.button === 1 || spaceHeld.current) {
      pan.current = { startX: e.clientX, startY: e.clientY, startView: view }
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    if (world) onDown(world)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pan.current) {
      const upp = unitsPerPixel(pan.current.startView)
      setView({
        ...pan.current.startView,
        minX: pan.current.startView.minX - (e.clientX - pan.current.startX) * upp,
        minY: pan.current.startView.minY - (e.clientY - pan.current.startY) * upp,
      })
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    if (world) onMove(world)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (pan.current) {
      pan.current = null
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    if (world) onUp(world)
  }

  const handleContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    // While drawing, a right-click cancels the wall (CAD convention).
    if (cancelDrawing()) return
    const world = toWorld(e.clientX, e.clientY)
    if (world) onContextMenu(world, { x: e.clientX, y: e.clientY })
  }

  // Wheel must be a non-passive native listener so it can preventDefault.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const world = toWorld(e.clientX, e.clientY)
      if (!world) return
      setView((v) => {
        const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1
        const width = Math.min(MAX_VIEW_WIDTH, Math.max(MIN_VIEW_WIDTH, v.width * factor))
        const scale = width / v.width
        const height = v.height * scale
        return {
          width,
          height,
          minX: world.x - (world.x - v.minX) * scale,
          minY: world.y - (world.y - v.minY) * scale,
        }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [toWorld])

  const cursorStyle = pan.current ? 'grabbing' : tool.type === 'select' ? 'default' : 'crosshair'

  return (
    <PlanSheet
      state={state}
      rooms={rooms}
      exteriorWallIds={exteriorWallIds}
      svgRef={svgRef}
      viewBox={view}
      svgProps={{
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onContextMenu: handleContextMenu,
        style: { touchAction: 'none', cursor: cursorStyle },
      }}
      overlay={
        <>
          <Nodes state={state} color={scene.node} />
          <Ghost tool={tool} cursor={cursor} state={state} color={scene.draft} />
          {draft && <DraftWall from={draft.start} to={draft.current} color={scene.draft} />}
          {moveSnap && <SnapRing point={moveSnap.point} color={scene.snap} />}
        </>
      }
    />
  )
}

/** Corner handles — small dots marking every node, as drag targets. */
function Nodes({ state, color }: { state: DrawingState; color: string }) {
  const nodes = useMemo(() => Object.values(state.nodes), [state.nodes])
  return (
    <g fill={color}>
      {nodes.map((n) => (
        <circle key={n.id} cx={n.x} cy={n.y} r={0.09} />
      ))}
    </g>
  )
}

/** Rubber-band line for the wall being drawn. */
function DraftWall({ from, to, color }: { from: Point; to: Point; color: string }) {
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5 4"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={from.x} cy={from.y} r={0.1} fill={color} />
      <circle cx={to.x} cy={to.y} r={0.1} fill={color} />
    </g>
  )
}

/** Ring highlighting a snap target during a drag. */
function SnapRing({ point, color }: { point: Point; color: string }) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={0.2}
      fill="none"
      stroke={color}
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
    />
  )
}

/**
 * A translucent preview of whatever the armed tool is about to place,
 * following the cursor — so its size and position are visible before the
 * click. Mirrors the old r3f GhostPreview, redrawn in SVG.
 */
function Ghost({
  tool,
  cursor,
  state,
  color,
}: {
  tool: ToolMode
  cursor: Point | null
  state: DrawingState
  color: string
}) {
  if (!cursor) return null

  if (tool.type === 'fixture') {
    const spec = fixtureSpec(tool.kind)
    const at = snapToGrid(cursor)
    return (
      <rect
        x={at.x - spec.width / 2}
        y={at.y - spec.depth / 2}
        width={spec.width}
        height={spec.depth}
        fill={color}
        fillOpacity={0.35}
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (tool.type === 'opening') {
    const wall = findWallAt(state, cursor)
    if (!wall) return null
    const offset = offsetAlongWall(state, wall.id, cursor)
    if (offset === null) return null
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length === 0) return null

    const dx = (b.x - a.x) / length
    const dy = (b.y - a.y) / length
    const half = tool.width / 2
    const clamped = Math.min(Math.max(offset, half), Math.max(half, length - half))
    const cx = a.x + dx * clamped
    const cy = a.y + dy * clamped
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const depth = EXTERIOR_WALL_THICKNESS * 1.4

    return (
      <rect
        x={cx - half}
        y={cy - depth / 2}
        width={tool.width}
        height={depth}
        transform={`rotate(${angle} ${cx} ${cy})`}
        fill={color}
        fillOpacity={0.4}
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (tool.type === 'draw') {
    // Before the first click, mark where the next corner would snap to.
    const at = snapToGrid(cursor)
    return (
      <circle
        cx={at.x}
        cy={at.y}
        r={0.14}
        fill={color}
        fillOpacity={0.5}
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  return null
}
