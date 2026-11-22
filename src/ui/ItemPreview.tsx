import { useTheme } from '@mui/material/styles'
import { railStyle, type RailStyle } from '../drawing/railing'
import type { HouseFinish } from '../drawing/houseStyle'
import { ROOF_FINISH, WALL_FINISH } from '../drawing/materials'
import type { DrawingState, FixtureKind, OpeningKind } from '../drawing/types'
import { fixtureSpec } from '../drawing/fixtures'
import { FixtureSymbol } from '../sheet/fixtureSymbols'
import type { PlanTemplate } from '../drawing/templates'

const BOX = 34

/**
 * Small scale drawings on the palette buttons, using the same conventions as
 * the plan itself — so what you pick looks like what lands on the drawing.
 */

/** Wall-outline thumbnail of any plan, at a caller-chosen box size. Shared by
 *  the palette (`TemplatePreview`) and the gallery cards (custom plans). */
export function PlanThumbnail({ state, size = BOX }: { state: DrawingState; size?: number }) {
  const theme = useTheme()

  const nodes = Object.values(state.nodes)
  if (nodes.length === 0) {
    return <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden />
  }

  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  // Guard against a zero-span axis (a single row/column of nodes).
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = Math.min(size / spanX, size / spanY) * 0.88
  const toX = (x: number) => (x - (minX + maxX) / 2) * scale + size / 2
  const toY = (y: number) => (y - (minY + maxY) / 2) * scale + size / 2

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden>
      {state.walls.map((wall) => {
        const a = state.nodes[wall.a]
        const b = state.nodes[wall.b]
        if (!a || !b) return null
        return (
          <line
            key={wall.id}
            x1={toX(a.x)}
            y1={toY(a.y)}
            x2={toX(b.x)}
            y2={toY(b.y)}
            stroke={theme.scene.wall}
            strokeWidth={size > 60 ? 2.5 : 2}
            strokeLinecap="square"
          />
        )
      })}
    </svg>
  )
}

export function TemplatePreview({ template }: { template: PlanTemplate }) {
  return <PlanThumbnail state={template.build()} />
}

/**
 * Isometric (2.5D) massing thumbnail: each wall is extruded up into a block
 * and projected at a 30° axonometric angle, so a gallery card previews the
 * building as a little 3D model rather than a flat plan. Pure SVG — no WebGL,
 * so it's cheap to render one per card.
 */
/**
 * A small isometric of a plan, with its roof on.
 *
 * The gallery cards used to show bare grey wall blocks, which read as a
 * diagram rather than as the house you would get. Given the plan's finish —
 * every built-in sample carries one — the walls take its colour and a roof of
 * the right shape is capped over the footprint, so the card previews the
 * house the 3D view will build. Without a finish it falls back to the old
 * neutral massing, which is still right for a plan someone just drew.
 */
export function IsoThumbnail({
  state,
  size = 80,
  finish,
}: {
  state: DrawingState
  size?: number
  finish?: HouseFinish
}) {
  const { nodes, walls } = state

  const usable = walls.filter((w) => nodes[w.a] && nodes[w.b])
  if (usable.length === 0) {
    return <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden />
  }

  // Wall height in plan units; kept modest so small footprints don't look like towers.
  const H = 2.6
  const COS = 0.866
  const SIN = 0.5
  const project = (x: number, y: number, z: number) => ({
    X: (x - y) * COS,
    Y: (x + y) * SIN - z,
  })

  // Footprint, for the roof that caps it.
  const ends = usable.flatMap((w) => [nodes[w.a], nodes[w.b]])
  // Small on purpose. Seen from above at this angle a generous overhang
  // covers the walls, and a card that is all roof says nothing about the
  // house under it.
  const O = 0.18
  const x0 = Math.min(...ends.map((n) => n.x)) - O
  const x1 = Math.max(...ends.map((n) => n.x)) + O
  const y0 = Math.min(...ends.map((n) => n.y)) - O
  const y1 = Math.max(...ends.map((n) => n.y)) + O
  const shape = finish?.roof ?? 'gable'
  // Enough rise to read as a pitch at 80px, without turning a small plan
  // into a spire.
  const rise = shape === 'flat' ? 0 : Math.min(1.8, Math.min(x1 - x0, y1 - y0) * 0.26)
  const ridgeAlongX = x1 - x0 >= y1 - y0
  const xm = (x0 + x1) / 2
  const ym = (y0 + y1) / 2

  type Face = { pts: [number, number, number][]; shade: number }
  const roof: Face[] = []
  {
    if (shape === 'flat') {
      roof.push({ pts: [[x0, y0, H], [x1, y0, H], [x1, y1, H], [x0, y1, H]], shade: 1 })
    } else if (shape === 'shed') {
      roof.push({ pts: [[x0, y0, H + rise], [x1, y0, H + rise], [x1, y1, H], [x0, y1, H]], shade: 1 })
    } else if (shape === 'hip') {
      // Ridge pulled in from both ends, so all four sides slope.
      const inset = Math.min(x1 - x0, y1 - y0) / 4
      const [r0, r1] = ridgeAlongX
        ? ([[x0 + inset, ym], [x1 - inset, ym]] as const)
        : ([[xm, y0 + inset], [xm, y1 - inset]] as const)
      roof.push(
        { pts: [[x0, y0, H], [x1, y0, H], [r1[0], r1[1], H + rise], [r0[0], r0[1], H + rise]], shade: 1 },
        { pts: [[x1, y1, H], [x0, y1, H], [r0[0], r0[1], H + rise], [r1[0], r1[1], H + rise]], shade: 0.72 },
        { pts: [[x0, y1, H], [x0, y0, H], [r0[0], r0[1], H + rise]], shade: 0.86 },
        { pts: [[x1, y0, H], [x1, y1, H], [r1[0], r1[1], H + rise]], shade: 0.6 },
      )
    } else if (ridgeAlongX) {
      roof.push(
        { pts: [[x0, y0, H], [x1, y0, H], [x1, ym, H + rise], [x0, ym, H + rise]], shade: 1 },
        { pts: [[x0, y1, H], [x1, y1, H], [x1, ym, H + rise], [x0, ym, H + rise]], shade: 0.68 },
      )
    } else {
      roof.push(
        { pts: [[x0, y0, H], [x0, y1, H], [xm, y1, H + rise], [xm, y0, H + rise]], shade: 0.68 },
        { pts: [[x1, y0, H], [x1, y1, H], [xm, y1, H + rise], [xm, y0, H + rise]], shade: 1 },
      )
    }
  }

  const pts = usable.flatMap((w) => {
    const a = nodes[w.a]
    const b = nodes[w.b]
    return [project(a.x, a.y, 0), project(b.x, b.y, 0), project(a.x, a.y, H), project(b.x, b.y, H)]
  })
  // The roof is part of the silhouette, so it has to be inside the fit.
  for (const face of roof) for (const [x, y, z] of face.pts) pts.push(project(x, y, z))
  const minX = Math.min(...pts.map((p) => p.X))
  const maxX = Math.max(...pts.map((p) => p.X))
  const minY = Math.min(...pts.map((p) => p.Y))
  const maxY = Math.max(...pts.map((p) => p.Y))
  const scale = Math.min(size / (maxX - minX || 1), size / (maxY - minY || 1)) * 0.82
  const ox = size / 2 - ((minX + maxX) / 2) * scale
  const oy = size / 2 - ((minY + maxY) / 2) * scale
  const at = (p: { X: number; Y: number }) => `${(p.X * scale + ox).toFixed(1)},${(p.Y * scale + oy).toFixed(1)}`

  // Painter's order: draw the walls furthest back (smallest x+y) first.
  const depth = (w: (typeof usable)[number]) =>
    nodes[w.a].x + nodes[w.a].y + nodes[w.b].x + nodes[w.b].y
  const ordered = [...usable].sort((a, b) => depth(a) - depth(b))

  // A plan with no finish of its own opens in the designer's defaults, so
  // the card shows those rather than a neutral grey block — what you see on
  // the card is what the 3D view will build.
  const base = finish?.wallColor ?? WALL_FINISH.plaster.defaultColor
  const roofColor = finish?.roofColor ?? ROOF_FINISH.tile.defaultColor
  // Nearer faces are lower on screen, so paint by increasing x+y.
  const roofOrdered = [...roof].sort(
    (one, two) =>
      one.pts.reduce((s, [x, y]) => s + x + y, 0) / one.pts.length -
      two.pts.reduce((s, [x, y]) => s + x + y, 0) / two.pts.length,
  )

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden>
      {ordered.map((w) => {
        const a = nodes[w.a]
        const b = nodes[w.b]
        const face = [
          project(a.x, a.y, 0),
          project(b.x, b.y, 0),
          project(b.x, b.y, H),
          project(a.x, a.y, H),
        ]
        // Two shades by wall run direction so faces read as light/shadow sides.
        const alongX = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
        return (
          <polygon
            key={w.id}
            points={face.map(at).join(' ')}
            fill={base}
            fillOpacity={alongX ? 0.9 : 0.62}
            stroke={base}
            strokeWidth={0.75}
            strokeLinejoin="round"
          />
        )
      })}
      {/* Drawn last: the roof is over everything, whatever the wall order. */}
      {roofOrdered.map((face, i) => (
        <polygon
          key={`roof-${i}`}
          points={face.pts.map(([x, y, z]) => at(project(x, y, z))).join(' ')}
          fill={roofColor}
          fillOpacity={face.shade}
          stroke={roofColor}
          strokeWidth={0.75}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

/**
 * A balcony in plan: a stretch of wall with the slab pulled out of it and the
 * railing along its three open edges. Drawn as a section through the wall, the
 * same way `OpeningPreview` is, so the two tiles read as the same drawing.
 */
export function BalconyPreview({ projection }: { projection: number }) {
  const theme = useTheme()
  const mid = BOX / 2
  const span = BOX - 14
  const x0 = (BOX - span) / 2
  // 2 m (the deepest preset) reaches the bottom of the box.
  const depth = Math.max(5, (projection / 2) * (BOX / 2 - 6))

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      <line x1={0} y1={mid} x2={BOX} y2={mid} stroke={theme.scene.wall} strokeWidth={4} />
      <rect
        x={x0}
        y={mid}
        width={span}
        height={depth}
        fill={theme.scene.wall}
        fillOpacity={0.14}
        stroke={theme.scene.wall}
        strokeWidth={1.2}
      />
      {/* The rail line, inset from the three open edges. */}
      <path
        d={`M ${x0 + 2.5} ${mid} L ${x0 + 2.5} ${mid + depth - 2.5} L ${x0 + span - 2.5} ${mid + depth - 2.5} L ${x0 + span - 2.5} ${mid}`}
        fill="none"
        stroke={theme.scene.wall}
        strokeWidth={1.6}
      />
      {/* An arrow out, which is what "pull the floor out" looks like. */}
      <path
        d={`M ${mid} ${mid + 3} L ${mid} ${mid + depth - 6} M ${mid - 2.5} ${mid + depth - 9} L ${mid} ${mid + depth - 6} L ${mid + 2.5} ${mid + depth - 9}`}
        fill="none"
        stroke={theme.scene.dimension}
        strokeWidth={1.2}
      />
    </svg>
  )
}

/**
 * A railing or fence seen in elevation: posts, a top rail, and whatever the
 * style fills the gap with. One preview for both, because it is one object.
 */
export function RailPreview({ style }: { style: RailStyle }) {
  const theme = useTheme()
  const ink = theme.scene.wall
  const top = 6
  const base = BOX - 6
  const height = base - top
  const left = 6
  const right = BOX - 6
  const spec = railStyle(style, 'bar')

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      <line x1={2} y1={base} x2={BOX - 2} y2={base} stroke={theme.scene.dimension} strokeWidth={1} />
      {spec.id === 'none' ? null : (
        <>
          {spec.solid && (
            <rect
              x={left}
              y={top + 3}
              width={right - left}
              height={base - top - 3}
              fill={ink}
              fillOpacity={0.3}
              stroke={ink}
              strokeWidth={1}
            />
          )}
          {spec.glazed && (
            <rect
              x={left + 1}
              y={top + 3}
              width={right - left - 2}
              height={base - top - 4}
              fill={ink}
              fillOpacity={0.12}
              stroke={ink}
              strokeWidth={0.8}
            />
          )}
          {spec.bars !== undefined &&
            Array.from({ length: 7 }, (_, i) => {
              const x = left + 2 + ((right - left - 4) * i) / 6
              return <line key={i} x1={x} y1={top + 2} x2={x} y2={base} stroke={ink} strokeWidth={1} />
            })}
          {spec.slats !== undefined &&
            Array.from({ length: 4 }, (_, i) => {
              const y = top + 5 + (height - 8) * (i / 3)
              return (
                <line key={i} x1={left} y1={y} x2={right} y2={y} stroke={ink} strokeWidth={2.4} />
              )
            })}
          {/* Posts and the top rail, on every style. */}
          <line x1={left} y1={top} x2={left} y2={base} stroke={ink} strokeWidth={2} />
          <line x1={right} y1={top} x2={right} y2={base} stroke={ink} strokeWidth={2} />
          <line x1={left - 2} y1={top} x2={right + 2} y2={top} stroke={ink} strokeWidth={2.4} />
        </>
      )}
    </svg>
  )
}

export function OpeningPreview({
  kind,
  width,
  open,
}: {
  kind: OpeningKind
  width: number
  /** A punched hole: no leaf, no glazing — just the gap. */
  open?: boolean
}) {
  const theme = useTheme()
  // Scaled so a 1.5 m window fills the box and an 0.8 m door reads narrower.
  const span = Math.min(BOX - 8, (width / 1.5) * (BOX - 8))
  const x0 = (BOX - span) / 2
  const mid = BOX / 2

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      {/* Wall stubs either side of the opening. */}
      <line x1={0} y1={mid} x2={x0} y2={mid} stroke={theme.scene.wall} strokeWidth={4} />
      <line x1={x0 + span} y1={mid} x2={BOX} y2={mid} stroke={theme.scene.wall} strokeWidth={4} />

      {/* ⚠️ A hole is stored as a `window` 1.0 m wide, which is exactly what
          the "หน้าต่าง 100 ซม." preset is — so without this the two tiles
          drew identical artwork and sat next to each other in the palette.
          A gap is drawn as a gap: jamb ticks and nothing between them. */}
      {open ? (
        <>
          <line x1={x0} y1={mid - 5} x2={x0} y2={mid + 5} stroke={theme.scene.wall} strokeWidth={1.5} />
          <line
            x1={x0 + span}
            y1={mid - 5}
            x2={x0 + span}
            y2={mid + 5}
            stroke={theme.scene.wall}
            strokeWidth={1.5}
          />
        </>
      ) : kind === 'door' ? (
        <>
          <line
            x1={x0}
            y1={mid}
            x2={x0}
            y2={mid - span}
            stroke={theme.scene.wall}
            strokeWidth={1.5}
          />
          <path
            d={`M ${x0 + span} ${mid} A ${span} ${span} 0 0 0 ${x0} ${mid - span}`}
            fill="none"
            stroke={theme.scene.wall}
            strokeWidth={1}
          />
        </>
      ) : (
        <line
          x1={x0}
          y1={mid}
          x2={x0 + span}
          y2={mid}
          stroke={theme.scene.wall}
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}

/**
 * A short length of wall drawn to the type's real thickness — the double-line
 * poché for a fixed thickness, or a single centre line for `auto`.
 */
export function WallTypePreview({ thickness }: { thickness?: number }) {
  const theme = useTheme()
  const mid = BOX / 2
  // Map metres to preview pixels; 0.25 m (thickest) ≈ 14 px.
  const half = thickness ? Math.max(2, (thickness / 0.25) * 7) : 0

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      {thickness ? (
        <>
          <line x1={2} y1={mid - half} x2={BOX - 2} y2={mid - half} stroke={theme.scene.wall} strokeWidth={1.4} />
          <line x1={2} y1={mid + half} x2={BOX - 2} y2={mid + half} stroke={theme.scene.wall} strokeWidth={1.4} />
        </>
      ) : (
        <line
          x1={2}
          y1={mid}
          x2={BOX - 2}
          y2={mid}
          stroke={theme.scene.wall}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
    </svg>
  )
}

/** Standing height of each piece, for the isometric preview. */
const FIXTURE_HEIGHT: Partial<Record<FixtureKind, number>> = {
  column: 1.2,
  bedDouble: 0.55,
  bedSingle: 0.55,
  sofa: 0.85,
  sofaL: 0.85,
  table: 0.75,
  coffeeTable: 0.4,
  chair: 0.85,
  diningRound: 0.78,
  kitchen: 0.9,
  fridge: 1.2,
  wardrobe: 1.2,
  nightstand: 0.5,
  toilet: 0.78,
  sink: 0.85,
  shower: 1.2,
  tv: 1.2,
  campChair: 0.8,
  firePit: 0.4,
  floorVoid: 0.02,
}

/** The same 2:1 isometric the plan thumbnails use. */
const ISO_COS = 0.866
const ISO_SIN = 0.5

/**
 * What a fixture looks like in the palette.
 *
 * It follows the view: the plan symbol while the plan is on screen, and a
 * little isometric of the same piece once the 3D view is. Picking furniture
 * off a row of identical rectangles told nobody anything, and a 3D view with
 * flat plan symbols beside it reads as two different tools.
 */
export function FixturePreview({ kind, view = '2d' }: { kind: FixtureKind; view?: '2d' | '3d' }) {
  const theme = useTheme()
  const spec = fixtureSpec(kind)
  const ink = spec.solid ? theme.scene.wall : theme.scene.dimension

  if (view === '2d') {
    const scale = Math.min((BOX - 8) / spec.width, (BOX - 8) / spec.depth)
    return (
      <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
        <g transform={`translate(${BOX / 2} ${BOX / 2}) scale(${scale})`} opacity={0.85}>
          <FixtureSymbol
            kind={kind}
            width={spec.width}
            depth={spec.depth}
            ink={ink}
            stroke={1 / scale}
          />
        </g>
      </svg>
    )
  }

  const h = FIXTURE_HEIGHT[kind] ?? 0.8
  const spread = spec.width + spec.depth
  const scale = Math.min((BOX - 6) / (spread * ISO_COS), (BOX - 6) / (spread * ISO_SIN + h))
  const project = (px: number, py: number): [number, number] => [
    (px - py) * ISO_COS * scale,
    (px + py) * ISO_SIN * scale,
  ]

  const hw = spec.width / 2
  const hd = spec.depth / 2
  const lift = h * scale
  const base = [project(-hw, -hd), project(hw, -hd), project(hw, hd), project(-hw, hd)]
  const top = base.map(([bx, by]) => [bx, by - lift] as [number, number])
  const poly = (pts: [number, number][]) => pts.map(([px, py]) => `${px},${py}`).join(' ')

  // Centre the whole solid, which reaches `lift` above the footprint.
  const midY = (-lift + hd * 2 * ISO_SIN * scale) / 2

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      <g transform={`translate(${BOX / 2} ${BOX / 2 - midY})`}>
        {/* The two faces turned towards the viewer, then the top with the
            plan symbol laid on it. */}
        <polygon points={poly([base[3], base[2], top[2], top[3]])} fill={ink} opacity={0.2} />
        <polygon points={poly([base[2], base[1], top[1], top[2]])} fill={ink} opacity={0.32} />
        <polygon points={poly(top)} fill={ink} opacity={0.08} stroke={ink} strokeWidth={1} />
        <g
          transform={`translate(0 ${-lift}) matrix(${ISO_COS * scale} ${ISO_SIN * scale} ${-ISO_COS * scale} ${ISO_SIN * scale} 0 0)`}
          opacity={0.9}
        >
          <FixtureSymbol
            kind={kind}
            width={spec.width}
            depth={spec.depth}
            ink={ink}
            stroke={1 / scale}
          />
        </g>
      </g>
    </svg>
  )
}
