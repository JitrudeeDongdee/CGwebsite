import type { DrawingState } from './types'
import { createInitialState } from './state'

/**
 * A house is a STACK of plans, one per storey, not one plan repeated.
 *
 * Until now a second storey in the 3D view was literally the ground floor
 * drawn again a level up, because there was only ever one `DrawingState` to
 * work from — and the panel said so rather than pretending otherwise. A real
 * upper floor almost never matches the one below it (the stair lands
 * somewhere, the bathroom stacks, the rest does not), so each storey now
 * carries its own plan.
 *
 * `DrawingState` itself is UNCHANGED, deliberately. It is the shape every
 * consumer in `scene/`, `sheet/`, `scene3d/` and the lead snapshot reads, so
 * the stack sits above it: one floor is still exactly a `DrawingState`, and
 * anything that works on a single floor needs no change at all.
 */

/** Ground floor first. There is always at least one. */
export type Floors = DrawingState[]

/**
 * Two is what the 3D view offers and what customers ask for; the model is an
 * array, so raising this is the only change a third storey needs.
 */
export const MAX_FLOORS = 2

export function createInitialFloors(): Floors {
  return [createInitialState()]
}

/** Clamps a remembered index to what actually exists. */
export function floorIndex(floors: Floors, wanted: number): number {
  if (!Number.isFinite(wanted)) return 0
  return Math.min(Math.max(0, Math.trunc(wanted)), floors.length - 1)
}

/** Applies an edit to one floor, leaving the others untouched. */
export function mapFloor(floors: Floors, at: number, edit: (floor: DrawingState) => DrawingState): Floors {
  const index = floorIndex(floors, at)
  return floors.map((floor, i) => (i === index ? edit(floor) : floor))
}

/**
 * Adds a storey above `copyFrom`, as a COPY of it rather than an empty sheet.
 *
 * Almost every two-storey house starts from the footprint below — the outer
 * walls line up because they carry the load — so a copy is a few edits from
 * right, where a blank floor is a redraw. The copy is deep: the two floors
 * must not share node or wall objects, or dragging a corner upstairs would
 * move the one below it.
 */
export function addFloor(floors: Floors, copyFrom: number): Floors {
  if (floors.length >= MAX_FLOORS) return floors
  const source = floors[floorIndex(floors, copyFrom)]
  return [...floors, structuredClone(source)]
}

/** Removes a storey. The ground floor cannot be removed — a house has one. */
export function removeFloor(floors: Floors, at: number): Floors {
  if (floors.length <= 1) return floors
  const index = floorIndex(floors, at)
  if (index === 0) return floors
  return floors.filter((_, i) => i !== index)
}
