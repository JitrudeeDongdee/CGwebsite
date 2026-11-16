/**
 * Camera moves the buttons can ask for, and the spherical maths behind them.
 *
 * Deliberately free of any three.js import: the buttons live in `src/ui/` and
 * are rendered by the 2D editor's page, so pulling three in here would drag
 * the whole 240 kB chunk into a view that does not render anything in 3D.
 * `Orbit` is the only thing that turns these numbers into a camera position.
 *
 * Angles are the plain ones, not three's: **azimuth** turns around +Y with 0
 * looking from +Z, and **elevation** is degrees ABOVE the horizon. three's
 * polar angle counts down from +Y instead, so `polar = 90 - elevation` — the
 * one conversion, kept in `positionFor` so nowhere else has to remember it.
 */

/** A named place to jump to, as opposed to a nudge from where you are. */
export type CameraView = 'home' | 'top'

/** What a button asks for, before the page stamps it with a sequence number. */
export type CameraRequest =
  | { kind: 'zoom'; factor: number }
  | { kind: 'turn'; degrees: number }
  | { kind: 'tilt'; degrees: number }
  | { kind: 'view'; view: CameraView }

/**
 * One request from the buttons, stamped so it can be told from the last one.
 *
 * `seq` is what makes pressing the same button twice do something twice: the
 * effect that reads this compares sequence numbers, so an identical object is
 * still a new instruction.
 *
 * ⚠️ An INTERSECTION with `CameraRequest`, not `Omit<CameraMove, 'seq'>` the
 * other way round. `Omit` over a union keeps only the keys every member
 * shares, so the omitted type would have lost `factor`, `degrees` and `view`
 * and accepted none of them.
 */
export type CameraMove = CameraRequest & { seq: number }

/** One press of zoom in / zoom out. */
export const ZOOM_STEP = 1.3
/** One press of turn left / turn right. An eighth of a circle reads as a step
 *  rather than a jump, and eight of them bring you back where you started. */
export const TURN_STEP = 45
/** One press of tilt. */
export const TILT_STEP = 12

/**
 * How close and how far the camera may get, as multiples of the plan's span.
 *
 * The near limit stops a press from putting the camera inside the house with
 * no way to tell what you are looking at; the far one stops the house
 * shrinking to a dot that takes six presses to come back from.
 */
export const MIN_RADIUS = 0.5
export const MAX_RADIUS = 4.5

/**
 * Elevation is clamped well short of straight down.
 *
 * At 90° the view direction is parallel to the camera's up vector and the
 * azimuth becomes meaningless — OrbitControls gimbal-locks and the house
 * spins when you next turn. 85° is close enough to read as a roof plan.
 * The low end stays above the ground plane, which the camera must not go
 * under: from below, the house is a floor slab and nothing else.
 */
export const MIN_ELEVATION = 4
export const MAX_ELEVATION = 85

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** Azimuth / elevation / radius of a point as seen from `target`. */
export function sphericalOf(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
): { azimuth: number; elevation: number; radius: number } {
  const x = position[0] - target[0]
  const y = position[1] - target[1]
  const z = position[2] - target[2]
  const radius = Math.hypot(x, y, z)
  if (radius < 1e-6) return { azimuth: 0, elevation: 0, radius: 0 }
  return {
    // atan2(x, z) rather than (z, x): azimuth 0 must look from +Z.
    azimuth: (Math.atan2(x, z) * 180) / Math.PI,
    elevation: (Math.asin(y / radius) * 180) / Math.PI,
    radius,
  }
}

/** The inverse: a world position from the angles. */
export function positionFor(
  target: readonly [number, number, number],
  azimuth: number,
  elevation: number,
  radius: number,
): [number, number, number] {
  const polar = ((90 - elevation) * Math.PI) / 180
  const theta = (azimuth * Math.PI) / 180
  const flat = Math.sin(polar) * radius
  return [
    target[0] + flat * Math.sin(theta),
    target[1] + Math.cos(polar) * radius,
    target[2] + flat * Math.cos(theta),
  ]
}

/**
 * Work out where a move wants the camera, given where it is now.
 *
 * Pure, so the whole set of buttons can be checked without a renderer — and
 * every clamp is applied here rather than in the component, so a press that
 * would go out of range quietly stops at the limit instead of being ignored.
 */
export function resolveMove(
  move: CameraMove,
  from: readonly [number, number, number],
  target: readonly [number, number, number],
  span: number,
  /** The view's own default camera position, used verbatim by `home`. */
  home: readonly [number, number, number],
): [number, number, number] {
  const now = sphericalOf(from, target)
  const near = span * MIN_RADIUS
  const far = span * MAX_RADIUS

  switch (move.kind) {
    case 'zoom':
      return positionFor(
        target,
        now.azimuth,
        now.elevation,
        clamp(now.radius * move.factor, near, far),
      )
    case 'turn':
      return positionFor(target, now.azimuth + move.degrees, now.elevation, now.radius)
    case 'tilt':
      return positionFor(
        target,
        now.azimuth,
        clamp(now.elevation + move.degrees, MIN_ELEVATION, MAX_ELEVATION),
        now.radius,
      )
    case 'view':
      // ⚠️ `home` returns the default position ITSELF, not angles that
      // approximate it. Its elevation depends on the eaves-to-span ratio, so
      // any fixed pair of angles is right for one house and wrong for the
      // next — on the 12 m cabin a nominal 15° is really 11.3°. This is the
      // way back from any amount of turning AND zooming, so it has to land
      // exactly where the view opened.
      if (move.view === 'home') return [home[0], home[1], home[2]]
      // Straight down from where you are standing: keeping the azimuth means
      // the roof plan is in the same orientation as the view you left.
      return positionFor(target, now.azimuth, MAX_ELEVATION, clamp(now.radius, near, far))
  }
}
