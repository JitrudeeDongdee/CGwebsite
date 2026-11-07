import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useTheme } from '@mui/material/styles'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawingState } from '../drawing/types'
import { LEVEL_HEIGHT, buildBuilding3D, type Building3D } from '../drawing/building3d'
import { PITCH_RISE, buildRoof, type RoofPitch, type RoofShape } from '../drawing/roof'
import {
  ROOF_FINISH,
  TRIM_SURFACE,
  WALL_FINISH,
  type FrameMaterial,
  type RoofMaterial,
  type WallMaterial,
} from '../drawing/materials'
import { PatternedBox, useRoofGeometry, useSolid, useTiled } from './Surfaces'
import { OpeningsView } from './Openings'
import { FurnitureView } from './Furniture'

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
    : [span * 1.2, eaves + span * 0.85, span * 1.5]
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
}: {
  bounds: NonNullable<Building3D['bounds']>
  shape: RoofShape
  pitch: RoofPitch
  eaves: number
  material: RoofMaterial
  color: string
  wall: WallMaterial
  wallColor: string
}) {
  const mesh = useMemo(
    () => buildRoof(bounds, shape, { eaves, rise: PITCH_RISE[pitch] }),
    [bounds, shape, pitch, eaves],
  )

  const surface = useRoofGeometry(mesh.positions, mesh.uvs)
  const fascia = useRoofGeometry(mesh.fascia, mesh.fasciaUvs)
  const gables = useRoofGeometry(mesh.gables, mesh.gableUvs)

  // The roof's UVs are already in metres, so the pattern is scaled 1:1.
  const roofing = useTiled(ROOF_FINISH[material].pattern, color, 1, 1, THREE.DoubleSide)
  const gableSkin = useTiled(WALL_FINISH[wall].pattern, wallColor, 1, 1, THREE.DoubleSide)
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
  const grass = useTiled('grass', '#8FA86B', span * 8, span * 8)
  const paving = useTiled('paving', '#CFCAC2', 1, 1)
  const floor = useTiled('paving', '#D8D3CA', 1, 1)

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
        receiveShadow
      >
        <planeGeometry args={[span * 8, span * 8]} />
      </mesh>

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
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
  options: Building3DOptions
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
      <color attach="background" args={[sceneColors.background]} />

      <hemisphereLight intensity={0.6} color="#dceaf5" groundColor="#8a8275" />
      <directionalLight
        position={[sun * 0.8, sun * 1.5, sun * 0.6]}
        intensity={2.1}
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
      <directionalLight position={[-sun, sun * 0.7, -sun * 0.8]} intensity={0.45} />

      <Orbit
        target={[0, eaves * 0.4, 0]}
        span={span}
        eaves={eaves}
        cutaway={!options.showRoof}
      />

      {/* Centred on the origin, so the light, its shadow camera and the orbit
          target all work from one place whatever the plan's coordinates. */}
      <group position={[-centre[0], 0, -centre[2]]}>
        <Ground bounds={building.bounds} span={span} storeys={options.storeys} />

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
            wall={options.wall}
            wallColor={options.wallColor}
          />
        )}
      </group>
    </Canvas>
  )
}
