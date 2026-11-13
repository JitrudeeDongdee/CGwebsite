import type { SurfacePattern } from '../drawing/materials'

/**
 * A small drawing of each surface finish, for the catalogue tiles.
 *
 * The 3D view's real textures are drawn onto a canvas in `scene3d/textures.ts`,
 * but that module is part of the three.js chunk — importing it here would pull
 * ~240 kB into the 2D editor to decorate a 58px square. These are separate,
 * deliberately simple SVGs: they only have to say "brick" rather than "timber"
 * at a glance. They take the chosen colour, so a tile shows the finish in the
 * colour it is actually set to.
 */

const S = 58

/** Mixes a hex colour towards black (k < 0) or white (k > 0). */
function shade(hex: string, k: number) {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const target = k < 0 ? 0 : 255
  const amount = Math.abs(k)
  const channel = (i: number) => {
    const base = parseInt(full.slice(i * 2, i * 2 + 2), 16)
    return Math.round(base + (target - base) * amount)
  }
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

function Brick({ color }: { color: string }) {
  const line = shade(color, -0.3)
  const rows = [0, 1, 2, 3, 4]
  return (
    <>
      {rows.map((row) => {
        const y = row * 12
        // Alternate courses are offset by half a brick, which is the single
        // detail that makes this read as brickwork rather than tiling.
        const offset = row % 2 === 0 ? 0 : -14
        return [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={offset + col * 28 + 1}
            y={y + 1}
            width={26}
            height={10}
            fill={shade(color, row % 2 === 0 ? 0.04 : -0.04)}
            stroke={line}
            strokeWidth={1}
          />
        ))
      })}
    </>
  )
}

function Lap({ color, vertical }: { color: string; vertical?: boolean }) {
  const line = shade(color, -0.28)
  const boards = [0, 1, 2, 3, 4, 5]
  return (
    <>
      {boards.map((i) => {
        const at = i * 10
        return vertical ? (
          <line key={i} x1={at} y1={0} x2={at} y2={S} stroke={line} strokeWidth={1.25} />
        ) : (
          <g key={i}>
            <rect x={0} y={at} width={S} height={10} fill={shade(color, i % 2 ? 0.05 : -0.02)} />
            <line x1={0} y1={at + 10} x2={S} y2={at + 10} stroke={line} strokeWidth={1.25} />
          </g>
        )
      })}
    </>
  )
}

function Stone({ color }: { color: string }) {
  const line = shade(color, -0.32)
  // Deliberately uneven: regular blocks read as brick, not as stone.
  const blocks: [number, number, number, number][] = [
    [0, 0, 24, 18],
    [24, 0, 34, 18],
    [0, 18, 34, 16],
    [34, 18, 24, 16],
    [0, 34, 20, 24],
    [20, 34, 22, 24],
    [42, 34, 16, 24],
  ]
  return (
    <>
      {blocks.map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x + 1}
          y={y + 1}
          width={w - 2}
          height={h - 2}
          rx={2}
          fill={shade(color, i % 3 === 0 ? 0.06 : i % 3 === 1 ? -0.05 : 0)}
          stroke={line}
          strokeWidth={1}
        />
      ))}
    </>
  )
}

function RoofTile({ color }: { color: string }) {
  const line = shade(color, -0.3)
  return (
    <>
      {[0, 1, 2, 3].map((row) => {
        const y = row * 15
        const offset = row % 2 === 0 ? 0 : -8
        return [0, 1, 2, 3, 4].map((col) => (
          <path
            key={`${row}-${col}`}
            d={`M ${offset + col * 16} ${y + 14} v -6 a 8 8 0 0 1 16 0 v 6 z`}
            fill={shade(color, row % 2 === 0 ? 0.05 : -0.03)}
            stroke={line}
            strokeWidth={1}
          />
        ))
      })}
    </>
  )
}

function Shingle({ color }: { color: string }) {
  const line = shade(color, -0.35)
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => {
        const y = row * 12
        const offset = row % 2 === 0 ? 0 : -9
        return [0, 1, 2, 3, 4].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={offset + col * 18 + 1}
            y={y}
            width={16}
            height={11}
            rx={1}
            fill={shade(color, row % 2 === 0 ? 0.04 : -0.04)}
            stroke={line}
            strokeWidth={0.9}
          />
        ))
      })}
    </>
  )
}

function Speckle({ color, lines }: { color: string; lines?: boolean }) {
  const faint = shade(color, -0.12)
  return (
    <>
      {lines && (
        <>
          <line x1={0} y1={19} x2={S} y2={19} stroke={faint} strokeWidth={1} />
          <line x1={0} y1={39} x2={S} y2={39} stroke={faint} strokeWidth={1} />
        </>
      )}
      {[
        [10, 12],
        [38, 9],
        [22, 28],
        [47, 33],
        [14, 45],
        [33, 50],
        [51, 20],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.4} fill={faint} opacity={0.7} />
      ))}
    </>
  )
}

/** Draws one finish at tile size, in the colour it is currently set to. */
export function MaterialPreview({
  pattern,
  color,
}: {
  pattern: SurfacePattern
  color: string
}) {
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${S} ${S}`} aria-hidden>
      <rect width={S} height={S} fill={color} />
      {pattern === 'brick' && <Brick color={color} />}
      {pattern === 'woodLap' && <Lap color={color} />}
      {pattern === 'fibre' && <Lap color={color} vertical />}
      {pattern === 'stone' && <Stone color={color} />}
      {pattern === 'roofTile' && <RoofTile color={color} />}
      {pattern === 'roofShingle' && <Shingle color={color} />}
      {pattern === 'roofMetal' && <Lap color={color} vertical />}
      {pattern === 'plaster' && <Speckle color={color} />}
      {pattern === 'concrete' && <Speckle color={color} lines />}
      {pattern === 'roofFlat' && <Speckle color={color} lines />}
      {/* `paint` is flat on purpose — that is what distinguishes it. */}
    </svg>
  )
}
