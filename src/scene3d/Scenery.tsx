import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import type { Building3D } from '../drawing/building3d'
import { skyDomeMap, skyEquirect } from './textures'

/**
 * The direction the sun comes from. One constant, because the sky, the light
 * that casts the shadows and the fill all have to agree — a shadow falling
 * away from the sun you can see is the kind of thing nobody can name but
 * everybody notices.
 */
export const SUN_DIRECTION = new THREE.Vector3(0.55, 0.78, 0.42).normalize()

/** Radius of the sky dome, comfortably inside the camera's far plane. */
const DOME_RADIUS = 400

/**
 * The sky you see, as a gradient dome.
 *
 * ⚠️ This replaces drei's `<Sky>` (the Preetham atmospheric shader), which
 * rendered the whole viewport WHITE here — the house included — and was
 * caught only by looking at the screen. Its output is scene-referred
 * radiance meant to be paired with a low tone-mapping exposure; at the
 * renderer's default it blows out, and it is not worth bending the exposure
 * of an entire architectural view around one backdrop. A gradient also costs
 * nothing and stays in step with the environment map by construction.
 */
export function SkyDome() {
  const map = useMemo(() => skyDomeMap(), [])

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[DOME_RADIUS, 32, 16]} />
      {/* ⚠️ `BackSide` and nothing else. Mirroring the sphere with a
          scale of -1 as well — the usual trick for an equirectangular
          backdrop — flips the winding back and culls the dome away
          entirely: the sky renders nothing at all and looks simply absent.
          `toneMapped: false` keeps the backdrop the colour it was drawn,
          and no depth write so it never occludes the house. */}
      <meshBasicMaterial map={map} side={THREE.BackSide} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

/**
 * Lights the scene from the sky as well as from the sun, and gives glazing
 * and metal roofing something to reflect.
 *
 * The cube map is built here from a gradient rather than loaded from a CDN
 * (which is what drei's `preset` environments do): the designer must keep
 * working offline and must not depend on someone else's asset host.
 */
export function SkyEnvironment() {
  const gl = useThree((three) => three.gl)
  const scene = useThree((three) => three.scene)

  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl)
    const target = generator.fromEquirectangular(skyEquirect())
    scene.environment = target.texture
    // Reflections only — the sky mesh is what you actually see behind the
    // house, and a background set here would sit in front of it.
    scene.environmentIntensity = 0.5
    generator.dispose()

    return () => {
      scene.environment = null
      target.dispose()
    }
  }, [gl, scene])

  return null
}

interface Spot {
  x: number
  z: number
  /** Overall size multiplier. */
  scale: number
  shrub: boolean
  tone: number
}

/**
 * Where the planting goes, in multiples of the house's half-extent plus a
 * margin. Fixed rather than random so the garden does not rearrange itself
 * every time the plan changes — and kept off the near corner (+x, +z), which
 * is where the camera starts: a tree across the front elevation hides the
 * thing the customer came to look at.
 */
const LAYOUT: Spot[] = [
  { x: -1.35, z: -1.3, scale: 1.15, shrub: false, tone: 0 },
  { x: -1.25, z: 0.15, scale: 0.95, shrub: false, tone: 1 },
  { x: 0.2, z: -1.45, scale: 1.05, shrub: false, tone: 2 },
  { x: 1.3, z: -1.1, scale: 0.85, shrub: false, tone: 0 },
  { x: -1.4, z: 1.15, scale: 0.8, shrub: false, tone: 1 },
  { x: -0.55, z: 1.4, scale: 1, shrub: true, tone: 2 },
  { x: 0.95, z: 1.45, scale: 0.9, shrub: true, tone: 0 },
  { x: 1.45, z: 0.35, scale: 1.1, shrub: true, tone: 1 },
]

function Tree({
  spot,
  bark,
  leaves,
}: {
  spot: Spot
  bark: THREE.Material
  leaves: THREE.Material[]
}) {
  const height = 2.4 * spot.scale
  const crown = 1.15 * spot.scale
  const leaf = leaves[spot.tone % leaves.length]

  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, height / 2, 0]} material={bark} castShadow>
        <cylinderGeometry args={[0.1 * spot.scale, 0.16 * spot.scale, height, 6]} />
      </mesh>
      {/* Three overlapping blobs read as a canopy; one sphere reads as a ball
          on a stick. Low detail on purpose — this is scenery, not the house. */}
      <mesh position={[0, height + crown * 0.35, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[crown, 1]} />
      </mesh>
      <mesh
        position={[crown * 0.6, height + crown * 0.05, crown * 0.2]}
        material={leaf}
        castShadow
      >
        <icosahedronGeometry args={[crown * 0.68, 1]} />
      </mesh>
      <mesh
        position={[-crown * 0.5, height - crown * 0.1, -crown * 0.35]}
        material={leaf}
        castShadow
      >
        <icosahedronGeometry args={[crown * 0.6, 1]} />
      </mesh>
    </group>
  )
}

function Shrub({ spot, leaves }: { spot: Spot; leaves: THREE.Material[] }) {
  const r = 0.55 * spot.scale
  const leaf = leaves[spot.tone % leaves.length]

  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, r * 0.8, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[r, 1]} />
      </mesh>
      <mesh position={[r * 0.8, r * 0.55, r * 0.3]} material={leaf} castShadow>
        <icosahedronGeometry args={[r * 0.7, 1]} />
      </mesh>
    </group>
  )
}

/** Trees and shrubs round the plot, for scale and for somewhere to sit. */
export function Planting({ bounds, span }: { bounds: Building3D['bounds']; span: number }) {
  const palette = useMemo(() => {
    const leaves = ['#4C7A3A', '#3F6B35', '#5E8C44'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }),
    )
    const bark = new THREE.MeshStandardMaterial({ color: '#6B5440', roughness: 0.9 })
    return { leaves, bark }
  }, [])

  useEffect(
    () => () => {
      palette.bark.dispose()
      for (const leaf of palette.leaves) leaf.dispose()
    },
    [palette],
  )

  if (!bounds) return null

  const centreX = (bounds.minX + bounds.maxX) / 2
  const centreZ = (bounds.minZ + bounds.maxZ) / 2
  // Clear of the paved apron, and further out on a bigger house so the
  // planting never lands against a wall.
  const reachX = (bounds.maxX - bounds.minX) / 2 + 2.6 + span * 0.08
  const reachZ = (bounds.maxZ - bounds.minZ) / 2 + 2.6 + span * 0.08

  return (
    <>
      {LAYOUT.map((spot, index) => {
        const placed: Spot = {
          ...spot,
          x: centreX + spot.x * reachX,
          z: centreZ + spot.z * reachZ,
        }
        return spot.shrub ? (
          <Shrub key={index} spot={placed} leaves={palette.leaves} />
        ) : (
          <Tree key={index} spot={placed} bark={palette.bark} leaves={palette.leaves} />
        )
      })}
    </>
  )
}
