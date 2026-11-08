import type * as THREE from 'three'
import type { OpeningUnit } from '../drawing/building3d'
import {
  DOOR_SURFACE,
  FRAME_SURFACE,
  GLASS_SURFACE,
  TRIM_SURFACE,
  type FrameMaterial,
} from '../drawing/materials'
import { useSolid } from './Surfaces'

/** Width of a frame member, and of the centre mullion. */
const MEMBER = 0.06
const MULLION = 0.045
/** A window wider than this gets a mullion, as a sliding unit would. */
const MULLION_OVER = 1.3

interface UnitMaterials {
  frame: THREE.Material
  glass: THREE.Material
  leaf: THREE.Material
  trim: THREE.Material
}

/**
 * A window built as a real unit — jambs, head, sill, a mullion and a pane —
 * rather than one translucent slab filling the hole. At any distance a
 * customer would actually look from, the frame is most of what says "window".
 */
function WindowUnit({ unit, mats }: { unit: OpeningUnit; mats: UnitMaterials }) {
  const { width, height, wallThickness } = unit
  const depth = wallThickness * 0.8
  const innerW = width - MEMBER * 2
  const innerH = height - MEMBER * 2

  return (
    <group position={[unit.x, unit.y, unit.z]} rotation={[0, -unit.angle, 0]}>
      {/* Jambs. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`jamb${side}`}
          position={[side * (width / 2 - MEMBER / 2), 0, 0]}
          material={mats.frame}
          castShadow
        >
          <boxGeometry args={[MEMBER, height, depth]} />
        </mesh>
      ))}

      {/* Head and sill. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rail${side}`}
          position={[0, side * (height / 2 - MEMBER / 2), 0]}
          material={mats.frame}
          castShadow
        >
          <boxGeometry args={[innerW, MEMBER, depth]} />
        </mesh>
      ))}

      {width > MULLION_OVER && (
        <mesh material={mats.frame} castShadow>
          <boxGeometry args={[MULLION, innerH, depth * 0.9]} />
        </mesh>
      )}

      {/* Glazing. */}
      <mesh material={mats.glass}>
        <boxGeometry args={[innerW, innerH, 0.018]} />
      </mesh>

      {/* The sill projects past the wall, and throws the shadow that makes a
          window read as set into the wall rather than printed on it. */}
      <mesh position={[0, -(height / 2) - 0.03, 0]} material={mats.trim} castShadow>
        <boxGeometry args={[width + 0.14, 0.06, wallThickness + 0.16]} />
      </mesh>
    </group>
  )
}

/** A door: frame, panelled leaf, lever and threshold. */
function DoorUnit({ unit, mats }: { unit: OpeningUnit; mats: UnitMaterials }) {
  const { width, height, wallThickness } = unit
  const depth = wallThickness * 0.8
  const leafW = width - MEMBER * 2 - 0.01
  const leafH = height - MEMBER - 0.01
  const leafThickness = 0.045
  const panelOffset = leafThickness / 2 + 0.007

  return (
    <group position={[unit.x, unit.y, unit.z]} rotation={[0, -unit.angle, 0]}>
      {[-1, 1].map((side) => (
        <mesh
          key={`jamb${side}`}
          position={[side * (width / 2 - MEMBER / 2), 0, 0]}
          material={mats.frame}
          castShadow
        >
          <boxGeometry args={[MEMBER, height, depth]} />
        </mesh>
      ))}

      <mesh position={[0, height / 2 - MEMBER / 2, 0]} material={mats.frame} castShadow>
        <boxGeometry args={[width - MEMBER * 2, MEMBER, depth]} />
      </mesh>

      {/* The leaf. */}
      <mesh position={[0, -MEMBER / 2, 0]} material={mats.leaf} castShadow>
        <boxGeometry args={[leafW, leafH, leafThickness]} />
      </mesh>

      {/* Two raised panels, on both faces so the door reads from inside too. */}
      {[-1, 1].map((face) =>
        [-1, 1].map((half) => (
          <mesh
            key={`panel${face}${half}`}
            position={[0, -MEMBER / 2 + half * leafH * 0.23, face * panelOffset]}
            material={mats.leaf}
          >
            <boxGeometry args={[leafW * 0.64, leafH * 0.33, 0.014]} />
          </mesh>
        )),
      )}

      {/* Lever, at about a metre off the floor on both faces. */}
      {[-1, 1].map((face) => (
        <mesh
          key={`lever${face}`}
          position={[leafW / 2 - 0.1, -0.05, face * (leafThickness / 2 + 0.03)]}
          material={mats.frame}
        >
          <boxGeometry args={[0.12, 0.028, 0.06]} />
        </mesh>
      ))}

      <mesh position={[0, -height / 2 + 0.015, 0]} material={mats.trim}>
        <boxGeometry args={[width, 0.03, wallThickness + 0.06]} />
      </mesh>
    </group>
  )
}

/**
 * Every window and door in the building. The four materials are built once
 * here and shared, rather than per unit.
 */
export function OpeningsView({
  units,
  frame,
}: {
  units: OpeningUnit[]
  frame: FrameMaterial
}) {
  const mats: UnitMaterials = {
    frame: useSolid(FRAME_SURFACE[frame]),
    leaf: useSolid(DOOR_SURFACE[frame]),
    trim: useSolid(TRIM_SURFACE),
    glass: useSolid(
      {
        color: GLASS_SURFACE.color,
        roughness: GLASS_SURFACE.roughness,
        metalness: GLASS_SURFACE.metalness,
      },
      {
        transparent: true,
        opacity: GLASS_SURFACE.opacity,
        // Glazing is mostly its reflection. A transparent material's
        // specular highlight is scaled by its alpha, so at this opacity the
        // sky barely registers without pushing the environment back up.
        envMapIntensity: 2.4,
      },
    ),
  }

  return (
    <>
      {units.map((unit) =>
        unit.kind === 'window' ? (
          <WindowUnit key={unit.id} unit={unit} mats={mats} />
        ) : (
          <DoorUnit key={unit.id} unit={unit} mats={mats} />
        ),
      )}
    </>
  )
}
