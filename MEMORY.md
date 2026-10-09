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

## A fill-image inflated an auto grid track (hero card wouldn't match the left column)

**What happened**: making the hero's right-hand card stretch to the full section height on
desktop blew the whole hero up to ~912px — BOTH columns, measured. Setting
`alignItems:stretch` on the grid + a flex-column card wasn't enough.

**Root cause**: the card's media was `height:100%` inside a `flex:1` wrapper with no definite
height, so for the auto grid row's sizing the browser fell back to the image's INTRINSIC
height. That intrinsic height became the row height, and `alignItems:stretch` then stretched
the (shorter) left column up to match it — the opposite of the intent. An auto grid track
sized from its contents + a child that wants to size from the track = the image wins.

**Correct behavior**: a fill-media must not contribute its intrinsic size to the track that is
supposed to size it. Absolutely-position the media inside a `position:relative; flex:1;
min-height:0` wrapper (`position:{md:'absolute'}, inset:{md:0}`), so it contributes 0 to the
card's natural height; the row is then sized by the OTHER column, and the card stretches to it
and the media fills. Verified: grid / left / card all 450px. (`src/pages/home/HeroSection.tsx`.)

## Reordering siblings across a wrapper on mobile only — `display:contents`

**What happened**: the mobile hero needed heading → image → buttons, but the heading and
buttons live inside one left-column `<Box>` while the image card is its sibling — so plain
`order` couldn't interleave the card between them.

**Correct behavior**: give the wrapper `display:{xs:'contents', md:'block'}`. On mobile
`contents` makes the wrapper generate no box, so its children join the parent grid and each can
take its own `order` (card included); on desktop it's a normal block and the order values are
ignored, leaving the original stacking untouched. Pair with `rowGap:0` + explicit margins so
the exposed children don't pick up the grid's gap twice.

## Watching the page's scroll when the window itself doesn't scroll

**What happened**: a floating bottom bar needed to react to page scroll, but `window`/`document`
scroll never fired — MarketingLayout scrolls inside its own `overflowY:auto` container, not the
window.

**Correct behavior**: listen with `document.addEventListener('scroll', fn, true)` (CAPTURE
phase) — scroll doesn't bubble, but capture sees it from any scroller, and `e.target.scrollTop`
is the element that scrolled. Filter out horizontal rails/carousels by ignoring targets whose
`scrollHeight - clientHeight` is tiny. (`src/pages/home/FloatingServiceBar.tsx`.)

## Prerendered pages as `<route>/index.html` make Cloudflare 308-redirect every URL

**What happened**: prerendering shipped and looked correct locally, but on the deployed site every
page answered **308 → trailing slash**: `/about` → `/about/`, `/products/air-conditioner` →
`/products/air-conditioner/`. The canonical in the HTML said `/about` while the URL actually serving
it was `/about/`, so the pages contradicted themselves — the exact duplicate-content problem the
prerendering was meant to remove — and every internal link and sitemap entry cost a redirect hop.

**Root cause**: the prerenderer wrote `dist/<route>/index.html`. Cloudflare Pages treats a directory
containing `index.html` as a directory and enforces the trailing slash with a 308. Writing
`dist/<route>.html` instead is served at `/<route>` with a plain 200. A file and a directory may
share a base name, so `products.html` and `products/air-conditioner.html` coexist happily.

It was invisible locally for two reasons, both worth remembering: `vite preview` applies its own SPA
fallback *before* looking for a matching file, so every route returns `index.html` and prerendering
appears not to work at all; and the throwaway static server written to work around that modelled
"try `<path>/index.html`" without modelling the redirect Pages puts in front of it.

**Correct behavior**: prerender to `<route>.html`, never `<route>/index.html`. Check a prerendered
build with `pnpm run serve:dist` (`scripts/serve-dist.mjs`), which models Pages' asset-first rule
**including** the trailing-slash 308 — never with `pnpm run preview`. After deploying, confirm with
`curl -s -o /dev/null -w '%{http_code}' <url>` that real pages return 200 and not 308.


## A MUI `<Skeleton>` with only `aspectRatio` collapses to a thin strip

**What happened**: the loading-skeleton cards reserved space for the title lines but the
image area showed as a thin white sliver, so the card didn't "เผื่อรูป" (reserve the photo's
height) and jumped when the real image arrived.

**Root cause**: `<Skeleton variant="rectangular" sx={{ aspectRatio: '4/3', width: '100%' }} />`
has no resolved height — MUI's Skeleton needs an explicit height (or a parent that gives it
one), and `aspectRatio` alone on the Skeleton element does not produce one, so it collapses.

**Correct behavior**: reserve the box on a wrapper and let the skeleton fill it — a
`<Box sx={{ aspectRatio }}>` (same shape as `CatalogImage`) containing
`<Skeleton sx={{ width:'100%', height:'100%' }} />`. Same lesson as the hero-card fill-image
entry above: the aspect-ratio box owns the size, the media fills it.


## `curl -I` measures HEAD, and HEAD is not what the browser gets

**What happened**: while verifying thumbnails on the live site, `curl -sI` reported
`cache-control: no-cache` on every catalog image. That was written up as a real
performance problem — browsers revalidating every image on every page view — and
committed to spec.md and MEMORY.md as a measured fact. It was wrong: a GET of the same
URL returns `public, max-age=3600, stale-while-revalidate=86400` with
`cf-cache-status: HIT` and an `age` of 35 hours. Caching had been working the whole time.

**Root cause**: `curl -I` sends **HEAD**, and Supabase's Storage HEAD handler does not
carry the object's cache-control; the value is only on the GET response. Two things
turned that into a false conclusion rather than a question: the same wrong answer came
back from every object, which read as consistency rather than as a property of the
method; and the obvious follow-up — "the metadata says `public, max-age=3600`, so why
would the response disagree?" — was only asked after the claim was already written down.
Checking the stored metadata (`POST /storage/v1/object/list/<bucket>` →
`metadata.cacheControl`) is what finally split "not stored" from "not served".

**Correct behavior**: measure response headers with a GET —
`curl -s -o /dev/null -D - <url>` — and treat a HEAD result as a hint, never as proof.
When a header looks wrong, check the stored/configured value FIRST: if the two disagree,
the measurement is the suspect, not the configuration. And when a finding contradicts a
deliberate earlier decision, that is the moment to re-measure by another route before
writing it down, not after.

## (superseded) An upload's `Cache-Control` was written down as fact and never measured

**What happened**: `spec.md` stated for a month that catalog images are served with
`public, max-age=3600, stale-while-revalidate=86400`, including the reasoning for not
using `immutable`. Checking the live site while verifying thumbnails showed every
object — originals and thumbnails — actually answering `cache-control: no-cache`, so
browsers revalidate every image on every page view.

**Root cause**: the value was only ever *sent*. Nobody read a response header back.
The upload code is not wrong — a test upload passing it as an HTTP header (what
`scripts/lib/storage.mjs` does) and one passing it as the `cacheControl` form field
(what `supabase-js` does) both came back `no-cache`, so Supabase is dropping it for
reasons still unknown. The bug was in the documentation, which turned "we asked for
this" into "this is what happens", and the claim then sat unchallenged because it
sounded specific.

**Correct behavior**: a header, TTL or cache rule is only true once it has been read
back off a real response — **with a GET**, `curl -s -o /dev/null -D - <url>`. Write what
was measured and the date, and when recording an intention that has not been verified,
say "asking for" rather than stating the result. The same applies to anything else set on
one side of a network boundary and assumed on the other: content type, compression, CORS,
redirects.

⚠️ **The premise of this entry was itself a bad measurement** — see the HEAD-vs-GET entry
above. The documentation habit it argues for still holds; the specific claim that started
it did not. Kept as the example it turned out to be.

## GA4 loaded but recorded nothing — `gtag` pushed an array, not `arguments`

**What happened**: the GA4 property reported zero for the whole time since tagging went live, even while the owner
was browsing the site. On the live page gtag.js was loaded and `dataLayer` held `js` / `config` / `event`, but **no
`google-analytics.com/g/collect` request was ever made**. No console error anywhere.

**Root cause**: `initGa` defined `function gtag(...args) { dataLayer.push(args) }`. A rest parameter is a plain
array; gtag.js only acts on entries that are an `arguments` object and silently skips arrays. The comment directly
above it said "must push `arguments`" — the code contradicted its own comment, and the tag loading looked like proof
that analytics worked.

**Correct behavior**: the `gtag` shim body must be `dataLayer.push(arguments)`. "The script loaded" is not
verification for analytics: check that `dataLayer` entries are `[object Arguments]` and that a
`/g/collect?...&en=page_view` request appears (`performance.getEntriesByType('resource')`), using a fake ID such as
`VITE_GA_ID=G-TEST00000` locally so the check never pollutes the real property.
