import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useTheme } from '@mui/material/styles'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawFixture } from '../drawing/types'
import {
  LEVEL_HEIGHT,
  buildBuilding3D,
  type Building3D,
  type FloorPlan,
} from '../drawing/building3d'
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
import {
  EntrySteps,
  Fence,
  Piers,
  RAISE_HEIGHTS,
  RaisedSkirt,
  WallLights,
  type RaiseHeight,
} from './SitePieces'

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
  /** One colour for every room side, unless a wall was painted its own. */
  insideColor: string
  /** Lifts the floor clear of the ground, on piers, with steps to each door. */
  raise: RaiseHeight
  /** Sheer curtains inside the glazing. */
  curtains: boolean
  /** Sconces either side of each exterior door. */
  wallLights: boolean
  /** A dark slatted fence round the plot. */
  fence: boolean
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

/**
 * A storey's floor as a shape with the voids cut out of it.
 *
 * A plain `planeGeometry` cannot have a hole, so the slab is a `THREE.Shape`
 * of the footprint with one `Path` per void. Built in the XY plane and then
 * laid flat by the mesh's rotation, the way `planeGeometry` already is —
 * which is why the void's plan y maps to the shape's y with no sign flip.
 */
function useFloorGeometry(
  width: number,
  depth: number,
  centreX: number,
  centreZ: number,
  voids: DrawFixture[],
) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, -depth / 2)
    shape.lineTo(width / 2, -depth / 2)
    shape.lineTo(width / 2, depth / 2)
    shape.lineTo(-width / 2, depth / 2)
    shape.closePath()

    for (const cut of voids) {
      const hw = cut.width / 2
      const hd = cut.depth / 2
      const cos = Math.cos(cut.rotation)
      const sin = Math.sin(cut.rotation)
      const corner = (sx: number, sy: number) => {
        const lx = sx * hw
        const ly = sy * hd
        return [
          cut.x - centreX + lx * cos - ly * sin,
          cut.y - centreZ + lx * sin + ly * cos,
        ] as const
      }
      const path = new THREE.Path()
      const [x0, y0] = corner(-1, -1)
      path.moveTo(x0, y0)
      for (const [sx, sy] of [[1, -1], [1, 1], [-1, 1]] as const) {
        const [px, py] = corner(sx, sy)
        path.lineTo(px, py)
      }
      path.closePath()
      shape.holes.push(path)
    }

    return new THREE.ShapeGeometry(shape)
  }, [width, depth, centreX, centreZ, voids])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

/** One storey's slab, with its voids cut out. */
function FloorSlab({
  width,
  depth,
  centreX,
  centreZ,
  y,
  material,
  voids,
}: {
  width: number
  depth: number
  centreX: number
  centreZ: number
  y: number
  material: THREE.Material
  voids: DrawFixture[]
}) {
  const geometry = useFloorGeometry(width, depth, centreX, centreZ, voids)
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centreX, y, centreZ]}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  )
}

/** Ground, paving apron and the floor of each storey. */
function Ground({
  bounds,
  span,
  storeys,
  floors,
}: {
  bounds: Building3D['bounds']
  span: number
  storeys: number
  /** Each storey's plan, for the voids cut out of its floor. */
  floors: FloorPlan[]
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
            <FloorSlab
              key={level}
              width={width}
              depth={depth}
              centreX={centreX}
              centreZ={centreZ}
              y={level * LEVEL_HEIGHT + 0.02}
              material={floor}
              voids={
                floors[level]?.state.fixtures.filter((f) => f.kind === 'floorVoid') ?? []
              }
            />
          ))}
        </>
      )}
    </>
  )
}


/**
 * Takes away the walls standing between the camera and the rooms.
 *
 * With the roof off you are looking into a box, and from any angle two of
 * its sides are in the way. Each shell piece carries the direction it faces;
 * if that is turned towards the camera, it goes. Interior walls and the floor
 * plinth stay, so the plan still reads — it is a cutaway, not a demolition.
 *
 * One `useFrame` over the group rather than a hook per mesh: there are about
 * ninety of them and they all answer the same question.
 */
function Cutaway({ active, children }: { active: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((three) => three.camera)
  const here = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const root = group.current
    if (!root) return

    root.traverse((object) => {
      const outward = (object.userData as { outward?: { x: number; z: number } }).outward
      if (!outward) return
      if (!active) {
        object.visible = true
        return
      }

      object.getWorldPosition(here)
      const toCameraX = camera.position.x - here.x
      const toCameraZ = camera.position.z - here.z
      const distance = Math.hypot(toCameraX, toCameraZ) || 1
      const facing = (outward.x * toCameraX + outward.z * toCameraZ) / distance
      // A little past square-on, so a wall seen edge-wise is left standing.
      object.visible = facing < 0.35
    })
  })

  return <group ref={group}>{children}</group>
}

export function Scene3D({
  floors,
  options,
  onReady,
}: {
  /** One entry per storey, ground floor first — each with its own plan. */
  floors: FloorPlan[]
  options: Building3DOptions
  /** Called once the first real frame has been drawn. */
  onReady?: () => void
}) {
  const { scene: sceneColors } = useTheme()
  const building = useMemo(() => buildBuilding3D(floors), [floors])
  const storeys = Math.max(1, floors.length)

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
  const raise = RAISE_HEIGHTS[options.raise] ?? 0
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
        <Ground bounds={building.bounds} span={span} storeys={storeys} floors={floors} />

        {options.scenery && <Planting bounds={building.bounds} span={span} />}
        {options.fence && <Fence bounds={building.bounds} span={span} />}
        <Piers bounds={building.bounds} raise={raise} />
        <RaisedSkirt bounds={building.bounds} raise={raise} />
        <EntrySteps units={building.openings} raise={raise} />
        {options.wallLights && <WallLights units={building.openings} raise={raise} />}

        {/* The house itself rides on the piers. Ground, planting, fence and
            the steps up to it stay where they are, so only the building
            moves — which is what lifting a house on piers means. */}
        <group position={[0, raise, 0]}>
        <Cutaway active={!options.showRoof}>
          {building.walls.map((box) => {
            // A painted wall wins over the house default, field by field, so
            // brushing one elevation does not drag the rest with it.
            const material = (box.finish?.material ?? options.wall) as WallMaterial
            return (
              <PatternedBox
                key={box.id}
                box={box}
                pattern={
                  box.finish?.material ? WALL_FINISH[material].pattern : wallPattern
                }
                color={box.finish?.color ?? options.wallColor}
                insideColor={box.finish?.insideColor ?? options.insideColor}
              />
            )
          })}

          {building.trim.map((box) => (
            <PatternedBox key={box.id} box={box} pattern="paint" color={TRIM_SURFACE.color} />
          ))}

          {building.columns.map((box) => (
            <PatternedBox key={box.id} box={box} pattern="paint" color={TRIM_SURFACE.color} />
          ))}

          <OpeningsView
            units={building.openings}
            frame={options.frame}
            curtains={options.curtains}
          />
        </Cutaway>

        {options.furniture &&
          floors.map((floor, level) => (
            <FurnitureView
              key={level}
              state={floor.state}
              floor={level * LEVEL_HEIGHT + 0.03}
            />
          ))}

        {options.showRoof && building.roofBounds && (
          <Roof
            bounds={building.roofBounds}
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
      </group>
    </Canvas>
  )
}
