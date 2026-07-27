import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useTheme } from '@mui/material/styles'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawingState } from '../drawing/types'
import { buildBuilding3D, WALL_HEIGHT } from '../drawing/building3d'
import { buildRoof, type RoofShape } from '../drawing/roof'
import {
  FRAME_SURFACE,
  GLASS_SURFACE,
  ROOF_SURFACE,
  WALL_SURFACE,
  type FrameMaterial,
  type RoofMaterial,
  type WallMaterial,
} from '../drawing/materials'

extend({ OrbitControls })

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
  }
}

export interface Building3DOptions {
  roof: RoofShape
  wall: WallMaterial
  frame: FrameMaterial
  roofMaterial: RoofMaterial
}

/** Free orbit here — unlike the locked top-down plan view. */
function Orbit({ target }: { target: [number, number, number] }) {
  const { camera, gl } = useThree()
  const ref = useRef<OrbitControls>(null)

  useFrame(() => ref.current?.update())

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
  material,
}: {
  bounds: NonNullable<ReturnType<typeof buildBuilding3D>['bounds']>
  shape: RoofShape
  material: RoofMaterial
}) {
  const geometry = useMemo(() => {
    const { positions } = buildRoof(bounds, shape, WALL_HEIGHT)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.computeVertexNormals()
    return geom
  }, [bounds, shape])

  const surface = ROOF_SURFACE[material]

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial {...surface} side={THREE.DoubleSide} />
    </mesh>
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
    () => buildBuilding3D(state, exteriorWallIds),
    [state, exteriorWallIds],
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

  const wallSurface = WALL_SURFACE[options.wall]
  const frameSurface = FRAME_SURFACE[options.frame]

  return (
    <Canvas
      shadows
      camera={{
        // Far enough back that the whole massing plus its roof fits.
        position: [centre[0] + span * 1.5, span * 1.2, centre[2] + span * 1.9],
        fov: 45,
        near: 0.1,
        far: 500,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[sceneColors.background]} />

      {/* Enough light to read the form, without pretending to be a render. */}
      <hemisphereLight intensity={0.75} groundColor="#8a8a86" />
      <directionalLight
        position={[span, span * 1.6, span * 0.6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <Orbit target={centre} />

      {/* Ground and floor slab. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre[0], -0.01, centre[2]]} receiveShadow>
        <planeGeometry args={[span * 6, span * 6]} />
        <meshStandardMaterial color={sceneColors.gridMinor} roughness={1} />
      </mesh>

      {building.bounds && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre[0], 0.002, centre[2]]} receiveShadow>
          <planeGeometry
            args={[
              building.bounds.maxX - building.bounds.minX,
              building.bounds.maxZ - building.bounds.minZ,
            ]}
          />
          <meshStandardMaterial color="#CFCAC2" roughness={1} />
        </mesh>
      )}

      {building.walls.map((box) => (
        <mesh
          key={box.id}
          position={[box.x, box.y, box.z]}
          rotation={[0, -box.angle, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[box.length, box.height, box.thickness]} />
          <meshStandardMaterial {...wallSurface} />
        </mesh>
      ))}

      {building.panels.map((panel) => (
        <mesh
          key={panel.id}
          position={[panel.x, panel.y, panel.z]}
          rotation={[0, -panel.angle, 0]}
          castShadow
        >
          <boxGeometry args={[panel.length, panel.height, panel.thickness]} />
          {panel.kind === 'window' ? (
            <meshStandardMaterial
              color={GLASS_SURFACE.color}
              roughness={GLASS_SURFACE.roughness}
              metalness={GLASS_SURFACE.metalness}
              transparent
              opacity={GLASS_SURFACE.opacity}
            />
          ) : (
            <meshStandardMaterial {...frameSurface} />
          )}
        </mesh>
      ))}

      {building.bounds && (
        <Roof bounds={building.bounds} shape={options.roof} material={options.roofMaterial} />
      )}
    </Canvas>
  )
}
