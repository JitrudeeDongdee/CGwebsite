export const WALL_MATERIALS = ['plaster', 'brick', 'wood', 'concrete'] as const
export type WallMaterial = (typeof WALL_MATERIALS)[number]

export const FRAME_MATERIALS = ['aluminium', 'wood', 'white'] as const
export type FrameMaterial = (typeof FRAME_MATERIALS)[number]

export const ROOF_MATERIALS = ['tile', 'metal', 'shingle'] as const
export type RoofMaterial = (typeof ROOF_MATERIALS)[number]

interface Surface {
  color: string
  roughness: number
  metalness: number
}

/**
 * Finishes for the 3D view. Deliberately flat colours with plausible
 * roughness rather than textures — the brief calls for readable structural
 * massing, not a photoreal render, and a customer only needs to tell the
 * options apart.
 */
export const WALL_SURFACE: Record<WallMaterial, Surface> = {
  plaster: { color: '#EDE9E2', roughness: 0.95, metalness: 0 },
  brick: { color: '#A8563C', roughness: 0.9, metalness: 0 },
  wood: { color: '#B08152', roughness: 0.75, metalness: 0 },
  concrete: { color: '#9E9C97', roughness: 0.9, metalness: 0 },
}

export const FRAME_SURFACE: Record<FrameMaterial, Surface> = {
  aluminium: { color: '#8C9196', roughness: 0.4, metalness: 0.8 },
  wood: { color: '#8A5A32', roughness: 0.7, metalness: 0 },
  white: { color: '#F2F2F0', roughness: 0.6, metalness: 0 },
}

export const ROOF_SURFACE: Record<RoofMaterial, Surface> = {
  tile: { color: '#8E4B3C', roughness: 0.9, metalness: 0 },
  metal: { color: '#5B646B', roughness: 0.35, metalness: 0.7 },
  shingle: { color: '#4A4A48', roughness: 0.95, metalness: 0 },
}

/** Glazing is shared by every frame option. */
export const GLASS_SURFACE = {
  color: '#9EC6DE',
  roughness: 0.1,
  metalness: 0.1,
  opacity: 0.45,
}
