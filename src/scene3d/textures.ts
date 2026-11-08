import * as THREE from 'three'
import { PATTERN_SPEC, type SurfacePattern } from '../drawing/materials'

/**
 * Draws every surface pattern in `PATTERN_SPEC` onto a canvas, and builds the
 * three.js materials that use them.
 *
 * Why drawn in code and not loaded as image files: a bitmap set big enough to
 * read close up is megabytes the designer would have to download, every file
 * carries a licence we would have to keep track of, and a tiling photo of
 * someone else's brickwork is still someone else's brickwork. A drawn pattern
 * is a few kB of code, tiles seamlessly by construction, and tints to any
 * colour because it is drawn in greys that the material's `color` multiplies.
 */

export type { SurfacePattern }

const SIZE = 512

/** Deterministic noise, so a reload never redraws a different wall. */
function rng(seed: number): () => number {
  let s = (seed || 1) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function surface(): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas')
  el.width = SIZE
  el.height = SIZE
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)
  return { el, ctx }
}

/** Per-pixel grain. Seamless by construction: every pixel is independent. */
function grain(ctx: CanvasRenderingContext2D, amount: number, seed: number): void {
  const image = ctx.getImageData(0, 0, SIZE, SIZE)
  const data = image.data
  const rand = rng(seed)
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * amount * 255
    data[i] = Math.min(255, Math.max(0, data[i] + n))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n))
  }
  ctx.putImageData(image, 0, 0)
}

/**
 * Soft blotches for mottling. Each is drawn nine times, offset by ±SIZE, so
 * one that overlaps an edge continues on the opposite edge and the tile has
 * no visible seam.
 */
function blotches(
  ctx: CanvasRenderingContext2D,
  count: number,
  radius: number,
  alpha: number,
  seed: number,
): void {
  const rand = rng(seed)
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE
    const y = rand() * SIZE
    const r = radius * (0.5 + rand())
    const dark = rand() > 0.5
    for (const ox of [-SIZE, 0, SIZE]) {
      for (const oy of [-SIZE, 0, SIZE]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
        const tone = dark ? '0,0,0' : '255,255,255'
        g.addColorStop(0, `rgba(${tone},${alpha})`)
        g.addColorStop(1, `rgba(${tone},0)`)
        ctx.fillStyle = g
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
      }
    }
  }
}

function fill(ctx: CanvasRenderingContext2D, grey: number): void {
  ctx.fillStyle = `rgb(${grey},${grey},${grey})`
  ctx.fillRect(0, 0, SIZE, SIZE)
}

function plaster(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 246)
  blotches(ctx, 24, 70, 0.05, 11)
  grain(ctx, 0.07, 7)
  return el
}

function paint(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 250)
  blotches(ctx, 10, 120, 0.025, 3)
  grain(ctx, 0.025, 19)
  return el
}

/** Eight courses of stretcher bond, offset half a brick each course. */
function brick(): HTMLCanvasElement {
  const { el, ctx } = surface()
  // Mortar first; the bricks are drawn on top of it with a joint left round.
  fill(ctx, 232)
  grain(ctx, 0.05, 23)

  const courses = 8
  const h = SIZE / courses
  const w = SIZE / 4
  const joint = 5
  const rand = rng(41)

  for (let row = 0; row < courses; row++) {
    const offset = row % 2 === 0 ? 0 : -w / 2
    for (let col = -1; col <= 4; col++) {
      const x = col * w + offset
      const y = row * h
      const tone = 150 + Math.round(rand() * 55)
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`
      ctx.fillRect(x + joint, y + joint, w - joint * 2, h - joint * 2)
    }
  }
  grain(ctx, 0.06, 59)
  return el
}

/** Horizontal weatherboard: four boards with a shadow line under each lap. */
function woodLap(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 242)
  const boards = 4
  const h = SIZE / boards
  const rand = rng(97)

  for (let i = 0; i < boards; i++) {
    const y = i * h
    const tone = 225 + Math.round(rand() * 25)
    ctx.fillStyle = `rgb(${tone},${tone},${tone})`
    ctx.fillRect(0, y, SIZE, h)
    // Grain: long streaks along the board.
    for (let g = 0; g < 26; g++) {
      const gy = y + rand() * h
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.bezierCurveTo(SIZE / 3, gy + 2, (SIZE / 3) * 2, gy - 2, SIZE, gy)
      ctx.stroke()
    }
    // The lap casts a shadow on the board below it.
    const shade = ctx.createLinearGradient(0, y, 0, y + 10)
    shade.addColorStop(0, 'rgba(0,0,0,0.45)')
    shade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shade
    ctx.fillRect(0, y, SIZE, 10)
  }
  grain(ctx, 0.04, 131)
  return el
}

/** Vertical fibre-cement planks with a V-groove between them. */
function fibre(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 246)
  const planks = 3
  const w = SIZE / planks
  for (let i = 0; i < planks; i++) {
    const x = i * w
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(x, 0, 4, SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(x + 4, 0, 3, SIZE)
  }
  blotches(ctx, 14, 60, 0.03, 211)
  grain(ctx, 0.05, 29)
  return el
}

/** Coursed split stone: staggered blocks with a deep joint. */
function stone(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 205)
  const courses = 6
  const h = SIZE / courses
  const rand = rng(313)

  for (let row = 0; row < courses; row++) {
    let x = -rand() * 80
    const y = row * h
    while (x < SIZE) {
      const w = 60 + rand() * 90
      const tone = 215 + Math.round(rand() * 40)
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`
      ctx.beginPath()
      ctx.rect(x + 4, y + 4, w - 8, h - 8)
      ctx.fill()
      // Each block picks up its own light and shade.
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 4, y + 5)
      ctx.lineTo(x + w - 4, y + 5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.moveTo(x + 4, y + h - 5)
      ctx.lineTo(x + w - 4, y + h - 5)
      ctx.stroke()
      x += w
    }
  }
  grain(ctx, 0.09, 457)
  return el
}

/** Board-formed concrete: wide panels, tie holes, faint pour lines. */
function concrete(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 240)
  blotches(ctx, 30, 90, 0.045, 613)
  const rand = rng(673)
  for (let i = 0; i < 4; i++) {
    const y = (i * SIZE) / 4
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, y, SIZE, 2)
    // Form-tie holes sit on the board joints.
    for (let h = 0; h < 2; h++) {
      const x = 40 + rand() * (SIZE - 80)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.arc(x, y + 1, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  grain(ctx, 0.05, 787)
  return el
}

/**
 * Pantile roofing, as laid in Thailand: a wave running down the slope with a
 * course line across it. V is always the slope direction (see `buildRoof`),
 * so the waves run the right way on every roof shape.
 */
function roofTile(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 238)
  const waves = 3
  const w = SIZE / waves
  for (let i = 0; i < waves; i++) {
    const x = i * w
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, 'rgba(0,0,0,0.38)')
    g.addColorStop(0.22, 'rgba(0,0,0,0.05)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    g.addColorStop(0.78, 'rgba(0,0,0,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0.38)')
    ctx.fillStyle = g
    ctx.fillRect(x, 0, w, SIZE)
  }
  // Course line: the bottom edge of the tile above, overlapping this one.
  const lap = ctx.createLinearGradient(0, 0, 0, 26)
  lap.addColorStop(0, 'rgba(0,0,0,0.5)')
  lap.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lap
  ctx.fillRect(0, 0, SIZE, 26)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.fillRect(0, 0, SIZE, 3)
  grain(ctx, 0.04, 911)
  return el
}

/** Trapezoidal metal sheet: ribs down the slope, no cross joint. */
function roofMetal(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 246)
  const ribs = 4
  const w = SIZE / ribs
  for (let i = 0; i < ribs; i++) {
    const x = i * w
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(x, 0, 7, SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillRect(x + 7, 0, 10, SIZE)
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(x + w - 16, 0, 9, SIZE)
  }
  grain(ctx, 0.02, 1013)
  return el
}

/** Asphalt shingle: staggered tabs with a shadow under each course. */
function roofShingle(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 232)
  const courses = 4
  const h = SIZE / courses
  const w = SIZE / 3
  const rand = rng(1217)
  for (let row = 0; row < courses; row++) {
    const y = row * h
    const offset = row % 2 === 0 ? 0 : -w / 2
    for (let col = -1; col <= 3; col++) {
      const x = col * w + offset
      const tone = 215 + Math.round(rand() * 35)
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`
      ctx.fillRect(x + 3, y + 4, w - 6, h - 6)
    }
    const shade = ctx.createLinearGradient(0, y, 0, y + 12)
    shade.addColorStop(0, 'rgba(0,0,0,0.5)')
    shade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shade
    ctx.fillRect(0, y, SIZE, 12)
  }
  grain(ctx, 0.08, 1319)
  return el
}

/** Flat concrete deck: panel joints and a weathered wash. */
function roofFlat(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 242)
  blotches(ctx, 20, 110, 0.04, 1409)
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.fillRect(0, 0, SIZE, 3)
  ctx.fillRect(0, 0, 3, SIZE)
  grain(ctx, 0.04, 1511)
  return el
}

/** Mown grass: fine mottle, no features big enough to read as a repeat. */
function grass(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 232)
  blotches(ctx, 40, 60, 0.07, 1601)
  const rand = rng(1709)
  for (let i = 0; i < 1800; i++) {
    const x = rand() * SIZE
    const y = rand() * SIZE
    ctx.strokeStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rand() * 0.12})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rand() - 0.5) * 4, y - 3 - rand() * 4)
    ctx.stroke()
  }
  grain(ctx, 0.1, 1811)
  return el
}

/** Paving: one slab per tile, with a joint along two edges. */
function paving(): HTMLCanvasElement {
  const { el, ctx } = surface()
  fill(ctx, 244)
  blotches(ctx, 16, 80, 0.035, 1901)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(0, 0, SIZE, 6)
  ctx.fillRect(0, 0, 6, SIZE)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(0, 6, SIZE, 3)
  ctx.fillRect(6, 0, 3, SIZE)
  grain(ctx, 0.05, 2003)
  return el
}

const DRAW: Record<SurfacePattern, () => HTMLCanvasElement> = {
  plaster,
  paint,
  brick,
  woodLap,
  fibre,
  stone,
  concrete,
  roofTile,
  roofMetal,
  roofShingle,
  roofFlat,
  grass,
  paving,
}

const cache = new Map<SurfacePattern, { map: THREE.Texture; bump: THREE.Texture }>()

/**
 * The textures for a pattern, drawn once per session and shared.
 *
 * The same canvas backs both: as a colour map it is greys the material's
 * `color` multiplies, and as a bump map the same greys read as relief —
 * which is why one drawing is enough for both jobs.
 */
export function patternTextures(pattern: SurfacePattern): {
  map: THREE.Texture
  bump: THREE.Texture
} {
  const hit = cache.get(pattern)
  if (hit) return hit

  const el = DRAW[pattern]()

  const map = new THREE.CanvasTexture(el)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping
  map.anisotropy = 4

  const bump = new THREE.CanvasTexture(el)
  bump.wrapS = THREE.RepeatWrapping
  bump.wrapT = THREE.RepeatWrapping

  const made = { map, bump }
  cache.set(pattern, made)
  return made
}

/**
 * The sky, drawn once as a vertical gradient: zenith blue down through a pale
 * horizon to the warm ground bounce below it.
 *
 * ONE drawing serves two jobs — the dome you see behind the house, and the
 * environment map that glass and metal reflect — so the reflection in a
 * window is literally the sky above it. Without an environment a reflective
 * material reflects nothing and a window is a flat tinted panel.
 */
function skyCanvas(): HTMLCanvasElement {
  if (skyEl) return skyEl

  const el = document.createElement('canvas')
  el.width = 16
  el.height = 256
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')

  // ⚠️ The blue is deliberately pulled DOWN towards the horizon. A sphere's
  // V is linear in polar angle, so v = 0.5 - elevation/180: a view looking
  // 15 degrees down only ever shows the top ~7 degrees of sky, which on a
  // true gradient is its palest part — the first version was physically
  // right and looked like there was no sky at all.
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#2F6FB8')
  g.addColorStop(0.3, '#4E8CC9')
  g.addColorStop(0.42, '#8FC0E6')
  g.addColorStop(0.475, '#C9E0F2')
  g.addColorStop(0.497, '#E9F1F6')
  // Below the horizon: the ground bounces warm light back up.
  g.addColorStop(0.505, '#D8CDB4')
  g.addColorStop(0.6, '#9A8E76')
  g.addColorStop(1, '#6A6252')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 256)

  skyEl = el
  return el
}

let skyEl: HTMLCanvasElement | null = null
let skyEnvTexture: THREE.Texture | null = null
let skyDomeTexture: THREE.Texture | null = null

/** Equirectangular, for `PMREMGenerator` → `scene.environment`. */
export function skyEquirect(): THREE.Texture {
  if (skyEnvTexture) return skyEnvTexture
  const texture = new THREE.CanvasTexture(skyCanvas())
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  skyEnvTexture = texture
  return texture
}

/**
 * The same gradient as a plain map for the sky dome. A sphere's V runs 0 at
 * the top pole to 1 at the bottom, which is exactly how the gradient is
 * drawn, so it needs no other handling.
 */
export function skyDomeMap(): THREE.Texture {
  if (skyDomeTexture) return skyDomeTexture
  const texture = new THREE.CanvasTexture(skyCanvas())
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  skyDomeTexture = texture
  return texture
}


/**
 * A material tiled to a surface's real size in metres.
 *
 * The repeat has to be per-surface — a box's UVs run 0..1 whatever its size,
 * so one shared material would stretch the same brick over a 1 m pier and an
 * 8 m wall. The texture clones share the one uploaded canvas, so the extra
 * cost is a handful of small objects, not more image memory.
 *
 * The caller owns the result and must dispose it.
 */
export function tiledMaterial(
  pattern: SurfacePattern,
  color: string,
  width: number,
  height: number,
  extra?: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  const spec = PATTERN_SPEC[pattern]
  const { map, bump } = patternTextures(pattern)

  const colourMap = map.clone()
  colourMap.needsUpdate = true
  const bumpMap = bump.clone()
  bumpMap.needsUpdate = true

  const u = Math.max(0.05, width / spec.tileU)
  const v = Math.max(0.05, height / spec.tileV)
  colourMap.repeat.set(u, v)
  bumpMap.repeat.set(u, v)

  return new THREE.MeshStandardMaterial({
    color,
    map: colourMap,
    bumpMap,
    bumpScale: spec.bump,
    roughness: spec.roughness,
    metalness: spec.metalness,
    ...extra,
  })
}

/** Frees a material built by `tiledMaterial`, including its texture clones. */
export function disposeTiled(material: THREE.MeshStandardMaterial): void {
  material.map?.dispose()
  material.bumpMap?.dispose()
  material.dispose()
}
