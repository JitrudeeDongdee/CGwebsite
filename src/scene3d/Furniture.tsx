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
  glass: THREE.Material
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
      glass: new THREE.MeshStandardMaterial({
        color: '#CFE3EC',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.25,
      }),
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


function SofaL({ w, d, p }: PieceProps) {
  const seat = 0.95
  const armX = w / 2 - 0.09
  return (
    <>
      {/* Main run along the back, return down the left — the way the corner
          sofa sits in the drawing this plan came from. */}
      <Box size={[w, 0.34, seat]} at={[0, 0.17, -(d / 2 - seat / 2)]} material={p.fabric} />
      <Box size={[w, 0.52, 0.18]} at={[0, 0.6, -(d / 2 - 0.09)]} material={p.fabric} />
      <Box
        size={[seat, 0.34, d - seat]}
        at={[-(w / 2 - seat / 2), 0.17, (d - seat) / 2 - (d / 2 - seat)]}
        material={p.fabric}
      />
      <Box
        size={[0.18, 0.52, d - seat]}
        at={[-armX, 0.6, (d - seat) / 2 - (d / 2 - seat)]}
        material={p.fabric}
      />
      {[-1, 0, 1].map((slot) => (
        <Box
          key={slot}
          size={[w / 3.4, 0.14, seat - 0.2]}
          at={[slot * (w / 3.2), 0.42, -(d / 2 - seat / 2)]}
          material={p.linen}
        />
      ))}
      <Box
        size={[seat - 0.2, 0.14, d - seat - 0.1]}
        at={[-(w / 2 - seat / 2), 0.42, (d - seat) / 2 - (d / 2 - seat)]}
        material={p.linen}
      />
    </>
  )
}

function CoffeeTable({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 0.06, d]} at={[0, 0.38, 0]} material={p.wood} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.05, 0.35, 0.05]}
            at={[sx * (w / 2 - 0.07), 0.175, sz * (d / 2 - 0.07)]}
            material={p.wood}
          />
        )),
      )}
    </>
  )
}

/** A chair on its own: also the one used four times round the dining table. */
function Chair({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w * 0.9, 0.06, d * 0.9]} at={[0, 0.44, 0]} material={p.wood} />
      <Box
        size={[w * 0.9, 0.48, 0.06]}
        at={[0, 0.71, -(d / 2 - 0.03)]}
        material={p.wood}
      />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.05, 0.42, 0.05]}
            at={[sx * (w / 2 - 0.06), 0.21, sz * (d / 2 - 0.06)]}
            material={p.wood}
          />
        )),
      )}
    </>
  )
}

/** Round pedestal table with four chairs — one fixture, as it is drawn. */
function DiningRound({ w, d, p }: PieceProps) {
  const r = Math.min(w, d) * 0.3
  const seatOut = Math.min(w, d) / 2 - 0.22
  return (
    <>
      <mesh position={[0, 0.74, 0]} material={p.wood} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.05, 24]} />
      </mesh>
      <mesh position={[0, 0.37, 0]} material={p.wood} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.72, 12]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={p.wood} castShadow>
        <cylinderGeometry args={[r * 0.6, r * 0.6, 0.05, 20]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2
        return (
          <group
            key={i}
            position={[Math.sin(angle) * seatOut, 0, Math.cos(angle) * seatOut]}
            rotation={[0, angle + Math.PI, 0]}
          >
            <Chair w={0.45} d={0.45} p={p} />
          </group>
        )
      })}
    </>
  )
}

function Fridge({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 1.8, d]} at={[0, 0.9, 0]} material={p.linen} />
      {/* The freezer seam and one long handle, which is all that reads. */}
      <Box size={[w, 0.02, 0.02]} at={[0, 1.25, d / 2 + 0.005]} material={p.recess} cast={false} />
      <Box size={[0.03, 0.5, 0.04]} at={[w / 2 - 0.08, 1.55, d / 2 + 0.03]} material={p.metal} />
      <Box size={[0.03, 0.7, 0.04]} at={[w / 2 - 0.08, 0.8, d / 2 + 0.03]} material={p.metal} />
    </>
  )
}

function Tv({ w, d, p }: PieceProps) {
  // A low unit with the screen standing on it: the stand is what gives the
  // piece its footprint on the plan, the screen is what names it.
  return (
    <>
      <Box size={[w, 0.45, d]} at={[0, 0.225, 0]} material={p.wood} />
      <Box size={[w - 0.06, 0.02, 0.02]} at={[0, 0.3, d / 2 + 0.005]} material={p.recess} cast={false} />
      {/* Screen: a thin dark slab on a short neck, tight to the back. */}
      <Box size={[0.1, 0.18, 0.1]} at={[0, 0.54, 0]} material={p.metal} />
      <Box size={[w * 0.92, 0.55, 0.04]} at={[0, 0.92, -0.02]} material={p.recess} />
    </>
  )
}

function Wardrobe({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 2.1, d]} at={[0, 1.05, 0]} material={p.linen} />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          size={[w / 2 - 0.03, 2, 0.02]}
          at={[side * (w / 4), 1.05, d / 2 + 0.012]}
          material={p.wood}
          cast={false}
        />
      ))}
      {[-1, 1].map((side) => (
        <Box
          key={`handle${side}`}
          size={[0.03, 0.3, 0.03]}
          at={[side * 0.05, 1.1, d / 2 + 0.04]}
          material={p.metal}
          cast={false}
        />
      ))}
    </>
  )
}

function Nightstand({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 0.5, d]} at={[0, 0.25, 0]} material={p.wood} />
      <Box size={[w - 0.06, 0.02, 0.02]} at={[0, 0.3, d / 2 + 0.005]} material={p.recess} cast={false} />
      <Box size={[0.12, 0.025, 0.03]} at={[0, 0.17, d / 2 + 0.02]} material={p.metal} cast={false} />
    </>
  )
}

/**
 * A corner shower: tray, two glass panels and a head on the back wall. The
 * drawing shows a quarter-round enclosure; two flat panels read the same at
 * this scale and cost a fraction of the geometry.
 */
function Shower({ w, d, p }: PieceProps) {
  return (
    <>
      <Box size={[w, 0.12, d]} at={[0, 0.06, 0]} material={p.ceramic} />
      <mesh position={[w / 2 - 0.01, 1.07, 0]} material={p.glass} castShadow>
        <boxGeometry args={[0.02, 1.9, d]} />
      </mesh>
      <mesh position={[0, 1.07, d / 2 - 0.01]} material={p.glass} castShadow>
        <boxGeometry args={[w, 1.9, 0.02]} />
      </mesh>
      <Box size={[0.04, 0.04, 0.22]} at={[0, 1.95, -(d / 2 - 0.12)]} material={p.metal} />
      <Box size={[0.2, 0.03, 0.2]} at={[0, 1.93, -(d / 2 - 0.25)]} material={p.metal} />
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
    case 'sofaL':
      return <SofaL w={w} d={d} p={p} />
    case 'coffeeTable':
      return <CoffeeTable w={w} d={d} p={p} />
    case 'diningRound':
      return <DiningRound w={w} d={d} p={p} />
    case 'chair':
      return <Chair w={w} d={d} p={p} />
    case 'fridge':
      return <Fridge w={w} d={d} p={p} />
    case 'wardrobe':
      return <Wardrobe w={w} d={d} p={p} />
    case 'nightstand':
      return <Nightstand w={w} d={d} p={p} />
    case 'shower':
      return <Shower w={w} d={d} p={p} />
    case 'tv':
      return <Tv w={w} d={d} p={p} />
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
