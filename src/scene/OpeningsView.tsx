import { useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '@mui/material/styles'
import type { DrawingState } from '../drawing/types'
import { placeOpenings, type PlacedOpening } from '../drawing/openings'

/** Above the wall poché so the opening reads as a gap cut into it. */
const GAP_HEIGHT = 0.025
const SYMBOL_HEIGHT = 0.028
const LINE_WIDTH = 0.03

function Bar({
  center,
  angle,
  length,
  width,
  color,
  height = SYMBOL_HEIGHT,
}: {
  center: [number, number]
  angle: number
  length: number
  width: number
  color: string
  height?: number
}) {
  if (length <= 0) return null
  return (
    <mesh position={[center[0], height, center[1]]} rotation={[-Math.PI / 2, 0, -angle]}>
      <planeGeometry args={[length, width]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * A door: the gap, the leaf drawn open at 90°, and its swing arc — the
 * standard plan symbol, which also shows which way the door opens.
 */
function DoorSymbol({ item, color }: { item: PlacedOpening; color: string }) {
  const { center, direction, opening } = item
  const angle = Math.atan2(direction.y, direction.x)
  const half = opening.width / 2

  // Hinge at one edge of the gap; the leaf swings perpendicular to the wall.
  const hinge: [number, number] = [
    center.x - direction.x * half,
    center.y - direction.y * half,
  ]
  const normal = { x: -direction.y, y: direction.x }

  const arc = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, opening.width, opening.width, 0, Math.PI / 2, false, 0)
    const points = curve.getPoints(16)
    return new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    )
  }, [opening.width])

  return (
    <>
      <Bar
        center={[
          hinge[0] + normal.x * half,
          hinge[1] + normal.y * half,
        ]}
        angle={angle + Math.PI / 2}
        length={opening.width}
        width={LINE_WIDTH}
        color={color}
      />
      <primitive
        object={new THREE.Line(arc, new THREE.LineBasicMaterial({ color }))}
        position={[hinge[0], SYMBOL_HEIGHT, hinge[1]]}
        rotation={[-Math.PI / 2, 0, -angle]}
      />
    </>
  )
}

/** A window: the gap plus the thin glazing line running through it. */
function WindowSymbol({ item, color }: { item: PlacedOpening; color: string }) {
  const angle = Math.atan2(item.direction.y, item.direction.x)
  return (
    <Bar
      center={[item.center.x, item.center.y]}
      angle={angle}
      length={item.opening.width}
      width={LINE_WIDTH}
      color={color}
    />
  )
}

export function OpeningsView({
  state,
  exteriorWallIds,
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
}) {
  const { scene } = useTheme()
  const placed = useMemo(
    () => placeOpenings(state, exteriorWallIds),
    [state, exteriorWallIds],
  )

  return (
    <>
      {placed.map((item) => {
        const angle = Math.atan2(item.direction.y, item.direction.x)
        return (
          <group key={item.opening.id}>
            {/* Punch the wall out so the opening reads as a real gap. */}
            <Bar
              center={[item.center.x, item.center.y]}
              angle={angle}
              length={item.opening.width}
              // A touch proud of the wall so no sliver of poché survives.
              width={item.thickness * 1.05}
              color={scene.background}
              height={GAP_HEIGHT}
            />
            {item.opening.kind === 'door' ? (
              <DoorSymbol item={item} color={scene.wall} />
            ) : (
              <WindowSymbol item={item} color={scene.wall} />
            )}
          </group>
        )
      })}
    </>
  )
}
