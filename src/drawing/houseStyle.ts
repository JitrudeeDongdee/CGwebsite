import type { FrameMaterial, RoofMaterial, WallMaterial } from './materials'
import type { EavesDepth, RoofPitch, RoofShape } from './roof'

/**
 * Everything that makes a house read as one style rather than another:
 * the roof's form and the finishes on it.
 *
 * Only primitives from `drawing/` — the 3D options type itself lives in
 * `scene3d/`, which `drawing/` does not import from.
 */
export interface HouseFinish {
  roof?: RoofShape
  pitch?: RoofPitch
  eaves?: EavesDepth
  roofMaterial?: RoofMaterial
  roofColor?: string
  wall?: WallMaterial
  wallColor?: string
  /** A gable end in its own finish — a timber gable above dark walls. */
  gableWall?: WallMaterial
  gableColor?: string
  frame?: FrameMaterial
}

export interface HouseStyle {
  id: string
  /** i18n key: `building3d.styles.<id>`. */
  labelKey: string
  finish: HouseFinish
}

/**
 * The house styles a customer picks between.
 *
 * ⚠️ A style is a SHAPE first and a colour second, which is why this arrived
 * with two changes to the roof itself: pitch had to become an angle (a fixed
 * rise gives a different roof on every width), and the eaves had to become a
 * choice including `flush`. Without those, "Nordic" could only ever be the
 * default roof in darker paint — which is what it was.
 */
export const HOUSE_STYLES: HouseStyle[] = [
  {
    // The archetype: a steep gable stopping dead at the wall face, black
    // timber, and the one warm note on the gable end.
    id: 'nordic',
    labelKey: 'building3d.styles.nordic',
    finish: {
      roof: 'gable',
      pitch: 'alpine',
      eaves: 'flush',
      roofMaterial: 'metal',
      roofColor: '#2F3336',
      wall: 'wood',
      wallColor: '#33373A',
      gableWall: 'wood',
      gableColor: '#B08152',
      frame: 'black',
    },
  },
  {
    id: 'nordicLight',
    labelKey: 'building3d.styles.nordicLight',
    finish: {
      roof: 'gable',
      pitch: 'steep',
      eaves: 'flush',
      roofMaterial: 'metal',
      roofColor: '#4A5055',
      wall: 'fibre',
      wallColor: '#F4F1EA',
      gableWall: 'wood',
      gableColor: '#B08152',
      frame: 'black',
    },
  },
  {
    id: 'modernBox',
    labelKey: 'building3d.styles.modernBox',
    finish: {
      roof: 'flat',
      pitch: 'low',
      eaves: 'deep',
      roofMaterial: 'deck',
      roofColor: '#AEABA4',
      wall: 'fibre',
      wallColor: '#C6C3BC',
      gableWall: undefined,
      gableColor: undefined,
      frame: 'black',
    },
  },
  {
    // Deep eaves because of the sun and the rain, not because of the look.
    id: 'thaiContemporary',
    labelKey: 'building3d.styles.thaiContemporary',
    finish: {
      roof: 'hip',
      pitch: 'medium',
      eaves: 'deep',
      roofMaterial: 'tile',
      roofColor: '#9E4A3A',
      wall: 'plaster',
      wallColor: '#F4F1EA',
      gableWall: undefined,
      gableColor: undefined,
      frame: 'aluminium',
    },
  },
  {
    id: 'cabin',
    labelKey: 'building3d.styles.cabin',
    finish: {
      roof: 'gable',
      pitch: 'steep',
      eaves: 'normal',
      roofMaterial: 'shingle',
      roofColor: '#4A4A48',
      wall: 'wood',
      wallColor: '#B08152',
      gableWall: undefined,
      gableColor: undefined,
      frame: 'wood',
    },
  },
]
