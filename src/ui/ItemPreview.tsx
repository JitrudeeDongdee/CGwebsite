import { useTheme } from '@mui/material/styles'
import type { DrawingState, FixtureKind, OpeningKind } from '../drawing/types'
import { fixtureSpec } from '../drawing/fixtures'
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
export function IsoThumbnail({ state, size = 80 }: { state: DrawingState; size?: number }) {
  const theme = useTheme()
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

  const pts = usable.flatMap((w) => {
    const a = nodes[w.a]
    const b = nodes[w.b]
    return [project(a.x, a.y, 0), project(b.x, b.y, 0), project(a.x, a.y, H), project(b.x, b.y, H)]
  })
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

  const base = theme.scene.wall

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
    </svg>
  )
}

export function OpeningPreview({ kind, width }: { kind: OpeningKind; width: number }) {
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

      {kind === 'door' ? (
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

export function FixturePreview({ kind }: { kind: FixtureKind }) {
  const theme = useTheme()
  const spec = fixtureSpec(kind)

  const scale = Math.min((BOX - 8) / spec.width, (BOX - 8) / spec.depth)
  const w = spec.width * scale
  const h = spec.depth * scale
  const x = (BOX - w) / 2
  const y = (BOX - h) / 2

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={spec.solid ? theme.scene.wall : 'none'}
        stroke={spec.solid ? theme.scene.wall : theme.scene.dimension}
        strokeWidth={spec.solid ? 1.5 : 1}
        opacity={spec.solid ? 1 : 0.65}
      />
      {(kind === 'bedDouble' || kind === 'bedSingle') && (
        <line
          x1={x}
          y1={y + h * 0.24}
          x2={x + w}
          y2={y + h * 0.24}
          stroke={theme.scene.dimension}
          strokeWidth={1}
          opacity={0.65}
        />
      )}
    </svg>
  )
}
