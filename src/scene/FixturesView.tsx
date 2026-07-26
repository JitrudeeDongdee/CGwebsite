import { useTheme } from '@mui/material/styles'
import type { DrawFixture } from '../drawing/types'
import { fixtureSpec } from '../drawing/fixtures'

const HEIGHT = 0.022
/** Finer than the wall line — furniture is a lighter annotation. */
const OUTLINE_WIDTH = 0.018
/** Softened so the line reads as pencil rather than a hard CAD stroke. */
const OUTLINE_OPACITY = 0.55

function Edge({
  from,
  to,
  color,
  opacity = OUTLINE_OPACITY,
}: {
  from: [number, number]
  to: [number, number]
  color: string
  opacity?: number
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  if (length === 0) return null

  return (
    <mesh
      position={[(from[0] + to[0]) / 2, HEIGHT, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, -Math.atan2(dy, dx)]}
    >
      <planeGeometry args={[length, OUTLINE_WIDTH]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

/**
 * Columns draw solid like wall poché; furniture draws as a plain outlined
 * rectangle, which is how a plan shows loose furniture — enough to judge
 * whether it fits, without pretending to be a rendering.
 */
function FixtureShape({ fixture, color }: { fixture: DrawFixture; color: string }) {
  const spec = fixtureSpec(fixture.kind)
  const halfW = fixture.width / 2
  const halfD = fixture.depth / 2

  if (spec.solid) {
    return (
      <mesh
        position={[fixture.x, HEIGHT, fixture.y]}
        rotation={[-Math.PI / 2, 0, -fixture.rotation]}
      >
        <planeGeometry args={[fixture.width, fixture.depth]} />
        <meshBasicMaterial color={color} />
      </mesh>
    )
  }

  // Corners in the fixture's own frame, rotated into the plan.
  const cos = Math.cos(fixture.rotation)
  const sin = Math.sin(fixture.rotation)
  const corner = (lx: number, ly: number): [number, number] => [
    fixture.x + lx * cos - ly * sin,
    fixture.y + lx * sin + ly * cos,
  ]

  const c1 = corner(-halfW, -halfD)
  const c2 = corner(halfW, -halfD)
  const c3 = corner(halfW, halfD)
  const c4 = corner(-halfW, halfD)

  return (
    <>
      <Edge from={c1} to={c2} color={color} />
      <Edge from={c2} to={c3} color={color} />
      <Edge from={c3} to={c4} color={color} />
      <Edge from={c4} to={c1} color={color} />
      {/* Beds get a pillow line so their head end is readable. */}
      {(fixture.kind === 'bedDouble' || fixture.kind === 'bedSingle') && (
        <Edge from={corner(-halfW, -halfD + 0.35)} to={corner(halfW, -halfD + 0.35)} color={color} />
      )}
    </>
  )
}

export function FixturesView({ fixtures }: { fixtures: DrawFixture[] }) {
  const { scene } = useTheme()

  return (
    <>
      {fixtures.map((fixture) => (
        <FixtureShape
          key={fixture.id}
          fixture={fixture}
          color={fixtureSpec(fixture.kind).solid ? scene.wall : scene.dimension}
        />
      ))}
    </>
  )
}
