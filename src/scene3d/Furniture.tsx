import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import type { DrawFixture, DrawingState } from '../drawing/types'

/**
 * The furniture from the plan, built in 3D.
 *
 * Every piece is modelled from boxes at the fixture's OWN width and depth, so
 * a bed the customer stretched on the plan is that size here too, and nothing
 * ever sticks out past the footprint they placed — a sofa that overhung its
 * plan symbol would make the 3D view disagree with the drawing it came from.
 *
 * Which way round a piece faces cannot be read from the plan: the 2D symbol
 * is a plain rectangle. The convention here is that a piece's BACK is at
 * -depth (local -z) — the headboard of a bed, the back of a sofa, the
 * splashback of a kitchen run — so turning a fixture on the plan turns it the
 * same way in 3D.
 */

interface Palette {
  wood: THREE.Material
  fabric: THREE.Material
  linen: THREE.Material
  ceramic: THREE.Material
  metal: THREE.Material
  worktop: THREE.Material
  recess: THREE.Material
}

function usePalette(): Palette {
  const palette = useMemo<Palette>(() => {
    const make = (color: string, roughness: number, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness })
    return {
      wood: make('#8A5A32', 0.6),
      fabric: make('#6E7B84', 0.9),
      linen: make('#ECE8E0', 0.85),
      ceramic: make('#F6F6F4', 0.2),
      metal: make('#A8AEB4', 0.3, 0.8),
      worktop: make('#3C4042', 0.35),
      recess: make('#2E3134', 0.7),
    }
  }, [])

  useEffect(
    () => () => {
      for (const material of Object.values(palette)) material.dispose()
    },
    [palette],
  )

  return palette
}

interface PieceProps {
  /** Width across the piece, depth front-to-back, both in metres. */
  w: number
  d: number
  p: Palette
}

function Box({
  size,
  at,
  material,
  cast = true,
}: {
  size: [number, number, number]
  at: [number, number, number]
  material: THREE.Material
  cast?: boolean
}) {
  return (
    <mesh position={at} material={material} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

function Bed({ w, d, p, pillows }: PieceProps & { pillows: 1 | 2 }) {
  return (
    <>
      <Box size={[w, 0.28, d]} at={[0, 0.14, 0]} material={p.wood} />
      <Box size={[w - 0.08, 0.2, d - 0.1]} at={[0, 0.38, 0]} material={p.linen} />
      {/* Headboard, at the back of the footprint. */}
      <Box size={[w, 0.8, 0.08]} at={[0, 0.4, -(d / 2 - 0.04)]} material={p.wood} />
      {pillows === 2 ? (
        [-1, 1].map((side) => (
          <Box
            key={side}
            size={[w * 0.44, 0.12, 0.34]}
            at={[side * w * 0.24, 0.54, -(d / 2 - 0.32)]}
            material={p.linen}
          />
        ))
      ) : (
        <Box size={[w * 0.72, 0.12, 0.34]} at={[0, 0.54, -(d / 2 - 0.32)]} material={p.linen} />
      )}
      {/* Blanket folded over the foot of the bed. */}
      <Box size={[w - 0.04, 0.08, d * 0.5]} at={[0, 0.52, d * 0.2]} material={p.fabric} />
    </>
  )
}

function Sofa({ w, d, p }: PieceProps) {
  const seatW = (w - 0.4) / 2 - 0.04
  return (
    <>
      <Box size={[w, 0.34, d]} at={[0, 0.17, 0]} material={p.fabric} />
      <Box size={[w, 0.52, 0.18]} at={[0, 0.6, -(d / 2 - 0.09)]} material={p.fabric} />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          size={[0.17, 0.26, d]}
          at={[side * (w / 2 - 0.085), 0.47, 0]}
          material={p.fabric}
        />
      ))}
      {[-1, 1].map((side) => (
        <Box
          key={`cushion${side}`}
          size={[seatW, 0.14, d - 0.26]}
          at={[side * (seatW / 2 + 0.02), 0.42, 0.06]}
          material={p.linen}
        />
      ))}
    </>
  )
}

function Table({ w, d, p }: PieceProps) {
  const inset = 0.09
  return (
    <>
      <Box size={[w, 0.05, d]} at={[0, 0.73, 0]} material={p.wood} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.07, 0.71, 0.07]}
            at={[sx * (w / 2 - inset), 0.355, sz * (d / 2 - inset)]}
            material={p.wood}
          />
        )),
      )}
    </>
  )
}

function Kitchen({ w, d, p }: PieceProps) {
  return (
    <>
      {/* Base units, worktop, splashback, wall units: a real run. */}
      <Box size={[w, 0.84, d]} at={[0, 0.42, 0]} material={p.linen} />
      <Box size={[w, 0.04, d + 0.03]} at={[0, 0.86, 0.015]} material={p.worktop} />
      {/* Tiled splashback, not more worktop: a dark band this tall reads as a
          black slab from the dollhouse view, which is how it is mostly seen. */}
      <Box size={[w, 0.5, 0.03]} at={[0, 1.13, -(d / 2 - 0.015)]} material={p.linen} />
      <Box
        size={[w, 0.6, d * 0.55]}
        at={[0, 1.78, -(d / 2 - (d * 0.55) / 2)]}
        material={p.linen}
      />
      {/* Sink and tap. */}
      <Box size={[Math.min(0.5, w * 0.35), 0.04, d * 0.6]} at={[-w * 0.22, 0.885, 0.02]} material={p.recess} />
      <Box size={[0.04, 0.26, 0.04]} at={[-w * 0.22, 1.01, -(d / 2 - 0.08)]} material={p.metal} />
      {/* Handles. */}
      {[-1, 0, 1].map((slot) => (
        <Box
          key={slot}
          size={[w * 0.22, 0.025, 0.03]}
          at={[slot * w * 0.3, 0.74, d / 2 + 0.015]}
          material={p.metal}
          cast={false}
        />
      ))}
    </>
  )
}

function Toilet({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 0.78, 0.17]} at={[0, 0.39, -(d / 2 - 0.085)]} material={p.ceramic} />
      <Box size={[w * 0.82, 0.4, d - 0.22]} at={[0, 0.2, 0.05]} material={p.ceramic} />
      <Box size={[w * 0.9, 0.05, d * 0.55]} at={[0, 0.42, 0.06]} material={p.ceramic} />
    </>
  )
}

function Sink({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w * 0.42, 0.66, d * 0.5]} at={[0, 0.33, 0]} material={p.ceramic} />
      <Box size={[w, 0.2, d]} at={[0, 0.76, 0]} material={p.ceramic} />
      <Box size={[w - 0.12, 0.04, d - 0.12]} at={[0, 0.845, 0]} material={p.recess} cast={false} />
      <Box size={[0.04, 0.22, 0.04]} at={[0, 0.97, -(d / 2 - 0.06)]} material={p.metal} />
    </>
  )
}

function Piece({ fixture, p }: { fixture: DrawFixture; p: Palette }) {
  const w = Math.max(0.1, fixture.width)
  const d = Math.max(0.1, fixture.depth)

  switch (fixture.kind) {
    case 'bedDouble':
      return <Bed w={w} d={d} p={p} pillows={2} />
    case 'bedSingle':
      return <Bed w={w} d={d} p={p} pillows={1} />
    case 'sofa':
      return <Sofa w={w} d={d} p={p} />
    case 'table':
      return <Table w={w} d={d} p={p} />
    case 'kitchen':
      return <Kitchen w={w} d={d} p={p} />
    case 'toilet':
      return <Toilet w={w} d={d} p={p} />
    case 'sink':
      return <Sink w={w} d={d} p={p} />
    default:
      return null
  }
}

/** Every piece of furniture on the plan, placed and turned as drawn. */
export function FurnitureView({ state, floor }: { state: DrawingState; floor: number }) {
  const palette = usePalette()

  return (
    <>
      {state.fixtures
        .filter((fixture) => fixture.kind !== 'column')
        .map((fixture) => (
          <group
            key={fixture.id}
            position={[fixture.x, floor, fixture.y]}
            rotation={[0, -fixture.rotation, 0]}
          >
            <Piece fixture={fixture} p={palette} />
          </group>
        ))}
    </>
  )
}
