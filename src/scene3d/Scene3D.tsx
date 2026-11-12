import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useTheme } from '@mui/material/styles'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawingState } from '../drawing/types'
import { LEVEL_HEIGHT, buildBuilding3D, type Building3D } from '../drawing/building3d'
import {
  EAVES_OVERHANG,
  buildRoof,
  type EavesDepth,
  type RoofPitch,
  type RoofShape,
} from '../drawing/roof'
import {
  ROOF_FINISH,
  TRIM_SURFACE,
  WALL_FINISH,
  type FrameMaterial,
  type RoofMaterial,
  type WallMaterial,
} from '../drawing/materials'
import {
  PatternedBox,
  usePlaneGeometry,
  useRoofGeometry,
  useShared,
  useSolid,
} from './Surfaces'
import { OpeningsView } from './Openings'
import { FurnitureView } from './Furniture'
import { Planting, SUN_DIRECTION, SkyDome, SkyEnvironment } from './Scenery'

export { warmDefaultPatterns } from './textures'

extend({ OrbitControls })

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
  }
}

export interface Building3DOptions {
  roof: RoofShape
  pitch: RoofPitch
  /** 1 or 2 — a second storey repeats the same plan above the first. */
  storeys: number
  wall: WallMaterial
  wallColor: string
  frame: FrameMaterial
  roofMaterial: RoofMaterial
  roofColor: string
  /** Lift the roof off, to look inside at the rooms. */
  showRoof: boolean
  furniture: boolean
  /** Trees and shrubs round the plot. */
  scenery: boolean
  /** How far the roof runs past the walls; `flush` is the Nordic archetype. */
  eaves: EavesDepth
  /** A gable in a different finish from the walls — a timber gable end. */
  gableWall?: WallMaterial
  gableColor?: string
}

/**
 * Tells the page the house is actually on screen.
 *
 * The second frame, not the first: materials compile and textures upload
 * during the first one, so a loading cover removed on frame 1 uncovers a
 * canvas that is still blank.
 */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const seen = useRef(0)
  const told = useRef(false)

  useFrame(() => {
    if (told.current) return
    seen.current += 1
    if (seen.current < 2) return
    told.current = true
    onReady?.()
  })

  return null
}

/**
 * Where to stand.
 *
 * With the roof off the camera has to be much higher, and that is not a
 * matter of taste: at the ~29 degrees that reads best for the outside of the
 * house, a 2.7 m wall hides nearly 5 m of floor behind it — more than the
 * depth of most of these plans, so the furniture inside is drawn and then
 * completely hidden by the near wall. Steeper than 60 degrees leaves under a
 * metre of floor in shadow of each wall, which is what makes a cutaway
 * readable.
 */
function cameraFor(span: number, eaves: number, cutaway: boolean): [number, number, number] {
  return cutaway
    ? [span * 0.6, eaves + span * 1.9, span * 0.8]
    : // About 15 degrees above the horizon for the outside view, so the
      // horizon and some sky sit in the top of the frame. Steeper than about
      // 22 degrees and the top edge of a 45-degree frame falls BELOW the
      // horizon — the sky is then rendered and never seen, which is exactly
      // what the first attempt at this did.
      [span * 1.25, eaves + span * 0.35, span * 1.6]
}

/** Free orbit here — unlike the locked top-down plan view. */
function Orbit({
  target,
  span,
  eaves,
  cutaway,
}: {
  target: [number, number, number]
  span: number
  eaves: number
  cutaway: boolean
}) {
  const { camera, gl } = useThree()
  const ref = useRef<OrbitControls>(null)
  const wasCutaway = useRef(cutaway)

  useFrame(() => ref.current?.update())

  // Move only when the customer takes the roof off or puts it back — never
  // on a plan edit, which would yank the view out from under them mid-orbit.
  useEffect(() => {
    if (wasCutaway.current === cutaway) return
    wasCutaway.current = cutaway
    camera.position.set(...cameraFor(span, eaves, cutaway))
    ref.current?.update()
  }, [camera, cutaway, span, eaves])

  return (
    <orbitControls
      ref={ref}
      args={[camera, gl.domElement]}
      target={target}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
    />
  )
}

function Roof({
  bounds,
  shape,
  pitch,
  eaves,
  material,
  color,
  wall,
  wallColor,
  overhang,
}: {
  bounds: NonNullable<Building3D['bounds']>
  shape: RoofShape
  pitch: RoofPitch
  eaves: number
  material: RoofMaterial
  color: string
  wall: WallMaterial
  wallColor: string
  overhang: number
}) {
  const mesh = useMemo(
    () => buildRoof(bounds, shape, { eaves, pitch, overhang }),
    [bounds, shape, pitch, eaves, overhang],
  )

  const roofPattern = ROOF_FINISH[material].pattern
  const wallPattern = WALL_FINISH[wall].pattern

  const surface = useRoofGeometry(mesh.positions, mesh.uvs, roofPattern)
  // The fascia takes the painted trim, which carries no pattern, so its UVs
  // are scaled against 'paint' only to keep one code path.
  const fascia = useRoofGeometry(mesh.fascia, mesh.fasciaUvs, 'paint')
  const gables = useRoofGeometry(mesh.gables, mesh.gableUvs, wallPattern)

  const roofing = useShared(roofPattern, color, THREE.DoubleSide)
  const gableSkin = useShared(wallPattern, wallColor, THREE.DoubleSide)
  const trim = useSolid(TRIM_SURFACE, { side: THREE.DoubleSide })

  return (
    <>
      <mesh geometry={surface} material={roofing} castShadow receiveShadow />
      <mesh geometry={fascia} material={trim} castShadow receiveShadow />
      {mesh.gables.length > 0 && <mesh geometry={gables} material={gableSkin} castShadow />}
    </>
  )
}

/** Ground, paving apron and the floor of each storey. */
function Ground({
  bounds,
  span,
  storeys,
}: {
  bounds: Building3D['bounds']
  span: number
  storeys: number
}) {
  const ground = span * 30
  const grass = useShared('grass', '#8FA86B')
  const paving = useShared('paving', '#CFCAC2')
  const floor = useShared('paving', '#D8D3CA')
  // Only the field is tiled to its size; the apron and the floor slab show
  // one tile across the whole slab, as they always have.
  const field = usePlaneGeometry(ground, ground, 'grass')

  const apron = 1.2
  const width = bounds ? bounds.maxX - bounds.minX : 0
  const depth = bounds ? bounds.maxZ - bounds.minZ : 0
  const centreX = bounds ? (bounds.minX + bounds.maxX) / 2 : 0
  const centreZ = bounds ? (bounds.minZ + bounds.maxZ) / 2 : 0

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centreX, -0.02, centreZ]}
        material={grass}
        geometry={field}
        receiveShadow
      />

      {bounds && (
        <>
          {/* Paved apron, so the house stands on something built. */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[centreX, 0.005, centreZ]}
            material={paving}
            receiveShadow
          >
            <planeGeometry args={[width + apron * 2, depth + apron * 2]} />
          </mesh>

          {Array.from({ length: storeys }, (_, level) => (
            <mesh
              key={level}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[centreX, level * LEVEL_HEIGHT + 0.02, centreZ]}
              material={floor}
              receiveShadow
            >
              <planeGeometry args={[width, depth]} />
            </mesh>
          ))}
        </>
      )}
    </>
  )
}

export function Scene3D({
  state,
  exteriorWallIds,
  options,
  onReady,
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
  options: Building3DOptions
  /** Called once the first real frame has been drawn. */
  onReady?: () => void
}) {
  const { scene: sceneColors } = useTheme()
  const building = useMemo(
    () => buildBuilding3D(state, exteriorWallIds, { storeys: options.storeys }),
    [state, exteriorWallIds, options.storeys],
  )

  const centre: [number, number, number] = building.bounds
    ? [
        (building.bounds.minX + building.bounds.maxX) / 2,
        0,
        (building.bounds.minZ + building.bounds.maxZ) / 2,
      ]
    : [0, 0, 0]

  const span = building.bounds
    ? Math.max(
        building.bounds.maxX - building.bounds.minX,
        building.bounds.maxZ - building.bounds.minZ,
      )
    : 10

  const { eaves } = building
  const wallPattern = WALL_FINISH[options.wall].pattern
  /** Lit from one side so the massing reads, filled from the other. */
  const sun = span * 1.2 + 6
  const shadowExtent = span * 1.1 + 6

  return (
    <Canvas
      // PCF, not the softer variant: three 0.185 deprecated PCFSoftShadowMap
      // — which is what both `shadows` and `shadows="soft"` ask for — and
      // falls back to exactly this, with a warning on every context.
      shadows="percentage"
      gl={{ antialias: true }}
      camera={{
        // Far enough back that the whole house plus its roof fits.
        position: cameraFor(span, eaves, !options.showRoof),
        fov: 45,
        near: 0.1,
        far: 500,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <FirstFrame onReady={onReady} />

      {/* Behind the sky, so there is something sane for the first frame. */}
      <color attach="background" args={[sceneColors.background]} />
      <SkyDome />
      <SkyEnvironment />

      {/* The sky carries most of the ambient, so the hemisphere only tops it
          up — left at its old strength everything washed out. With the roof
          off it does more of the work: hard sun across an open plan drops
          each room into a black triangle, and the point of that view is to
          see the rooms. */}
      <hemisphereLight
        intensity={options.showRoof ? 0.3 : 0.8}
        color="#dceaf5"
        groundColor="#8a8275"
      />
      <directionalLight
        position={[
          SUN_DIRECTION.x * sun,
          SUN_DIRECTION.y * sun,
          SUN_DIRECTION.z * sun,
        ]}
        intensity={options.showRoof ? 2 : 1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={sun * 5}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
      />
      {/* Fill from the shaded side, so a north wall is not a black slab. */}
      <directionalLight position={[-sun, sun * 0.7, -sun * 0.8]} intensity={0.35} />

      <Orbit
        // Aimed above the middle of the walls, which drops the house in the
        // frame and lets the sky in behind it.
        target={[0, eaves * 0.75, 0]}
        span={span}
        eaves={eaves}
        cutaway={!options.showRoof}
      />

      {/* Centred on the origin, so the light, its shadow camera and the orbit
          target all work from one place whatever the plan's coordinates. */}
      <group position={[-centre[0], 0, -centre[2]]}>
        <Ground bounds={building.bounds} span={span} storeys={options.storeys} />

        {options.scenery && <Planting bounds={building.bounds} span={span} />}

        {building.walls.map((box) => (
          <PatternedBox
            key={box.id}
            box={box}
            pattern={wallPattern}
            color={options.wallColor}
          />
        ))}

        {building.trim.map((box) => (
          <PatternedBox key={box.id} box={box} pattern="paint" color={TRIM_SURFACE.color} />
        ))}

        {building.columns.map((box) => (
          <PatternedBox key={box.id} box={box} pattern="paint" color={TRIM_SURFACE.color} />
        ))}

        <OpeningsView units={building.openings} frame={options.frame} />

        {options.furniture &&
          Array.from({ length: options.storeys }, (_, level) => (
            <FurnitureView key={level} state={state} floor={level * LEVEL_HEIGHT + 0.03} />
          ))}

        {options.showRoof && building.bounds && (
          <Roof
            bounds={building.bounds}
            shape={options.roof}
            pitch={options.pitch}
            eaves={eaves}
            material={options.roofMaterial}
            color={options.roofColor}
            wall={options.gableWall ?? options.wall}
            wallColor={options.gableColor ?? options.wallColor}
            overhang={EAVES_OVERHANG[options.eaves]}
          />
        )}
      </group>
    </Canvas>
  )
}
