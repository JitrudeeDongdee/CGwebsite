import type { FixtureKind } from '../drawing/types'

/**
 * Plan symbols for furniture, drawn in the fixture's own metres:
 * x from -width/2 to +width/2, y from -depth/2 to +depth/2, with the piece's
 * BACK at -y — the same convention the 3D models use.
 *
 * One renderer, used by the drawing sheet and by the tool palette, so a piece
 * cannot look like one thing to place and another once placed. Before this
 * every fixture was a bare rectangle, and a plan full of furniture read as a
 * pile of boxes.
 */
export interface SymbolProps {
  kind: FixtureKind
  width: number
  depth: number
  ink: string
  /** Line weight in the units being drawn in; the sheet overrides the effect. */
  stroke?: number
  /** The sheet keeps pen weight constant on zoom; the palette does not. */
  nonScaling?: boolean
}

export function FixtureSymbol({ kind, width, depth, ink, stroke = 1, nonScaling }: SymbolProps) {
  const w = width
  const d = depth
  const x = -w / 2
  const y = -d / 2
  const line = {
    fill: 'none',
    stroke: ink,
    strokeWidth: stroke,
    ...(nonScaling ? { vectorEffect: 'non-scaling-stroke' as const } : {}),
  }
  const thin = { ...line, strokeWidth: stroke * 0.7, opacity: 0.75 }
  const body = { ...line }

  switch (kind) {
    case 'column':
      return <rect x={x} y={y} width={w} height={d} fill={ink} />

    case 'bedDouble':
    case 'bedSingle': {
      const pillow = d * 0.17
      const single = kind === 'bedSingle'
      return (
        <>
          <rect x={x} y={y} width={w} height={d} rx={d * 0.04} {...body} />
          {/* Pillows at the head, then the turned-down sheet. */}
          {single ? (
            <rect
              x={x + w * 0.15}
              y={y + d * 0.05}
              width={w * 0.7}
              height={pillow}
              rx={pillow * 0.4}
              {...thin}
            />
          ) : (
            [0, 1].map((i) => (
              <rect
                key={i}
                x={x + (i ? w * 0.52 : w * 0.06)}
                y={y + d * 0.05}
                width={w * 0.42}
                height={pillow}
                rx={pillow * 0.4}
                {...thin}
              />
            ))
          )}
          <line x1={x} y1={y + d * 0.42} x2={x + w} y2={y + d * 0.42} {...thin} />
        </>
      )
    }

    case 'sofa':
    case 'sofaL': {
      const back = d * 0.22
      const arm = w * 0.08
      return (
        <>
          <rect x={x} y={y} width={w} height={d} rx={back * 0.5} {...body} />
          <line x1={x} y1={y + back} x2={x + w} y2={y + back} {...thin} />
          <line x1={x + arm} y1={y + back} x2={x + arm} y2={y + d} {...thin} />
          <line x1={x + w - arm} y1={y + back} x2={x + w - arm} y2={y + d} {...thin} />
          {kind === 'sofaL' && (
            // The return runs down the left, as the 3D model builds it.
            <line x1={x + w * 0.36} y1={y + back} x2={x + w * 0.36} y2={y + d} {...thin} />
          )}
        </>
      )
    }

    case 'table':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} rx={Math.min(w, d) * 0.06} {...body} />
          <rect
            x={x + w * 0.08}
            y={y + d * 0.12}
            width={w * 0.84}
            height={d * 0.76}
            {...thin}
          />
        </>
      )

    case 'coffeeTable':
      return <rect x={x} y={y} width={w} height={d} rx={Math.min(w, d) * 0.12} {...body} />

    case 'chair':
      return (
        <>
          <rect x={x} y={y + d * 0.18} width={w} height={d * 0.82} rx={w * 0.12} {...body} />
          <line x1={x} y1={y + d * 0.18} x2={x + w} y2={y + d * 0.18} {...line} />
        </>
      )

    case 'diningRound': {
      const r = Math.min(w, d) * 0.3
      const seat = Math.min(w, d) * 0.15
      return (
        <>
          <circle cx={0} cy={0} r={r} {...body} />
          {[
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ].map(([sx, sy], i) => (
            <rect
              key={i}
              x={sx * (r + seat) - seat}
              y={sy * (r + seat) - seat}
              width={seat * 2}
              height={seat * 2}
              rx={seat * 0.5}
              {...thin}
            />
          ))}
        </>
      )
    }

    case 'kitchen': {
      const hob = Math.min(w, d) * 0.1
      return (
        <>
          <rect x={x} y={y} width={w} height={d} {...body} />
          <line x1={x} y1={y + d * 0.78} x2={x + w} y2={y + d * 0.78} {...thin} />
          {/* Four burners and a sink, the way a kitchen run is drawn. */}
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sy], i) => (
            <circle
              key={i}
              cx={x + w * 0.26 + sx * hob}
              cy={y + d * 0.42 + sy * hob}
              r={hob * 0.7}
              {...thin}
            />
          ))}
          <rect
            x={x + w * 0.58}
            y={y + d * 0.22}
            width={w * 0.3}
            height={d * 0.45}
            rx={d * 0.08}
            {...thin}
          />
        </>
      )
    }

    case 'fridge':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} {...body} />
          <line x1={x} y1={y + d * 0.35} x2={x + w} y2={y + d * 0.35} {...thin} />
          <line
            x1={x + w * 0.82}
            y1={y + d * 0.45}
            x2={x + w * 0.82}
            y2={y + d * 0.85}
            {...thin}
          />
        </>
      )

    case 'wardrobe':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} {...body} />
          {/* The crossed box is the standard closet symbol. */}
          <line x1={x} y1={y} x2={x + w} y2={y + d} {...thin} />
          <line x1={x + w} y1={y} x2={x} y2={y + d} {...thin} />
        </>
      )

    case 'nightstand':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} rx={Math.min(w, d) * 0.1} {...body} />
          <circle cx={0} cy={d * 0.22} r={Math.min(w, d) * 0.07} {...thin} />
        </>
      )

    case 'toilet': {
      const cistern = d * 0.26
      return (
        <>
          <rect x={x} y={y} width={w} height={cistern} rx={cistern * 0.25} {...body} />
          <ellipse
            cx={0}
            cy={y + cistern + (d - cistern) * 0.5}
            rx={w * 0.38}
            ry={(d - cistern) * 0.45}
            {...body}
          />
        </>
      )
    }

    case 'sink':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} rx={Math.min(w, d) * 0.12} {...body} />
          <ellipse cx={0} cy={d * 0.06} rx={w * 0.32} ry={d * 0.3} {...thin} />
          <circle cx={0} cy={y + d * 0.14} r={Math.min(w, d) * 0.05} {...thin} />
        </>
      )

    case 'shower':
      return (
        <>
          <rect x={x} y={y} width={w} height={d} {...body} />
          {/* The screen sweeps from the open corner, as a shower tray is drawn. */}
          <path d={`M ${x + w} ${y} A ${w} ${d} 0 0 0 ${x} ${y + d}`} {...thin} />
          <circle cx={x + w * 0.22} cy={y + d * 0.22} r={Math.min(w, d) * 0.06} {...thin} />
        </>
      )

    case 'tv':
      return (
        <>
          {/* The stand is the footprint; the screen is the heavy line across
              the back, which is how a plan shows a wall-facing television. */}
          <rect x={x} y={y} width={w} height={d} {...body} />
          <line x1={x + w * 0.04} y1={y + d * 0.2} x2={x + w * 0.96} y2={y + d * 0.2} {...body} />
          <line x1={0} y1={y + d * 0.2} x2={0} y2={y + d * 0.45} {...thin} />
          <line
            x1={x + w * 0.25}
            y1={y + d * 0.72}
            x2={x + w * 0.75}
            y2={y + d * 0.72}
            {...thin}
          />
        </>
      )

    case 'campChair':
      return (
        <>
          {/* A folding chair: seat, sling back at -y, and the crossed legs. */}
          <rect x={x + w * 0.1} y={y + d * 0.28} width={w * 0.8} height={d * 0.62} rx={w * 0.08} {...body} />
          <path d={`M ${x + w * 0.1} ${y + d * 0.3} Q ${0} ${y + d * 0.02} ${x + w * 0.9} ${y + d * 0.3}`} {...body} />
          <line x1={x + w * 0.14} y1={y + d * 0.34} x2={x + w * 0.86} y2={y + d * 0.86} {...thin} />
          <line x1={x + w * 0.86} y1={y + d * 0.34} x2={x + w * 0.14} y2={y + d * 0.86} {...thin} />
        </>
      )

    case 'firePit':
      return (
        <>
          <circle cx={0} cy={0} r={Math.min(w, d) / 2} {...body} />
          <circle cx={0} cy={0} r={Math.min(w, d) * 0.3} {...thin} />
          {/* Flame, so it is not just two circles. */}
          <path
            d={`M 0 ${-d * 0.16} Q ${w * 0.1} ${-d * 0.02} 0 ${d * 0.14} Q ${-w * 0.1} ${-d * 0.02} 0 ${-d * 0.16}`}
            {...thin}
          />
        </>
      )

    case 'floorVoid':
      return (
        <>
          {/* Dashed outline and a cross: the drafting convention for a void
              rather than an object, so nobody reads it as a table. */}
          <rect
            x={x}
            y={y}
            width={w}
            height={d}
            {...thin}
            strokeDasharray="6 4"
          />
          <line x1={x} y1={y} x2={x + w} y2={y + d} {...thin} />
          <line x1={x + w} y1={y} x2={x} y2={y + d} {...thin} />
        </>
      )

    default:
      return <rect x={x} y={y} width={w} height={d} {...body} />
  }
}
