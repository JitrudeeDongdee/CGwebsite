import { useTheme } from '@mui/material/styles'
import type { FixtureKind, OpeningKind } from '../drawing/types'
import { fixtureSpec } from '../drawing/fixtures'
import type { PlanTemplate } from '../drawing/templates'

const BOX = 34

/**
 * Small scale drawings on the palette buttons, using the same conventions as
 * the plan itself — so what you pick looks like what lands on the drawing.
 */

export function TemplatePreview({ template }: { template: PlanTemplate }) {
  const theme = useTheme()
  const plan = template.build()

  const nodes = Object.values(plan.nodes)
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const scale = Math.min(BOX / (maxX - minX), BOX / (maxY - minY)) * 0.88
  const toX = (x: number) => (x - (minX + maxX) / 2) * scale + BOX / 2
  const toY = (y: number) => (y - (minY + maxY) / 2) * scale + BOX / 2

  return (
    <svg width={BOX} height={BOX} style={{ flexShrink: 0 }} aria-hidden>
      {plan.walls.map((wall) => {
        const a = plan.nodes[wall.a]
        const b = plan.nodes[wall.b]
        return (
          <line
            key={wall.id}
            x1={toX(a.x)}
            y1={toY(a.y)}
            x2={toX(b.x)}
            y2={toY(b.y)}
            stroke={theme.scene.wall}
            strokeWidth={2}
            strokeLinecap="square"
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
