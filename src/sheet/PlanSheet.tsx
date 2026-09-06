import { createContext, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@mui/material/styles'
import type { DrawingState, Point } from '../drawing/types'
import { computeWallOutlines } from '../drawing/wallOutline'
import { placeOpenings } from '../drawing/openings'
import { pointInPolygon, type Room } from '../drawing/rooms'
import { fixtureSpec } from '../drawing/fixtures'
import {
  dimensionChain,
  nodeDegrees,
  planGrid,
  sheetBounds,
  type SheetBounds,
} from './planSheetGeometry'

/**
 * The floor plan drawn as vector SVG, in the black-on-paper convention of an
 * architectural sheet — the same look as the reference PDF. This is a pure
 * renderer: it reads the shared `DrawingState` (plus derived rooms/exterior
 * set) and draws, holding no interaction state of its own, so the exact same
 * component backs both the on-screen editor and the PDF export.
 *
 * Coordinates are world metres throughout; the SVG `viewBox` is set in metres
 * so the drawing is genuinely to scale. Line *weights* use non-scaling strokes
 * (constant screen/print pixels) the way a real drawing keeps a fixed pen
 * weight regardless of zoom, while wall thicknesses — being real dimensions —
 * scale with the view.
 */

/**
 * Colours the sheet draws with. On screen these follow the app theme (so the
 * paper goes dark in dark mode); the PDF export overrides them with a fixed
 * black-on-white print palette.
 */
export interface SheetPalette {
  paper: string
  ink: string
  dim: string
  grid: string
}

/** Fixed black-on-white, for print/PDF where the sheet must read as paper. */
export const PRINT_SHEET_PALETTE: SheetPalette = {
  paper: '#ffffff',
  ink: '#111111',
  dim: '#444444',
  grid: '#c9c9c9',
}

const PaletteContext = createContext<SheetPalette>(PRINT_SHEET_PALETTE)
const usePalette = () => useContext(PaletteContext)

/** Margin around the plan for dimension runs and grid bubbles, in metres. */
const MARGIN = 2.6
/** How far outside the plan the first dimension run sits. */
const DIM_OFFSET = 1.0
/** Grid bubbles sit beyond the dimension run. */
const BUBBLE_OFFSET = 1.9
const BUBBLE_RADIUS = 0.34

function fmt(metres: number): string {
  return metres.toFixed(2)
}

function ptsToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

/** Hollow double-line walls with mitered corners and square free ends. */
function Walls({
  state,
  exteriorWallIds,
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
}) {
  const outlines = useMemo(
    () => computeWallOutlines(state, exteriorWallIds),
    [state, exteriorWallIds],
  )
  const degrees = useMemo(() => nodeDegrees(state), [state])
  const palette = usePalette()

  return (
    // vector-effect is not inherited, so it must sit on each drawn <path>;
    // otherwise strokeWidth is read in user units (metres) and the walls
    // balloon into a solid fill.
    <g fill="none" stroke={palette.ink}>
      {outlines.map((outline) => {
        const wall = state.walls.find((w) => w.id === outline.wallId)
        const [c0, c1, c2, c3] = outline.corners
        // Long edges of the band (the two parallel wall faces). Corners are
        // already mitered, so adjacent walls' faces meet cleanly without caps.
        const edges = [
          `M ${c0.x} ${c0.y} L ${c1.x} ${c1.y}`,
          `M ${c3.x} ${c3.y} L ${c2.x} ${c2.y}`,
        ]
        // Cap only genuinely free ends; interior joints stay open so the poché
        // reads as continuous.
        if (wall && (degrees.get(wall.a) ?? 0) <= 1) edges.push(`M ${c3.x} ${c3.y} L ${c0.x} ${c0.y}`)
        if (wall && (degrees.get(wall.b) ?? 0) <= 1) edges.push(`M ${c1.x} ${c1.y} L ${c2.x} ${c2.y}`)
        return (
          <path key={outline.wallId} d={edges.join(' ')} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        )
      })}
    </g>
  )
}

/** Doors (leaf + swing arc) and windows (glazing line), gaps punched white. */
function Openings({
  state,
  exteriorWallIds,
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
}) {
  const placed = useMemo(() => placeOpenings(state, exteriorWallIds), [state, exteriorWallIds])
  const palette = usePalette()

  return (
    <g>
      {placed.map((item) => {
        const { center, direction, opening, thickness } = item
        const half = opening.width / 2
        const normal = { x: -direction.y, y: direction.x }
        const t = (thickness * 1.06) / 2

        // White quad punched through the wall so the opening reads as a gap.
        const gap: Point[] = [
          { x: center.x - direction.x * half - normal.x * t, y: center.y - direction.y * half - normal.y * t },
          { x: center.x + direction.x * half - normal.x * t, y: center.y + direction.y * half - normal.y * t },
          { x: center.x + direction.x * half + normal.x * t, y: center.y + direction.y * half + normal.y * t },
          { x: center.x - direction.x * half + normal.x * t, y: center.y - direction.y * half + normal.y * t },
        ]

        // Jambs: short ticks across the wall at each side of the gap.
        const jambs = [-1, 1].map((s) => {
          const cx = center.x + direction.x * half * s
          const cy = center.y + direction.y * half * s
          return `M ${cx - normal.x * t} ${cy - normal.y * t} L ${cx + normal.x * t} ${cy + normal.y * t}`
        })

        let symbol: string
        if (opening.kind === 'door') {
          const hinge = { x: center.x - direction.x * half, y: center.y - direction.y * half }
          const leafEnd = { x: hinge.x + normal.x * opening.width, y: hinge.y + normal.y * opening.width }
          const arcStart = { x: hinge.x + direction.x * opening.width, y: hinge.y + direction.y * opening.width }
          symbol =
            `M ${hinge.x} ${hinge.y} L ${leafEnd.x} ${leafEnd.y} ` +
            `M ${arcStart.x} ${arcStart.y} A ${opening.width} ${opening.width} 0 0 0 ${leafEnd.x} ${leafEnd.y}`
        } else {
          symbol =
            `M ${center.x - direction.x * half} ${center.y - direction.y * half} ` +
            `L ${center.x + direction.x * half} ${center.y + direction.y * half}`
        }

        return (
          <g key={opening.id}>
            <path d={ptsToPath(gap) + ' Z'} fill={palette.paper} stroke="none" />
            <path
              d={jambs.join(' ') + ' ' + symbol}
              fill="none"
              stroke={palette.ink}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </g>
  )
}

/** Columns (solid) and furniture (outline), in each fixture's rotated frame. */
function Fixtures({ state }: { state: DrawingState }) {
  const palette = usePalette()
  return (
    <g>
      {state.fixtures.map((fixture) => {
        const spec = fixtureSpec(fixture.kind)
        const deg = (fixture.rotation * 180) / Math.PI
        return (
          <g key={fixture.id} transform={`translate(${fixture.x} ${fixture.y}) rotate(${deg})`}>
            <rect
              x={-fixture.width / 2}
              y={-fixture.depth / 2}
              width={fixture.width}
              height={fixture.depth}
              fill={spec.solid ? palette.ink : 'none'}
              stroke={palette.ink}
              strokeWidth={spec.solid ? 0 : 1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </g>
  )
}

/** Room name + area stamped at each room's centroid. */
function RoomLabels({ state, rooms }: { state: DrawingState; rooms: Room[] }) {
  const { t } = useTranslation()
  const palette = usePalette()
  const displayName = (name: string) => (name.startsWith('rooms.') ? t(name) : name)

  return (
    <g textAnchor="middle" fill={palette.ink} style={{ fontFamily: 'inherit' }}>
      {rooms.map((room) => {
        const label = state.roomLabels.find((item) => pointInPolygon(item, room.polygon))
        return (
          <g key={room.nodeIds.join('-')} transform={`translate(${room.centroid.x} ${room.centroid.y})`}>
            {label && (
              <text y={-0.08} fontSize={0.34} fontWeight={600}>
                {displayName(label.name)}
              </text>
            )}
            <text y={0.44} fontSize={0.28} fill={palette.dim}>
              {fmt(room.area)} {t('area.unit', 'm²')}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** One dimension run: the line, extension lines, 45° ticks and the numbers. */
function DimensionRun({
  coords,
  fixed,
  axis,
  side,
}: {
  /** Sorted grid coordinates along the run. */
  coords: number[]
  /** The perpendicular coordinate the run sits at. */
  fixed: number
  /** Which axis the run measures along. */
  axis: 'x' | 'y'
  /** +1 or -1: which way the ticks/text lean off the line. */
  side: number
}) {
  const palette = usePalette()
  if (coords.length < 2) return null
  const spans = dimensionChain(coords)

  // Map (along, perp) → world point for the current axis.
  const at = (along: number, perp: number): Point =>
    axis === 'x' ? { x: along, y: perp } : { x: perp, y: along }

  const tick = 0.16
  const lines: string[] = []
  const texts: { p: Point; value: string }[] = []

  const start = at(coords[0], fixed)
  const end = at(coords[coords.length - 1], fixed)
  lines.push(`M ${start.x} ${start.y} L ${end.x} ${end.y}`)

  for (const c of coords) {
    const on = at(c, fixed)
    const ext = at(c, fixed - side * DIM_OFFSET) // extension back toward the plan
    lines.push(`M ${ext.x} ${ext.y} L ${on.x} ${on.y}`)
    // 45° tick straddling the line.
    const d = axis === 'x' ? { x: 1, y: side } : { x: side, y: 1 }
    lines.push(
      `M ${on.x - d.x * tick} ${on.y - d.y * tick} L ${on.x + d.x * tick} ${on.y + d.y * tick}`,
    )
  }

  for (const span of spans) {
    const mid = (span.from + span.to) / 2
    texts.push({ p: at(mid, fixed - side * 0.28), value: fmt(span.length) })
  }

  return (
    <g stroke={palette.dim} fill="none">
      <path d={lines.join(' ')} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <g stroke="none" fill={palette.dim} textAnchor="middle">
        {texts.map((tx, i) => (
          <text
            key={i}
            x={tx.p.x}
            y={tx.p.y}
            fontSize={0.26}
            transform={axis === 'y' ? `rotate(-90 ${tx.p.x} ${tx.p.y})` : undefined}
            dominantBaseline="middle"
          >
            {tx.value}
          </text>
        ))}
      </g>
    </g>
  )
}

/** Structural grid lines with numbered/lettered bubbles. */
function Grid({ state, bounds }: { state: DrawingState; bounds: SheetBounds }) {
  const grid = useMemo(() => planGrid(state), [state])
  const palette = usePalette()
  const top = bounds.minY - BUBBLE_OFFSET
  const left = bounds.minX - BUBBLE_OFFSET

  return (
    <g>
      <g stroke={palette.grid} strokeWidth={0.8} strokeDasharray="6 4">
        {grid.verticals.map((v) => (
          <line key={`v${v.label}`} x1={v.at} y1={top} x2={v.at} y2={bounds.maxY} vectorEffect="non-scaling-stroke" />
        ))}
        {grid.horizontals.map((h) => (
          <line key={`h${h.label}`} x1={left} y1={h.at} x2={bounds.maxX} y2={h.at} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g>
        {grid.verticals.map((v) => (
          <Bubble key={`vb${v.label}`} cx={v.at} cy={top} label={v.label} />
        ))}
        {grid.horizontals.map((h) => (
          <Bubble key={`hb${h.label}`} cx={left} cy={h.at} label={h.label} />
        ))}
      </g>
    </g>
  )
}

function Bubble({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  const palette = usePalette()
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={BUBBLE_RADIUS}
        fill={palette.paper}
        stroke={palette.ink}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <text x={cx} y={cy} fontSize={0.32} textAnchor="middle" dominantBaseline="central" fill={palette.ink}>
        {label}
      </text>
    </g>
  )
}

/** A viewBox in world metres. */
export interface SheetView {
  minX: number
  minY: number
  width: number
  height: number
}

export interface PlanSheetProps {
  state: DrawingState
  rooms: Room[]
  exteriorWallIds: ReadonlySet<string>
  /** Extra SVG (interaction overlays) drawn on top, in plan coordinates. */
  overlay?: React.ReactNode
  /** Ref to the underlying <svg>, for pointer→world mapping and PDF export. */
  svgRef?: React.Ref<SVGSVGElement>
  /**
   * Colour override. Defaults to the app theme (so the paper follows dark /
   * light mode on screen); the PDF export passes PRINT_SHEET_PALETTE.
   */
  palette?: SheetPalette
  /** Controlled viewBox (pan/zoom). Omit to auto-fit around the plan. */
  viewBox?: SheetView
  /** Extra props (pointer handlers, style) spread onto the <svg>. */
  svgProps?: React.SVGProps<SVGSVGElement>
  /** Preserve-aspect and sizing are the caller's; defaults fill the parent. */
  style?: React.CSSProperties
}

/** The auto-fit viewBox around the plan, or a small empty sheet at origin. */
export function fitView(bounds: SheetBounds | null): SheetView {
  return bounds
    ? {
        minX: bounds.minX - MARGIN,
        minY: bounds.minY - MARGIN,
        width: bounds.maxX - bounds.minX + MARGIN * 2,
        height: bounds.maxY - bounds.minY + MARGIN * 2,
      }
    : { minX: -5, minY: -4, width: 10, height: 8 }
}

/** Maps the shared three.js scene colours onto the sheet's ink/paper roles. */
function useThemeSheetPalette(): SheetPalette {
  const { scene } = useTheme()
  return useMemo(
    () => ({
      paper: scene.background,
      ink: scene.wall,
      dim: scene.dimension,
      grid: scene.gridMajor,
    }),
    [scene.background, scene.wall, scene.dimension, scene.gridMajor],
  )
}

/**
 * Renders a complete plan sheet. Returns an empty paper sheet when there's no
 * geometry yet, so the surface still shows and can be drawn on.
 */
export function PlanSheet({
  state,
  rooms,
  exteriorWallIds,
  overlay,
  svgRef,
  palette,
  viewBox,
  svgProps,
  style,
}: PlanSheetProps) {
  const themePalette = useThemeSheetPalette()
  const active = palette ?? themePalette
  const bounds = useMemo(() => sheetBounds(state), [state])

  // Controlled viewBox (editor pan/zoom) wins; otherwise auto-fit the plan.
  const view = viewBox ?? fitView(bounds)

  const xs = bounds ? planGrid(state).verticals.map((v) => v.at) : []
  const ys = bounds ? planGrid(state).horizontals.map((h) => h.at) : []

  return (
    <PaletteContext.Provider value={active}>
      <svg
        ref={svgRef}
        viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
        preserveAspectRatio="xMidYMid meet"
        {...svgProps}
        style={{ width: '100%', height: '100%', background: active.paper, display: 'block', ...style, ...svgProps?.style }}
      >
        {bounds && (
          <>
            <Grid state={state} bounds={bounds} />
            <Walls state={state} exteriorWallIds={exteriorWallIds} />
            <Openings state={state} exteriorWallIds={exteriorWallIds} />
            <Fixtures state={state} />
            <RoomLabels state={state} rooms={rooms} />
            <DimensionRun coords={xs} fixed={bounds.minY - DIM_OFFSET} axis="x" side={-1} />
            <DimensionRun coords={ys} fixed={bounds.minX - DIM_OFFSET} axis="y" side={-1} />
          </>
        )}
        {overlay}
      </svg>
    </PaletteContext.Provider>
  )
}
