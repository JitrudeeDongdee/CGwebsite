import type {
  DrawFixture,
  DrawingState,
  DrawNode,
  DrawOpening,
  DrawRoomLabel,
  DrawWall,
} from './types'

/**
 * Portable plan-file format. This is the ONLY shape written to disk / read
 * from an upload — it wraps the internal `DrawingState` with a tag and a
 * version so old files can be migrated instead of silently misread. Keep in
 * step with `DrawingState` in `types.ts`.
 */
export const PLAN_FILE_FORMAT = 'cg-house-plan'
export const PLAN_FILE_VERSION = 1

export interface PlanFile {
  format: typeof PLAN_FILE_FORMAT
  version: number
  /** Human name shown on the gallery card. */
  name: string
  /** Footprint in metres, derived from the plan bounds. Card metadata only. */
  width?: number
  depth?: number
  state: DrawingState
}

/** Thrown by `parsePlanFile` when the input isn't a plan we can load. */
export class PlanFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanFileError'
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function num(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Overall width/depth of a plan from its node bounds (0 when empty). */
export function planBounds(state: DrawingState): { width: number; depth: number } {
  const nodes = Object.values(state.nodes)
  if (nodes.length === 0) return { width: 0, depth: 0 }
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...ys) - Math.min(...ys),
  }
}

export function serializePlan(state: DrawingState, name: string): PlanFile {
  const { width, depth } = planBounds(state)
  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    name,
    width: Math.round(width * 100) / 100,
    depth: Math.round(depth * 100) / 100,
    state,
  }
}

/** Pretty-printed JSON string ready to hand to a download. */
export function planFileToJson(state: DrawingState, name: string): string {
  return JSON.stringify(serializePlan(state, name), null, 2)
}

function validateNodes(raw: unknown): Record<string, DrawNode> {
  if (!isObject(raw)) throw new PlanFileError('nodes must be an object')
  const nodes: Record<string, DrawNode> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isObject(value) || !num(value.x) || !num(value.y)) {
      throw new PlanFileError(`node "${id}" is missing x/y`)
    }
    nodes[id] = { id, x: value.x, y: value.y }
  }
  return nodes
}

function validateWalls(raw: unknown, nodes: Record<string, DrawNode>): DrawWall[] {
  if (!Array.isArray(raw)) throw new PlanFileError('walls must be an array')
  return raw.map((value, i) => {
    if (!isObject(value) || typeof value.a !== 'string' || typeof value.b !== 'string') {
      throw new PlanFileError(`wall #${i} is missing a/b`)
    }
    if (!nodes[value.a] || !nodes[value.b]) {
      throw new PlanFileError(`wall #${i} points at a node that doesn't exist`)
    }
    const wall: DrawWall = {
      id: typeof value.id === 'string' ? value.id : `wall_${i}`,
      a: value.a,
      b: value.b,
    }
    if (num(value.thickness)) wall.thickness = value.thickness
    return wall
  })
}

// Openings / fixtures / labels are loaded leniently: a bad entry is dropped
// rather than failing the whole file, so a plan still opens if one item is
// malformed. Walls/nodes are the structural core and stay strict above.
function validateOpenings(raw: unknown): DrawOpening[] {
  if (raw == null) return []
  if (!Array.isArray(raw)) throw new PlanFileError('openings must be an array')
  const out: DrawOpening[] = []
  raw.forEach((value, i) => {
    if (
      isObject(value) &&
      typeof value.wallId === 'string' &&
      num(value.offset) &&
      num(value.width) &&
      (value.kind === 'door' || value.kind === 'window')
    ) {
      out.push({
        id: typeof value.id === 'string' ? value.id : `opening_${i}`,
        wallId: value.wallId,
        offset: value.offset,
        width: value.width,
        kind: value.kind,
      })
    }
  })
  return out
}

function validateFixtures(raw: unknown): DrawFixture[] {
  if (raw == null) return []
  if (!Array.isArray(raw)) throw new PlanFileError('fixtures must be an array')
  const out: DrawFixture[] = []
  raw.forEach((value, i) => {
    if (
      isObject(value) &&
      typeof value.kind === 'string' &&
      num(value.x) &&
      num(value.y) &&
      num(value.width) &&
      num(value.depth)
    ) {
      out.push({
        id: typeof value.id === 'string' ? value.id : `fixture_${i}`,
        kind: value.kind as DrawFixture['kind'],
        nodeId: typeof value.nodeId === 'string' ? value.nodeId : undefined,
        x: value.x,
        y: value.y,
        rotation: num(value.rotation) ? value.rotation : 0,
        width: value.width,
        depth: value.depth,
      })
    }
  })
  return out
}

function validateRoomLabels(raw: unknown): DrawRoomLabel[] {
  if (raw == null) return []
  if (!Array.isArray(raw)) throw new PlanFileError('roomLabels must be an array')
  const out: DrawRoomLabel[] = []
  raw.forEach((value, i) => {
    if (isObject(value) && num(value.x) && num(value.y) && typeof value.name === 'string') {
      out.push({
        id: typeof value.id === 'string' ? value.id : `label_${i}`,
        x: value.x,
        y: value.y,
        name: value.name,
      })
    }
  })
  return out
}

function validateState(raw: unknown): DrawingState {
  if (!isObject(raw)) throw new PlanFileError('plan has no drawing data')
  const nodes = validateNodes(raw.nodes)
  return {
    nodes,
    walls: validateWalls(raw.walls, nodes),
    openings: validateOpenings(raw.openings),
    fixtures: validateFixtures(raw.fixtures),
    roomLabels: validateRoomLabels(raw.roomLabels),
  }
}

/**
 * Parse and validate an uploaded / fetched plan. Accepts both a wrapped
 * `PlanFile` and a bare `DrawingState` (so a raw exported state still loads),
 * and always returns a normalized `PlanFile`. Throws `PlanFileError` with a
 * human-readable reason on anything it can't turn into a valid plan.
 */
export function parsePlanFile(raw: unknown, fallbackName = 'Plan'): PlanFile {
  if (!isObject(raw)) throw new PlanFileError('file is not a plan')

  // A wrapped plan file carries `state`; a bare export is the state itself.
  const stateSource = 'state' in raw ? raw.state : raw
  const state = validateState(stateSource)

  const { width, depth } = planBounds(state)
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName

  return {
    format: PLAN_FILE_FORMAT,
    version: num(raw.version) ? raw.version : PLAN_FILE_VERSION,
    name,
    width: num(raw.width) ? raw.width : Math.round(width * 100) / 100,
    depth: num(raw.depth) ? raw.depth : Math.round(depth * 100) / 100,
    state,
  }
}

/** Parse a JSON string into a plan, mapping JSON errors to `PlanFileError`. */
export function parsePlanJson(text: string, fallbackName = 'Plan'): PlanFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new PlanFileError('file is not valid JSON')
  }
  return parsePlanFile(raw, fallbackName)
}
