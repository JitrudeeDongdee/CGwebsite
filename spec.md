# CGwebsite — house-design plan drawing engine spike

## Architecture
- Vite + React 19 + react-three-fiber (three.js) SPA, TypeScript, oxlint.
- Package manager: **pnpm** (pinned via `packageManager` field, `pnpm-lock.yaml` committed). npm/yarn lockfiles must not be reintroduced.
- UI chrome (toolbars/panels/forms around the r3f canvas) is required to use **MUI (Material-UI) with a custom theme** — not unstyled/ad-hoc DOM, not another component library. Not installed yet; see Todo. Theme tokens (palette, typography, spacing overrides) are not yet decided — do not invent values, confirm with the user before defining the theme.

## Product requirements (stated by user, apply from Phase 1)
These are confirmed requirements, not suggestions. None are implemented yet.
- **Bilingual (2 languages).** Which two, and the default, are not yet confirmed — Thai is certain (all current UI copy is Thai); the second is presumed English but **must be confirmed before building the i18n layer**. All user-facing strings must go through the i18n layer from the start rather than being hardcoded and retrofitted later.
- **Dark/light theme following the browser/OS preference** (`prefers-color-scheme`), not a hardcoded palette. Currently the app is hardcoded dark (`index.css`, plus three.js material/grid colors in `scene/`) — note the canvas colors are *not* CSS and must be themed separately from the MUI/DOM side.
- **2D view must look like a real architectural floor plan** — conventional plan drafting look (proper wall thickness/poché, dimension lines with measurements, standard line weights), not the current debug-style thin lines and dots.
- **3D view must stay simple and structural** — readable massing that makes the structure obvious and stays easy to edit; explicitly not a photoreal render. 3D does not exist yet (spike is 2D top-down only).
- `src/drawing/` — pure state/geometry, no React or three.js:
  - `types.ts` — `Point`, `DrawNode`, `DrawWall`, `DrawingState` (`nodes: Record<id, DrawNode>`, `walls: DrawWall[]`), `SnapTarget`.
  - `geometry.ts` — grid snap (`GRID_SIZE=0.5`), node/wall-midpoint snap search (`SNAP_THRESHOLD=0.35`), `polygonArea` (shoelace), `findClosedLoop` (DFS back-edge single-cycle detection — single-room only, multi-room face detection is explicitly out of scope for the spike).
  - `state.ts` — `commitWall` (resolves each endpoint to an existing node, a new node split off a wall midpoint, or a fresh grid-snapped node), `moveNode`.
  - `useDrawingState.ts` — React hook wrapping the above, exposes `roomArea` (via `findClosedLoop` + `polygonArea`).
- `src/scene/` — react-three-fiber view layer:
  - `DrawingCanvas.tsx` — top-down orthographic `Canvas`, wires `useInteraction` + `useDrawingState` to the scene.
  - `GroundPlane.tsx` — invisible mesh that turns three.js pointer events into normalized `Point`s and drives `onDown/onMove/onUp`; uses `setPointerCapture` on the native event target.
  - `useInteraction.ts` — single entry point for pointer input: decides node-drag vs new-wall-draft, tracks in-progress drag.
  - `CameraControls.tsx` — two-finger pinch/pan via three's `OrbitControls`, rotate disabled (locked top-down). `enabled` is toggled **imperatively via a ref** (not a React prop) — a native `pointerdown` reaches OrbitControls' own listener before a React re-render can apply a new `enabled` prop, so prop-driven gating let the first drag of a gesture slip through and skew the camera mid-draw.
  - `NodesView.tsx`, `WallsView.tsx`, `DraftWallView.tsx` — render nodes/walls/in-progress draft wall.

## Data Contracts
- `DrawingState = { nodes: Record<string, DrawNode>, walls: DrawWall[] }` — internal state shape shared between `drawing/` and `scene/`. Do not change without checking every consumer (`useDrawingState`, all `scene/*View.tsx`).
- `useInteraction(state, addWall, updateNodePosition)` → `{ draft, isInteracting, onDown, onMove, onUp }` — the interaction hook's public surface; `scene/GroundPlane.tsx` and `DrawingCanvas.tsx` both depend on this exact shape.
- Pointer input into `useInteraction` is a normalized `Point` (`{x, y}` in world/grid units, not screen pixels) — produced by `GroundPlane.tsx`'s raycast, consumed identically for mouse and touch (single code path, no per-input-type branching).

## Done
- Wall drawing: click/drag to draft a wall, snapping to existing nodes or wall midpoints (splits the wall), otherwise snaps to the 0.5-unit grid.
- Node dragging: move an existing node (re-snaps to grid), connected walls follow — verified live in-browser (dragging a shared corner moves both attached walls with it).
- Room area: `findClosedLoop` + shoelace `polygonArea` verified correct via a standalone unit check (rectangle → exact area 12, triangle → exact area 6, open path → correctly returns no loop). The pure logic is confirmed correct; reaching a closed loop through the UI has an open question, see "Needs a decision" below.
- Snap-merge verified live in-browser: dragging a new wall's end near an existing corner joins it at a single shared node (clean L-corner, no duplicate/overlapping node).
- Mouse interaction fully working, including the pointer-race fixes below. Touch: pointer path is unified in `useInteraction`/`GroundPlane` (same `Point` in, same handlers, R3F's native Pointer Events already unify mouse/touch), but real touch-device testing has not been done — see "Not yet verified".
- Package manager switched from npm to pnpm 2026-07-25: `package-lock.json` removed, `pnpm-lock.yaml` generated, `packageManager` field pinned in `package.json`, `pnpm run build`/`pnpm run dev` verified working.
- Project-level `spec.md` / `MEMORY.md` / `CLAUDE.md` set up per the user's global CLAUDE.md rules.
- Four real bugs found and fixed this session (root cause + fix in each case; reusable lessons in `MEMORY.md`):
  1. Leftover Vite-template CSS offset `#root` from `(0,0)`, corrupting all pointer coordinate math — replaced `index.css` with a plain full-bleed reset.
  2. `e.target` on an R3F `ThreeEvent` isn't the DOM canvas — `setPointerCapture` was silently failing; fixed to use `e.nativeEvent.target`.
  3. OrbitControls vs. React-state race: gating `orbitControls.enabled` through a React prop lost the race against OrbitControls' own native pointerdown listener on the first event of a gesture, letting the camera drift mid-drag. Fixed by toggling `controlsRef.current.enabled` imperatively in the same synchronous handler.
  4. Same race inside `useInteraction`: `draggingNodeId` in `useState` could be read stale by a fast pointermove/up, silently dropping the gesture. Fixed by moving the authoritative mode into a `useRef` (`modeRef`).
- All four fixes committed to `spike/drawing-engine` and pushed.

## Needs a decision (not yet resolved)
**Closing a wall loop isn't currently reachable via drag**, which matters because the whole room-area feature depends on it. Current model: press-and-drag starting *on* an existing node moves it; starting on empty grid draws a new wall (snapping either endpoint into existing geometry on release). A new wall's far end can always snap onto existing geometry, but its *start* never can — starting exactly on an existing corner always means "move it," never "extend a new wall from it." Any closed polygon's last edge needs both ends to already exist, and there's no gesture for that today.

Two options:
- **(A, recommended)** Press-and-drag from an existing node draws a new wall from it (standard convention, e.g. SketchUp); give node-repositioning a distinct gesture (e.g. long-press-then-drag). Unblocks closing a room.
- **(B)** Keep current behavior, add an explicit "connect" affordance instead (e.g. a second tap on a node while a wall is mid-draw).

Flag to user before implementing either — changes the core interaction model.

## Todo / Out of scope
- Install MUI (`@mui/material` + `@emotion/react`/`@emotion/styled`) and build a custom `ThemeProvider` — required for all UI chrome per Architecture. Not started: no MUI dependency in `package.json` yet, no theme file exists. Deliberately deferred for the spike itself (spike brief explicitly says skip any design system for this phase); applies starting Phase 1.
- Verify touch input on an actual physical touch device (drag-to-draw, node drag, pinch-zoom via OrbitControls, hit-area size, gesture separation, Safari/Chrome double-tap-zoom suppression) — the spike plan is explicit this must be a real device, not a resized desktop browser. Not done yet.
- Resolve the closing-loop interaction question above before further building on top of this interaction model.
- Multi-room / multi-face area detection — explicitly out of scope per `geometry.ts` comment (single closed loop only).
- No tests exist yet (no test runner configured); verification so far is manual + one throwaway standalone script for the geometry math.

## Current state
Mid-spike, on branch `spike/drawing-engine`, pushed to `origin/spike/drawing-engine`
(PR link: https://github.com/JitrudeeDongdee/CGwebsite/pull/new/spike/drawing-engine).
`main` intentionally still only has the initial README commit — no direct pushes to
`main` beyond that one bootstrap commit, per the no-direct-push-to-shared-branch rule.
Draw + snap + connected-move + area-calc core is implemented, bug-fixed, and verified
working on desktop mouse. Package manager is pnpm. Next concrete steps: (1) decide the
closing-loop interaction question above, (2) real physical-device touch testing per the
spike plan's own mobile checklist, (3) MUI setup whenever Phase 1 UI chrome starts.
