import type { DrawingState, Point } from '../drawing/types'

/**
 * Pure geometry helpers for the SVG plan sheet. No React, no three.js — this
 * is the same tier as `drawing/`, deriving what a floor-plan sheet needs to
 * draw (bounds, structural grid axes, dimension chains, node degrees) from the
 * shared `DrawingState`.
 */

export interface SheetBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** A structural grid line, at a fixed coordinate, with its bubble label. */
export interface GridAxis {
  /** World coordinate: x for verticals, y for horizontals. */
  at: number
  /** Bubble text — numbers across, letters down, per drafting convention. */
  label: string
}

export interface PlanGrid {
  /** Vertical grid lines, left → right, numbered 1, 2, 3, … */
  verticals: GridAxis[]
  /** Horizontal grid lines, top → bottom, lettered A, B, C, … */
  horizontals: GridAxis[]
}

/** One measured span in a dimension chain, between two adjacent grid lines. */
export interface DimensionSpan {
  from: number
  to: number
  length: number
}

/** Coordinates within this many metres are treated as the same grid line. */
const COORD_EPSILON = 0.02

/** Tight bounding box over every wall corner, or null for an empty plan. */
export function sheetBounds(state: DrawingState): SheetBounds | null {
  const nodes = Object.values(state.nodes)
  if (nodes.length < 2 || state.walls.length === 0) return null

  return nodes.reduce<SheetBounds>(
    (box, node) => ({
      minX: Math.min(box.minX, node.x),
      maxX: Math.max(box.maxX, node.x),
      minY: Math.min(box.minY, node.y),
      maxY: Math.max(box.maxY, node.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}

/** Distinct sorted coordinates, collapsing values within COORD_EPSILON. */
function distinctCoords(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const value of sorted) {
    if (out.length === 0 || Math.abs(value - out[out.length - 1]) > COORD_EPSILON) {
      out.push(value)
    }
  }
  return out
}

/** A → Z, then AA, AB, … so a plan with many axes never runs out of labels. */
function letterLabel(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

/**
 * The structural grid: one axis per distinct wall-corner x (numbered) and per
 * distinct y (lettered). Only wall endpoints contribute, so openings and
 * furniture never spawn stray grid lines — mirroring how a real plan grids to
 * the structure.
 */
export function planGrid(state: DrawingState): PlanGrid {
  const xs = distinctCoords(Object.values(state.nodes).map((n) => n.x))
  const ys = distinctCoords(Object.values(state.nodes).map((n) => n.y))

  return {
    verticals: xs.map((at, i) => ({ at, label: String(i + 1) })),
    horizontals: ys.map((at, i) => ({ at, label: letterLabel(i) })),
  }
}

/** Consecutive gaps between grid coordinates — the numbers in a dimension chain. */
export function dimensionChain(coords: number[]): DimensionSpan[] {
  const spans: DimensionSpan[] = []
  for (let i = 0; i < coords.length - 1; i++) {
    spans.push({ from: coords[i], to: coords[i + 1], length: coords[i + 1] - coords[i] })
  }
  return spans
}

/** How many walls meet at each node — degree 1 marks a free end needing a cap. */
export function nodeDegrees(state: DrawingState): Map<string, number> {
  const degrees = new Map<string, number>()
  const bump = (id: string) => degrees.set(id, (degrees.get(id) ?? 0) + 1)
  for (const wall of state.walls) {
    if (wall.a === wall.b) continue
    bump(wall.a)
    bump(wall.b)
  }
  return degrees
}

/** Unit-length left-hand normal of the direction a → b. */
export function segmentNormal(a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy) || 1
  return { x: -dy / length, y: dx / length }
}
