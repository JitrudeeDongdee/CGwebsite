import type {
  DrawBalcony,
  DrawFixture,
  DrawingState,
  DrawNode,
  DrawOpening,
  DrawWall,
  DrawWallPanel,
  DrawRoomLabel,
  FixtureKind,
  OpeningKind,
  Point,
  WallFinish,
} from './types'
import { fixtureSpec } from './fixtures'
import {
  MAX_BALCONY_PROJECTION,
  MIN_BALCONY_PROJECTION,
  MIN_BALCONY_WIDTH,
  placeBalconies,
  resolveBalcony,
} from './balconies'
import { GRID_SIZE, distance, findSnapTarget, snapToGrid } from './geometry'

export function createInitialState(): DrawingState {
  return {
    nodes: {},
    walls: [],
    openings: [],
    fixtures: [],
    roomLabels: [],
    panels: [],
    balconies: [],
  }
}

function nextId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

/**
 * Resolves a raw draw-endpoint into a node id: reuse an existing node/wall
 * joint if the point snaps to one (splitting the wall for a midpoint snap),
 * otherwise create a fresh node on the grid.
 */
function resolveEndpoint(
  state: DrawingState,
  point: Point,
  excludeNodeId?: string,
): { state: DrawingState; nodeId: string } {
  const snap = findSnapTarget(state, point, undefined, excludeNodeId)

  if (snap?.type === 'node') {
    return { state, nodeId: snap.nodeId }
  }

  if (snap?.type === 'wallMidpoint') {
    const wall = state.walls.find((w) => w.id === snap.wallId)!
    const newNode: DrawNode = { id: nextId('node'), ...snap.point }
    const firstHalf: DrawWall = { id: nextId('wall'), a: wall.a, b: newNode.id }
    const secondHalf: DrawWall = { id: nextId('wall'), a: newNode.id, b: wall.b }

    const walls = state.walls.filter((w) => w.id !== wall.id).concat(firstHalf, secondHalf)

    // The wall this opening sat on no longer exists, so hand each opening to
    // whichever half now contains it. One straddling the cut can't belong to
    // either and is dropped.
    const splitAt = distance(state.nodes[wall.a], snap.point)
    const openings = state.openings.flatMap((opening) => {
      if (opening.wallId !== wall.id) return [opening]
      if (opening.offset + opening.width / 2 <= splitAt) {
        return [{ ...opening, wallId: firstHalf.id }]
      }
      if (opening.offset - opening.width / 2 >= splitAt) {
        return [{ ...opening, wallId: secondHalf.id, offset: opening.offset - splitAt }]
      }
      return []
    })

    return {
      state: { ...state, nodes: { ...state.nodes, [newNode.id]: newNode }, walls, openings },
      nodeId: newNode.id,
    }
  }

  const grid = snapToGrid(point)
  const newNode: DrawNode = { id: nextId('node'), ...grid }
  return {
    state: { ...state, nodes: { ...state.nodes, [newNode.id]: newNode } },
    nodeId: newNode.id,
  }
}

/**
 * Keeps one structural column on every wall junction: adds them for new
 * corners, drops them when a corner goes away, and moves the rest to follow
 * their corner. Free-standing columns the user placed by hand have no
 * nodeId and are left alone.
 */
function syncStructuralColumns(state: DrawingState): DrawingState {
  const spec = fixtureSpec('column')
  const bound = new Map<string, DrawFixture>()
  const loose: DrawFixture[] = []

  for (const fixture of state.fixtures) {
    if (fixture.nodeId) bound.set(fixture.nodeId, fixture)
    else loose.push(fixture)
  }

  const columns: DrawFixture[] = []
  for (const node of Object.values(state.nodes)) {
    const existing = bound.get(node.id)
    columns.push(
      existing
        ? { ...existing, x: node.x, y: node.y }
        : {
            id: nextId('fixture'),
            kind: 'column',
            nodeId: node.id,
            x: node.x,
            y: node.y,
            rotation: 0,
            width: spec.width,
            depth: spec.depth,
          },
    )
  }

  return { ...state, fixtures: [...columns, ...loose] }
}

/**
 * Drops anything bound to a wall that has gone away — openings, cladding
 * bands and balconies alike. A balcony whose wall was deleted would otherwise
 * be left hanging in the air with nothing holding it up.
 */
function pruneOpenings(state: DrawingState): DrawingState {
  const wallIds = new Set(state.walls.map((wall) => wall.id))
  const openings = state.openings.filter((opening) => wallIds.has(opening.wallId))
  const panels = (state.panels ?? []).filter((panel) => wallIds.has(panel.wallId))
  const balconies = (state.balconies ?? []).filter((one) => wallIds.has(one.wallId))
  if (
    openings.length === state.openings.length &&
    panels.length === (state.panels ?? []).length &&
    balconies.length === (state.balconies ?? []).length
  ) {
    return state
  }
  return { ...state, openings, panels, balconies }
}

export function commitWall(
  state: DrawingState,
  start: Point,
  end: Point,
  /** Explicit wall thickness (from the chosen wall type); omit for auto. */
  thickness?: number,
): DrawingState {
  const startResolved = resolveEndpoint(state, start)
  const endResolved = resolveEndpoint(startResolved.state, end, startResolved.nodeId)

  if (startResolved.nodeId === endResolved.nodeId) {
    return endResolved.state
  }

  const wall: DrawWall = {
    id: nextId('wall'),
    a: startResolved.nodeId,
    b: endResolved.nodeId,
    ...(thickness !== undefined ? { thickness } : {}),
  }
  return syncStructuralColumns({
    ...endResolved.state,
    walls: [...endResolved.state.walls, wall],
  })
}

export function moveNode(state: DrawingState, nodeId: string, point: Point): DrawingState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const snapped = snapToGrid(point)
  return syncStructuralColumns({
    ...state,
    nodes: { ...state.nodes, [nodeId]: { ...node, x: snapped.x, y: snapped.y } },
  })
}

/**
 * Finalizes a node drag: if the release point lands on another existing
 * node, merges into it (every wall pointing at the dragged node is
 * re-pointed at the target, and the dragged node is dropped) instead of
 * leaving two nodes overlapping but disconnected. That merge is what lets
 * dragging one corner onto another actually close a wall loop.
 */
export function finishNodeMove(state: DrawingState, nodeId: string, point: Point): DrawingState {
  const moved = moveNode(state, nodeId, point)
  const target = findSnapTarget(moved, point, undefined, nodeId)

  if (target?.type !== 'node') {
    return moved
  }

  const targetId = target.nodeId
  const { [nodeId]: _removed, ...remainingNodes } = moved.nodes
  const walls = moved.walls
    .map((wall) => ({
      ...wall,
      a: wall.a === nodeId ? targetId : wall.a,
      b: wall.b === nodeId ? targetId : wall.b,
    }))
    .filter((wall) => wall.a !== wall.b)

  return syncStructuralColumns(pruneOpenings({ ...moved, nodes: remainingNodes, walls }))
}

/**
 * Drops nodes no wall references any more. Without this, deleting walls
 * leaves invisible-but-real points behind that still attract snapping and
 * still count as geometry.
 */
function dropOrphanNodes(state: DrawingState): DrawingState {
  const used = new Set<string>()
  for (const wall of state.walls) {
    used.add(wall.a)
    used.add(wall.b)
  }

  const nodes: Record<string, DrawNode> = {}
  for (const [id, node] of Object.entries(state.nodes)) {
    if (used.has(id)) nodes[id] = node
  }
  return syncStructuralColumns(pruneOpenings({ ...state, nodes }))
}

export function deleteWall(state: DrawingState, wallId: string): DrawingState {
  return dropOrphanNodes({
    ...state,
    walls: state.walls.filter((wall) => wall.id !== wallId),
  })
}

/** Removes a node along with every wall attached to it. */
export function deleteNode(state: DrawingState, nodeId: string): DrawingState {
  return dropOrphanNodes({
    ...state,
    walls: state.walls.filter((wall) => wall.a !== nodeId && wall.b !== nodeId),
  })
}

/**
 * Copies a wall offset by one grid step, as its own pair of fresh nodes so
 * the copy is independent of the original rather than sharing its corners.
 */
export function duplicateWall(state: DrawingState, wallId: string): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const offset = GRID_SIZE
  const newA: DrawNode = { id: nextId('node'), x: a.x + offset, y: a.y + offset }
  const newB: DrawNode = { id: nextId('node'), x: b.x + offset, y: b.y + offset }

  return {
    ...state,
    nodes: { ...state.nodes, [newA.id]: newA, [newB.id]: newB },
    walls: [...state.walls, { id: nextId('wall'), a: newA.id, b: newB.id }],
  }
}

/**
 * Places a door or window on the wall nearest `point`, centred where the
 * user clicked and clamped so it can't hang off either end.
 */
export function addOpening(
  state: DrawingState,
  wallId: string,
  offsetAlongWall: number,
  width: number,
  kind: OpeningKind,
  flags?: { tall?: boolean; sliding?: boolean; fullWall?: boolean; open?: boolean },
): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const wallLength = distance(a, b)
  // Leave the opening fully within the wall; too short a wall can't take it.
  if (wallLength <= width) return state

  const half = width / 2
  const offset = Math.min(Math.max(offsetAlongWall, half), wallLength - half)

  const opening: DrawOpening = {
    id: nextId('opening'),
    wallId,
    offset,
    width,
    kind,
    // Only the flags that are set are stored, so a plain door stays the
    // three fields it has always been in a saved plan.
    ...(flags?.tall ? { tall: true } : {}),
    ...(flags?.sliding ? { sliding: true } : {}),
    ...(flags?.fullWall ? { fullWall: true } : {}),
    ...(flags?.open ? { open: true } : {}),
  }
  return { ...state, openings: [...state.openings, opening] }
}

export function deleteOpening(state: DrawingState, openingId: string): DrawingState {
  return { ...state, openings: state.openings.filter((o) => o.id !== openingId) }
}


/**
 * Pull the floor out from a wall into a balcony.
 *
 * Shaped on `addOpening` — the offset is clamped so the slab sits fully on
 * its host wall — but a wall shorter than the balcony is NOT refused the way
 * it is for a door: the width is narrowed to the wall instead, because a
 * balcony is pulled out of whatever wall you clicked and being silently given
 * nothing reads as a broken tool.
 */
export function addBalcony(
  state: DrawingState,
  wallId: string,
  offsetAlongWall: number,
  width: number,
  projection: number,
  railing?: string,
): DrawingState {
  const wall = state.walls.find((one) => one.id === wallId)
  if (!wall) return state
  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const wallLength = distance(a, b)
  if (wallLength < MIN_BALCONY_WIDTH) return state

  const clearWidth = Math.max(MIN_BALCONY_WIDTH, Math.min(width, wallLength))
  const half = clearWidth / 2
  const balcony: DrawBalcony = {
    id: nextId('balcony'),
    wallId,
    offset: Math.min(Math.max(offsetAlongWall, half), wallLength - half),
    width: clearWidth,
    projection: Math.max(
      MIN_BALCONY_PROJECTION,
      Math.min(MAX_BALCONY_PROJECTION, projection),
    ),
    ...(railing ? { railing } : {}),
  }
  return { ...state, balconies: [...(state.balconies ?? []), balcony] }
}

export function deleteBalcony(state: DrawingState, balconyId: string): DrawingState {
  return {
    ...state,
    balconies: (state.balconies ?? []).filter((one) => one.id !== balconyId),
  }
}

/**
 * The drag that gives the tool its name: pulling the slab OUT deepens it,
 * sliding it sideways moves it along the wall.
 *
 * One gesture for both, because in the balcony's own frame they are simply
 * the two components of the same drag — and because asking someone to find a
 * particular edge handle on a 1 m slab is worse than letting them push it
 * the way they want it to go.
 */
export function moveBalconyBy(
  state: DrawingState,
  balconyId: string,
  delta: Point,
): DrawingState {
  const placed = placeBalconies(state).find((one) => one.balcony.id === balconyId)
  if (!placed) return state

  const along = delta.x * placed.direction.x + delta.y * placed.direction.y
  const out = delta.x * placed.outward.x + delta.y * placed.outward.y

  return {
    ...state,
    balconies: (state.balconies ?? []).map((one) =>
      one.id === balconyId
        ? {
            ...one,
            offset: one.offset + along,
            projection: Math.max(
              MIN_BALCONY_PROJECTION,
              Math.min(MAX_BALCONY_PROJECTION, one.projection + out),
            ),
          }
        : one,
    ),
  }
}

/**
 * Tidies a finished balcony drag: the projection lands on a round 10 cm and
 * the offset is pulled back onto its wall. Stored rather than only resolved,
 * so what is saved is what was drawn.
 */
export function finishBalconyMove(state: DrawingState, balconyId: string): DrawingState {
  const wallLengths = new Map<string, number>()
  for (const wall of state.walls) {
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (a && b) wallLengths.set(wall.id, distance(a, b))
  }

  return {
    ...state,
    balconies: (state.balconies ?? []).map((one) => {
      const length = wallLengths.get(one.wallId)
      if (length === undefined) return one
      const resolved = resolveBalcony(
        { ...one, projection: Math.round(one.projection * 10) / 10 },
        length,
      )
      return one.id === balconyId ? { ...one, ...resolved } : one
    }),
  }
}

/** Swaps what stands round one balcony's open edges. */
export function setBalconyRailing(
  state: DrawingState,
  balconyId: string,
  railing: string,
): DrawingState {
  return {
    ...state,
    balconies: (state.balconies ?? []).map((one) =>
      one.id === balconyId ? { ...one, railing } : one,
    ),
  }
}

/** Replaces the whole plan, e.g. when loading a starter template. */
/**
 * Paints one wall. A patch, not a replacement, so brushing the outside does
 * not wipe the colour someone chose for the room behind it.
 */
export function setWallFinish(
  state: DrawingState,
  wallId: string,
  patch: WallFinish,
): DrawingState {
  return {
    ...state,
    walls: state.walls.map((wall) =>
      wall.id === wallId ? { ...wall, finish: { ...wall.finish, ...patch } } : wall,
    ),
  }
}

/**
 * Put a band of different cladding on part of a wall.
 *
 * Shaped on `addOpening`, including its clamp: the band is pulled fully
 * inside the wall, and a wall too short to hold it is left alone rather than
 * given a panel hanging off its end.
 */
export function addWallPanel(
  state: DrawingState,
  wallId: string,
  offsetAlongWall: number,
  width: number,
  finish: WallFinish,
): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state
  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const wallLength = distance(a, b)
  if (wallLength <= width) return state
  const half = width / 2
  const offset = Math.min(Math.max(offsetAlongWall, half), wallLength - half)

  return {
    ...state,
    panels: [
      ...(state.panels ?? []),
      { id: nextId('panel'), wallId, offset, width, finish },
    ],
  }
}

/**
 * The panel covering a point on a wall, if there is one.
 *
 * Used to make the panel brush a toggle: clicking bare wall adds a band and
 * clicking an existing one takes it away, so removing a panel needs no second
 * tool and no selection.
 */
export function findWallPanelAt(
  state: DrawingState,
  wallId: string,
  offsetAlongWall: number,
): DrawWallPanel | null {
  return (
    (state.panels ?? []).find(
      (panel) =>
        panel.wallId === wallId &&
        offsetAlongWall >= panel.offset - panel.width / 2 &&
        offsetAlongWall <= panel.offset + panel.width / 2,
    ) ?? null
  )
}

export function deleteWallPanel(state: DrawingState, panelId: string): DrawingState {
  return { ...state, panels: (state.panels ?? []).filter((panel) => panel.id !== panelId) }
}

/** Takes every wall back to the house default. */
export function clearWallFinishes(state: DrawingState): DrawingState {
  return {
    ...state,
    walls: state.walls.map(({ finish: _dropped, ...wall }) => wall),
    // The bands go with the brushwork: "back to default" that left a row of
    // timber panels standing would not be back to default.
    panels: [],
  }
}

export function loadPlan(plan: DrawingState): DrawingState {
  return syncStructuralColumns({
    nodes: { ...plan.nodes },
    walls: [...plan.walls],
    openings: [...plan.openings],
    fixtures: [...plan.fixtures],
    roomLabels: [...plan.roomLabels],
    // ⚠️ Rebuilt field by field, so anything added to DrawingState has to be
    // listed here too or loading a plan silently drops it.
    panels: [...(plan.panels ?? [])],
    balconies: [...(plan.balconies ?? [])],
  })
}

/**
 * Slides a whole wall, carrying both its corners.
 *
 * The drag is projected onto the wall's own normal, so the wall only ever
 * moves sideways. That's what keeps the plan square: a shared corner then
 * travels *along* the perpendicular wall attached to it, lengthening or
 * shortening that wall without changing its angle. Allowing the raw drag
 * through instead drags those neighbours off-axis and skews the whole
 * outline into diagonals.
 */
export function moveWall(state: DrawingState, wallId: string, delta: Point): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const length = distance(a, b)
  if (length === 0) return state

  const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length }
  const alongNormal = delta.x * normal.x + delta.y * normal.y
  const constrained = { x: normal.x * alongNormal, y: normal.y * alongNormal }

  const nodes = { ...state.nodes }
  for (const nodeId of [wall.a, wall.b]) {
    const node = nodes[nodeId]
    if (!node) continue
    nodes[nodeId] = { ...node, x: node.x + constrained.x, y: node.y + constrained.y }
  }
  return syncStructuralColumns({ ...state, nodes })
}

/** Re-snaps a dragged wall's corners to the grid once the drag ends. */
export function finishWallMove(state: DrawingState, wallId: string): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const nodes = { ...state.nodes }
  for (const nodeId of [wall.a, wall.b]) {
    const node = nodes[nodeId]
    if (!node) continue
    const snapped = snapToGrid(node)
    nodes[nodeId] = { ...node, x: snapped.x, y: snapped.y }
  }
  return syncStructuralColumns({ ...state, nodes })
}

/** Names the room containing `point`, replacing any label already in it. */
export function setRoomLabel(
  state: DrawingState,
  point: Point,
  name: string,
  existingId?: string,
): DrawingState {
  const trimmed = name.trim()

  if (existingId) {
    if (!trimmed) {
      return { ...state, roomLabels: state.roomLabels.filter((l) => l.id !== existingId) }
    }
    return {
      ...state,
      roomLabels: state.roomLabels.map((label) =>
        label.id === existingId ? { ...label, name: trimmed } : label,
      ),
    }
  }

  if (!trimmed) return state

  const label: DrawRoomLabel = { id: nextId('label'), x: point.x, y: point.y, name: trimmed }
  return { ...state, roomLabels: [...state.roomLabels, label] }
}

export function addFixture(state: DrawingState, kind: FixtureKind, point: Point): DrawingState {
  const spec = fixtureSpec(kind)
  const fixture: DrawFixture = {
    id: nextId('fixture'),
    kind,
    x: point.x,
    y: point.y,
    rotation: 0,
    width: spec.width,
    depth: spec.depth,
  }
  return { ...state, fixtures: [...state.fixtures, fixture] }
}

export function moveFixture(state: DrawingState, fixtureId: string, point: Point): DrawingState {
  return {
    ...state,
    fixtures: state.fixtures.map((fixture) =>
      fixture.id === fixtureId ? { ...fixture, x: point.x, y: point.y } : fixture,
    ),
  }
}

/** Quarter turns keep furniture aligned to the walls it sits against. */
export function rotateFixture(state: DrawingState, fixtureId: string): DrawingState {
  return {
    ...state,
    fixtures: state.fixtures.map((fixture) =>
      fixture.id === fixtureId
        ? { ...fixture, rotation: (fixture.rotation + Math.PI / 2) % (Math.PI * 2) }
        : fixture,
    ),
  }
}

export function deleteFixture(state: DrawingState, fixtureId: string): DrawingState {
  return { ...state, fixtures: state.fixtures.filter((f) => f.id !== fixtureId) }
}
