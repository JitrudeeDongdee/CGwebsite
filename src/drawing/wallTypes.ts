/**
 * Wall styles the user picks before drawing. Each maps to a concrete
 * thickness stamped on the wall (`DrawWall.thickness`), which the poché
 * renderer and 3D builder already honour. `auto` leaves the thickness unset so
 * the old behaviour stands — outer walls thicken automatically once a room
 * closes, everything else stays a partition.
 */
export interface WallType {
  id: string
  labelKey: string
  /** Metres; `undefined` means "let the plan decide" (exterior vs interior). */
  thickness?: number
}

export const WALL_TYPES: WallType[] = [
  { id: 'auto', labelKey: 'wallTypes.auto', thickness: undefined },
  { id: 'exterior', labelKey: 'wallTypes.exterior', thickness: 0.2 },
  { id: 'loadBearing', labelKey: 'wallTypes.loadBearing', thickness: 0.25 },
  { id: 'interior', labelKey: 'wallTypes.interior', thickness: 0.1 },
  { id: 'partition', labelKey: 'wallTypes.partition', thickness: 0.075 },
]

export const DEFAULT_WALL_TYPE = WALL_TYPES[0]

export function wallTypeById(id: string): WallType {
  return WALL_TYPES.find((w) => w.id === id) ?? DEFAULT_WALL_TYPE
}
