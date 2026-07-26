# CGwebsite — MEMORY

Project-specific failure log. Every entry: what happened / root cause / correct behavior.
See the LEARNING CAPTURE rule in the global CLAUDE.md — log here, not to global memory.

## Leftover template CSS broke all pointer math

**What happened**: every drag on the drawing canvas produced walls offset from where the
user actually dragged, by a constant amount.

**Root cause**: the Vite react-ts template's `index.css` still had `#root { width: 1126px;
margin: 0 auto; border-inline: 1px solid ...; }` from the default landing-page demo. That
offsets the canvas from the viewport's `(0,0)`, and all pointer-to-world coordinate math
assumed the canvas started at `(0,0)`.

**Correct behavior**: when replacing a scaffolded template's default page (`App.tsx`) with
your own full-bleed canvas app, also check `index.css`/global styles for template leftovers
— don't assume only the component file needs replacing. `getBoundingClientRect()` on the
canvas is the fast way to confirm `{left: 0, top: 0}` before debugging anything downstream.

## `e.target` on an R3F `ThreeEvent` is not the DOM element

**What happened**: `(e.target as Element).setPointerCapture(...)` inside an R3F
`onPointerDown` handler silently did nothing — the whole gesture died with no console error.

**Root cause**: React Three Fiber's synthetic pointer event doesn't guarantee `.target` is
the underlying DOM node the way a plain DOM event does. The real native event (with a real
DOM `.target`) is at `e.nativeEvent`.

**Correct behavior**: inside any R3F pointer handler, use `e.nativeEvent.target` for
anything that needs a genuine DOM `Element` (pointer capture, etc.), never `e.target`.

## Gating a native-event library's behavior through a React prop races the DOM

**What happened**: `orbitControls.enabled` was tied to `!isInteracting` (React state). A
straight vertical mouse drag sometimes rendered as a diagonal wall — the camera was
drifting mid-drag.

**Root cause**: OrbitControls attaches its own native `pointerdown`/`pointermove` listeners
directly to the canvas element, independent of React. React state updates are asynchronous
relative to native DOM events — the very first native event of a gesture can reach
OrbitControls' listener before React has re-rendered `enabled={false}` into the actual
three.js instance, so the first drag of any gesture could slip through ungated.

**Correct behavior**: when a third-party library reacts to native DOM events directly
(not through React's synthetic system), don't gate it with a React prop tied to state set
in the same event. Hold a ref to the instance and mutate `.enabled` (or equivalent)
imperatively, inside the same synchronous handler that starts the interaction you're trying
to protect. See `src/scene/CameraControls.tsx` + `DrawingCanvas.tsx`.

## Same race, inside our own interaction hook

**What happened**: dragging an existing node to move it did nothing — no wall moved, no new
wall was drawn, gesture silently dropped.

**Root cause**: `useInteraction`'s "what is the current drag mode" value lived in
`useState`. A pointerdown set it via `setDraggingNodeId(...)`, but the subsequent native
pointermove could fire — and be handled by a stale closure captured before React
re-rendered — before that state update was visible, so the closure read the old `null` and
did nothing. Same underlying class of bug as the OrbitControls one above, just entirely
within our own code this time.

**Correct behavior**: any value read inside a native-event handler that must reflect writes
made earlier in the *same* gesture belongs in a `useRef`, not `useState` — refs mutate
synchronously and every closure reads the same object, regardless of render timing. Reserve
`useState` for the parts that actually need to trigger a re-render (e.g. the visual draft
preview). See `src/scene/useInteraction.ts`.

## The browser-tool tab goes stale after HMR failures — reopen before debugging

**What happened**: after a source file briefly had a syntax error, drawing appeared
completely broken in the browser pane — pointer events reached the canvas but R3F's mesh
handlers never fired. A long hunt for a regression followed, including diffing `src/scene`
against the last known-good commit (which showed it was byte-identical).

**Root cause**: the tab was running stale modules from a failed HMR update
(`[vite] Failed to reload /src/App.tsx`). A plain reload — even a forced one — did not
recover it. Opening a brand-new tab did, immediately.

**Correct behavior**: when in-app behavior breaks right after an edit, check the console
for `[vite] Failed to reload` FIRST, and open a fresh tab before assuming a code
regression. Also: never edit source files in the middle of a multi-step UI verification —
the HMR reload resets component state mid-sequence and invalidates the run.

## Eyeballing pixel coordinates from a screenshot is unreliable

**What happened**: an extended debugging detour chasing a "node move doesn't work" bug that
didn't actually exist — the real issue was estimating the rendered node's screen position by
looking at a screenshot image and guessing a pixel number, which was wrong by a wide margin
(sometimes even outside the actual screenshot's dimensions).

**Root cause**: reading exact pixel positions off a rendered image by eye is an estimate,
not a measurement, especially past a couple hundred pixels of guessed distance.

**Correct behavior**: when a follow-up click/drag needs to land on something you rendered
via a previous, known drag input, reuse those known input coordinates directly instead of
re-estimating the result's position from a screenshot. Only fall back to visual estimation
when there's no better source of truth (e.g. content you didn't place yourself).

## Clicking "on the canvas" that actually lands on a UI panel over it

**What happened**: right-click-to-cancel appeared broken — the in-progress wall's anchor dot
survived. A round of speculative "fixes" followed (guarding pointerup by button, making
cancel unconditional) before any evidence was gathered. Nothing was actually wrong with the
feature.

**Root cause**: the test click was at a point covered by the floating MUI panel that sits on
top of the canvas, so the event never reached the R3F ground plane at all. Two things hid
this: the browser tool's coordinate space is not always 1:1 with client pixels (it was 1.6x
in one window size and 1:1 in another), and the app's overlay panels are opaque to pointer
events over a large part of the right-hand side.

**Correct behavior**: for a canvas app with floating overlays, measure the interactive region
before choosing test coordinates — `getBoundingClientRect()` on the canvas *and* on
`.MuiPaper-root` overlays, plus `innerWidth/innerHeight` to establish the tool-to-client
scale. And when a handler seems not to run, log inside it first: "the handler never fired"
and "the handler fired but did the wrong thing" look identical from a screenshot and lead to
completely different fixes.
