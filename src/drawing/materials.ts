/**
 * The finishes a customer can pick in the 3D view.
 *
 * Pure data: names, real tile sizes and colours. The canvas drawing and the
 * three.js materials that use this live in `src/scene3d/textures.ts`, so this
 * file stays free of three.js like the rest of `drawing/`.
 *
 * A finish is split in two — a PATTERN (what the surface is made of) and a
 * COLOUR (what it was painted or fired) — because that is how the choice is
 * actually made, and because a dozen patterns times a dozen colours is a
 * hundred-odd finishes from two short rows of buttons.
 */

/** A repeating surface pattern. One drawing in `textures.ts` per entry. */
export type SurfacePattern =
  | 'plaster'
  | 'paint'
  | 'brick'
  | 'woodLap'
  | 'fibre'
  | 'stone'
  | 'concrete'
  | 'roofTile'
  | 'roofMetal'
  | 'roofShingle'
  | 'roofFlat'
  | 'grass'
  | 'paving'
  | 'gravel'
  | 'cobble'

export interface PatternSpec {
  /** Real size of one tile in metres, so the pattern stays to scale. */
  tileU: number
  tileV: number
  /** Relief depth, handed to the material's `bumpScale`. */
  bump: number
  roughness: number
  metalness: number
}

export const PATTERN_SPEC: Record<SurfacePattern, PatternSpec> = {
  plaster: { tileU: 1.2, tileV: 1.2, bump: 0.004, roughness: 0.95, metalness: 0 },
  paint: { tileU: 2, tileV: 2, bump: 0.002, roughness: 0.8, metalness: 0 },
  brick: { tileU: 1.2, tileV: 0.6, bump: 0.02, roughness: 0.9, metalness: 0 },
  woodLap: { tileU: 1.2, tileV: 0.6, bump: 0.016, roughness: 0.7, metalness: 0 },
  fibre: { tileU: 0.6, tileV: 1.2, bump: 0.012, roughness: 0.75, metalness: 0 },
  stone: { tileU: 1, tileV: 1, bump: 0.03, roughness: 0.95, metalness: 0 },
  concrete: { tileU: 1.2, tileV: 1.2, bump: 0.008, roughness: 0.85, metalness: 0.05 },
  roofTile: { tileU: 0.5, tileV: 0.5, bump: 0.035, roughness: 0.85, metalness: 0 },
  roofMetal: { tileU: 0.75, tileV: 3, bump: 0.02, roughness: 0.35, metalness: 0.65 },
  roofShingle: { tileU: 0.9, tileV: 0.5, bump: 0.025, roughness: 0.95, metalness: 0 },
  roofFlat: { tileU: 1.5, tileV: 1.5, bump: 0.006, roughness: 0.9, metalness: 0 },
  grass: { tileU: 2.5, tileV: 2.5, bump: 0.01, roughness: 1, metalness: 0 },
  paving: { tileU: 1, tileV: 1, bump: 0.006, roughness: 0.9, metalness: 0 },
  // The pale chippings the reference render's yard is laid with, and the
  // herringbone brick path that crosses it to the steps.
  gravel: { tileU: 1.1, tileV: 1.1, bump: 0.014, roughness: 1, metalness: 0 },
  cobble: { tileU: 0.9, tileV: 0.9, bump: 0.012, roughness: 0.92, metalness: 0 },
}

export const WALL_MATERIALS = [
  'plaster',
  'paint',
  'brick',
  'wood',
  'fibre',
  'stone',
  'concrete',
] as const
export type WallMaterial = (typeof WALL_MATERIALS)[number]

export const ROOF_MATERIALS = ['tile', 'metal', 'shingle', 'deck'] as const
export type RoofMaterial = (typeof ROOF_MATERIALS)[number]

export const FRAME_MATERIALS = ['aluminium', 'wood', 'white', 'black', 'bronze'] as const
export type FrameMaterial = (typeof FRAME_MATERIALS)[number]

interface Finish {
  pattern: SurfacePattern
  /** Picked for the customer when they choose this material. */
  defaultColor: string
}

export const WALL_FINISH: Record<WallMaterial, Finish> = {
  plaster: { pattern: 'plaster', defaultColor: '#EDE9E2' },
  paint: { pattern: 'paint', defaultColor: '#F4F1EA' },
  brick: { pattern: 'brick', defaultColor: '#B05A3E' },
  wood: { pattern: 'woodLap', defaultColor: '#B08152' },
  fibre: { pattern: 'fibre', defaultColor: '#DED8CC' },
  stone: { pattern: 'stone', defaultColor: '#9A958C' },
  concrete: { pattern: 'concrete', defaultColor: '#A3A19C' },
}

export const ROOF_FINISH: Record<RoofMaterial, Finish> = {
  tile: { pattern: 'roofTile', defaultColor: '#9E4A3A' },
  metal: { pattern: 'roofMetal', defaultColor: '#5B646B' },
  shingle: { pattern: 'roofShingle', defaultColor: '#4A4A48' },
  deck: { pattern: 'roofFlat', defaultColor: '#AEABA4' },
}

export interface ColorOption {
  /** Also the i18n key: `building3d.color.<id>`. */
  id: string
  hex: string
}

/** House colours that are actually sold here — not a full colour picker. */
export const WALL_COLORS: readonly ColorOption[] = [
  { id: 'white', hex: '#F4F1EA' },
  { id: 'cream', hex: '#E6D9BE' },
  { id: 'sand', hex: '#D3C3A4' },
  { id: 'greyLight', hex: '#C6C3BC' },
  { id: 'greyDark', hex: '#7E8183' },
  { id: 'wood', hex: '#B08152' },
  { id: 'terracotta', hex: '#B05A3E' },
  { id: 'sage', hex: '#B8C3AE' },
  { id: 'blueGrey', hex: '#8095A6' },
  { id: 'charcoal', hex: '#4D5154' },
]

export const ROOF_COLORS: readonly ColorOption[] = [
  { id: 'brickRed', hex: '#9E4A3A' },
  { id: 'orange', hex: '#C2714F' },
  { id: 'brown', hex: '#6B4436' },
  { id: 'greyDark', hex: '#4A5055' },
  { id: 'black', hex: '#2F3336' },
  { id: 'green', hex: '#3F5F4A' },
  { id: 'blue', hex: '#3A5370' },
  { id: 'cream', hex: '#CFC9BC' },
]

export interface Surface {
  color: string
  roughness: number
  metalness: number
}

/** Frames are painted or anodised — smooth, so they need no pattern. */
export const FRAME_SURFACE: Record<FrameMaterial, Surface> = {
  aluminium: { color: '#9AA0A6', roughness: 0.35, metalness: 0.85 },
  wood: { color: '#8A5A32', roughness: 0.65, metalness: 0 },
  white: { color: '#F2F2F0', roughness: 0.5, metalness: 0 },
  black: { color: '#2B2D2F', roughness: 0.45, metalness: 0.2 },
  bronze: { color: '#6E5338', roughness: 0.4, metalness: 0.7 },
}

/** Fascia, barge boards and the floor band between storeys. */
export const TRIM_SURFACE: Surface = { color: '#F0EDE6', roughness: 0.6, metalness: 0 }

/** The door leaf itself, so a door never reads as glazing. */
export const DOOR_SURFACE: Record<FrameMaterial, Surface> = {
  aluminium: { color: '#B9BDC1', roughness: 0.45, metalness: 0.6 },
  wood: { color: '#7A4A26', roughness: 0.6, metalness: 0 },
  white: { color: '#EDEDEB', roughness: 0.5, metalness: 0 },
  black: { color: '#33363A', roughness: 0.45, metalness: 0.15 },
  bronze: { color: '#5E472F', roughness: 0.4, metalness: 0.6 },
}

/** Glazing is shared by every frame option. */
export const GLASS_SURFACE = {
  color: '#A8C4D6',
  roughness: 0.03,
  metalness: 0,
  // Daylight glazing reads as a reflection, not as a view of the room: at
  // 0.38 the dark interior showed straight through and every window was a
  // flat dark hole.
  opacity: 0.6,
}
