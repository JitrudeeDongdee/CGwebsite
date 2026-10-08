# CGwebsite — house-design plan drawing engine

## Architecture
- Vite + React 19 + react-three-fiber (three.js) SPA, TypeScript, oxlint.
- Package manager: **pnpm** (pinned via `packageManager` field, `pnpm-lock.yaml` committed). npm/yarn lockfiles must not be reintroduced.
- **MUI (Material-UI) is installed and in use** for all UI chrome (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`), driven by a custom theme. The r3f canvas layers are NOT MUI — they read theme colours via `useTheme().scene` (see Theming).
- **Routing**: `react-router-dom` v7 with two routes — `/` (Designer) and `/admin` (Leads back-office); unknown paths redirect to `/`. Mounted in `main.tsx` as `AppThemeProvider > BrowserRouter > App`.
- **i18n**: `i18next` + `react-i18next` + browser language detector. Detection is **`localStorage` only** (`cg:language`) — the site opens in Thai for every first-time visitor whatever the browser language is; adding `navigator` back would open it in English for English browsers. Two languages, **Thai (default/fallback)** and **English**, both fully populated (140 leaf keys each, 15 top-level groups, in exact sync). All user-facing strings go through `t(...)`. Language persisted in localStorage key `cg:language`.

## Product requirements (stated by user) — status
- **Bilingual (Thai + English).** ✅ Implemented. Thai is the default/fallback; English confirmed as the second language. i18n layer is in from the start, no hardcoded UI strings.
- **Dark/light theme.** ✅ Implemented via `AppThemeProvider` — a `ThemePreference` of `system | light | dark`; `system` follows `useMediaQuery('(prefers-color-scheme: dark)')`, the other two are explicit overrides. **The default is `light` for a first-time visitor regardless of the OS setting** (`DEFAULT_PREFERENCE`); every choice, `system` included, is persisted in `cg:theme-preference` (an empty key now means "hasn't chosen", not "follow the OS"). three.js material/grid colours are themed **separately** from the MUI/DOM side via `sceneColors[mode]`.
- **2D view looks like a real architectural floor plan.** ✅ Mitered double-line wall poché, dimension strings with measurements, door swing arcs / window glazing symbols, room-area labels — not the old debug thin-lines-and-dots look.
- **3D view stays simple and structural.** ✅ Implemented (`scene3d/`): readable massing (extruded walls, punched openings, parametric roof), explicitly not photoreal.

## Source layout

### `src/drawing/` — pure state/geometry (no three.js; only `useDrawingState.ts` imports React, only `state.ts` calls `crypto.randomUUID()`)
- `types.ts` — `Point`, `DrawNode`, `DrawWall` (`thickness?`), `DrawOpening` (door/window, bound to a wall by `offset` along it), `DrawFixture` (column/furniture, `nodeId?` links junction columns), `DrawRoomLabel` (name stamped at a point), `DrawingState`, `SnapTarget`.
- `tools.ts` — `ToolMode` union: `select | draw | opening{kind,width} | fixture{kind}`; `SELECT_TOOL`, `DRAW_TOOL`.
- `geometry.ts` — `GRID_SIZE=0.5`, `SNAP_THRESHOLD=0.35`, `NODE_HIT_RADIUS=0.35`, `WALL_HIT_DISTANCE=0.35`; `snapToGrid`, `distanceToSegment`, `findNodeAt`, `findWallAt`, `findSnapTarget`, `polygonArea` (shoelace), `findClosedLoop` (DFS single-cycle).
- `rooms.ts` — **`findRooms(state): PlanFaces`** — half-edge planar-graph face traversal → `{ rooms: Room[], totalArea, exteriorWallIds: Set }`. This is the real multi-room area engine (the old single-loop `findClosedLoop` still exists but rooms are now derived from faces). `pointInPolygon` ray-casting.
- `wallOutline.ts` — `EXTERIOR_WALL_THICKNESS=0.2`, `INTERIOR_WALL_THICKNESS=0.1`, `DEFAULT_WALL_THICKNESS=0.1`; `computeWallOutlines` turns centrelines into mitered filled poché bands (miter limit 4, square end-caps).
- `openings.ts` — `OPENING_PRESETS` (door 0.8/0.9, window 1.0/1.5 m); `placeOpenings` resolves offsets to world geometry; `offsetAlongWall`, `findOpeningAt`.
- `fixtures.ts` — `FIXTURE_CATALOG` with real sizes (column 0.2×0.2 solid; beds, sofa, table, kitchen, toilet, sink as outlines); `fixtureSpec`, `findFixtureAt` (rotated-footprint hit test).
- `materials.ts` — flat-colour surface palettes for 3D: `WALL_MATERIALS`, `FRAME_MATERIALS`, `ROOF_MATERIALS` + `*_SURFACE` records and `GLASS_SURFACE` (`{color,roughness,metalness,opacity}`).
- `roof.ts` — `ROOF_SHAPES = ['gable','hip','shed','flat']`, `ROOF_OVERHANG=0.4`, `ROOF_RISE=1.2`; `buildRoof(bounds, shape, eaves)` → flat triangle vertex list.
- `building3d.ts` — `WALL_HEIGHT=2.7`, `DOOR_HEIGHT=2.0`, `WINDOW_SILL=0.9`, `WINDOW_HEIGHT=1.2`; `buildBuilding3D(state, exteriorWallIds)` splits each wall along its length around openings (solids + headers + sills), returns `{ walls, panels, bounds }`. Split-not-CSG.
- `state.ts` — immutable reducers: `createInitialState`, `commitWall`, `moveNode`/`finishNodeMove` (snap + merge onto target), `deleteWall`/`deleteNode` (drop orphans), `duplicateWall`, `addOpening`/`deleteOpening`, `loadPlan`, `moveWall`/`finishWallMove` (sideways drag along normal), `setRoomLabel`, `addFixture`/`moveFixture`/`rotateFixture`/`deleteFixture`. Private `syncStructuralColumns` keeps one column per junction.
- `templates.ts` — `PLAN_TEMPLATES`: four starter plans (`studio-6x4`, `one-bed-6x6`, `two-bed-8x6`, `shop-6x8`), each a closed, furnished, planarized footprint centred on origin. Junction columns added later by `loadPlan`.
- `useDrawingState.ts` — React hook wrapping the above with **undo/redo history** (`MAX_HISTORY=50`, `commit` vs `amend` for live drags). Public surface (see Data Contracts).

### `src/scene/` — 2D top-down r3f view layer (orthographic, locked top-down)
- `DrawingCanvas.tsx` — wiring hub: owns `<Canvas orthographic>` (pos `[0,20,0]`, zoom 38), calls `useInteraction`, toggles `OrbitControls.enabled` imperatively on pointer down/up, right-click cancels in-progress wall else context menu. Renders grid, `GroundPlane`, `WallsView`, `OpeningsView`, `FixturesView`, `GhostPreview`, `RoomAreaLabels`, `DimensionStrings`, `NodesView`, `DraftWallView`, `SnapIndicator`.
- `useInteraction.ts` — pointer-gesture state machine; CAD-style **click-to-place** wall drawing, drag-to-move for nodes/fixtures/walls (`DRAG_THRESHOLD=0.08` distinguishes click vs drag), placement dispatch by `tool.type`.
- `GroundPlane.tsx` — single invisible input surface; every pointer event → one plan-space `{x,y}` via `onDown/onMove/onUp/onContextMenu`; handles pointer capture (uses `e.nativeEvent.target`).
- `CameraControls.tsx` — OrbitControls for pan + pinch-zoom only, `enableRotate={false}`, arrow-key panning; `enabled` toggled imperatively via ref.
- `CameraFit.tsx` — on `token` change, frames the whole plan (`MARGIN=2.5`).
- `WallsView` / `NodesView` / `OpeningsView` / `FixturesView` — render poché walls, corner nodes, door/window symbols, furniture/column plan symbols.
- `DraftWallView` / `SnapIndicator` / `GhostPreview` — rubber-band preview, snap ring, translucent placement ghost.
- `DimensionLabel` / `DimensionStrings` — per-wall length text + overall building width/depth dimension runs (drafting convention).
- `RoomAreaLabels.tsx` — room name + area at each centroid as **DOM** (drei `<Html>`) so Thai glyphs render; colours reach it via CSS vars `--room-label-name` / `--room-label-area` injected by `AppThemeProvider`.

### `src/scene3d/Scene3D.tsx` — 3D massing view
Own perspective `<Canvas shadows>` (fov 45), free orbit (`maxPolarAngle ≈ π/2.05`), hemisphere + shadow-casting directional light. Turns the 2D plan into 3D via `buildBuilding3D`; walls/openings as boxes (windows → `GLASS_SURFACE`), roof as `buildRoof` BufferGeometry. Props: `{ state, exteriorWallIds, options: Building3DOptions }` where `Building3DOptions = { roof: RoofShape; wall: WallMaterial; frame: FrameMaterial; roofMaterial: RoofMaterial }`.

### `src/ui/` — MUI chrome (all MUI; most use i18n)
`ToolSidebar` (templates + opening presets + fixture catalog palette), `BottomToolbar` (select/draw + undo/redo/fit), `Building3DPanel` (roof shape + roof/wall/frame materials), `RoofPreview` / `ItemPreview` (inline SVG thumbnails), `AreaSummary`, `EstimatePanel` (grade toggle + price breakdown + disclaimer), `CanvasContextMenu`, `RoomNameDialog`, `LeadFormDialog`, `LanguageSwitcher`, `SettingsMenu` (theme preference).

### `src/pages/`
- `DesignerPage.tsx` — main composition: `useDrawingState()` + local state for `tool`, `grade`, `view: 'plan' | 'three'`, `building3d` options, context menu, lead form, `fitToken`. Layout: `ToolSidebar` | canvas (2D `DrawingCanvas` or 3D `Scene3D`) | right panel (`Building3DPanel` in 3D, `AreaSummary`, `EstimatePanel`). Computes `estimate` via `estimatePrice`, persists leads via `leadRepository`. Global keydown: Escape (cancel), Cmd/Ctrl+Z / Shift undo-redo.
- `AdminPage.tsx` — leads back-office: MUI `Table` of leads from `leadRepository.list()`, inline status `Select` (`LEAD_STATUSES`) persisted via `updateStatus`, localStorage notice.

### `src/pricing/`
- `types.ts` — `MATERIAL_GRADES = ['economy','standard','premium']`; `PriceConfig` (currency, `pricePerSqm` per grade, `openingPrice` per kind); `PriceEstimate`.
- `estimate.ts` — `estimatePrice(areaSqm, grade, config, openings)` → `PriceEstimate | null` (null when area ≤ 0/non-finite). `total = areaCost + openingsCost`. Furniture/floors/roof/parking deliberately excluded (Phase 2). `formatCurrency` via `Intl.NumberFormat`.
- `config.ts` — **PLACEHOLDER** rates (`PLACEHOLDER_PRICE_CONFIG`, not real company pricing): THB, per-sqm economy 12,000 / standard 18,000 / premium 25,000; door 8,000 / window 6,000. Persisted in localStorage `cg:price-config`.

### `src/leads/`
- `types.ts` — `LEAD_STATUSES = ['new','contacted','won','lost']`; `LeadContact` (name/phone/email/province/timeline); `Lead` (id, contact, status, createdAt, frozen `plan` snapshot, grade, estimate); `LeadRepository` interface (all async, so a Supabase backend can drop in later).
- `localStorageRepository.ts` — `LocalStorageLeadRepository` on key `cg:leads`; `list` sorts by `createdAt` desc; singleton `leadRepository`.

### `src/theme/`
- `palette.ts` — `brand` tokens: `blueprint` (deep blue, primary), `terracotta` (clay, secondary), `neutral` (warm paper); plus `sceneColors` (separate light/dark sets for three.js — real hex, since materials can't use CSS vars).
- `theme.ts` — `buildTheme(mode)` augments MUI `Theme` with `scene: SceneColors`; maps brand → MUI palette; Thai-capable font stack (IBM Plex Sans Thai Looped → Noto Sans Thai → system); `borderRadius: 8`; buttons `textTransform:none`, `disableElevation`.
- `AppThemeProvider.tsx` — see Theming above; exposes `useThemeMode()`.

## Data Contracts
- `DrawingState = { nodes: Record<string, DrawNode>, walls: DrawWall[], openings: DrawOpening[], fixtures: DrawFixture[], roomLabels: DrawRoomLabel[] }` — shared between `drawing/` and every `scene/`, `scene3d/` consumer. Also the frozen `Lead.plan` snapshot shape. Do not change without checking all consumers.
- `useDrawingState()` returns: read state (`state`, `roomArea`, `rooms`, `exteriorWallIds`); wall ops (`addWall`, `removeWall`, `copyWall`, `dragWallBy`, `finalizeWallMove`); node ops (`beginNodeDrag`, `updateNodePosition`, `finalizeNodeMove`, `removeNode`); opening ops (`placeOpening`, `removeOpening`); fixture ops (`placeFixture`, `updateFixturePosition`, `finalizeFixtureMove`, `turnFixture`, `removeFixture`); plan/room ops (`applyTemplate`, `nameRoom`, `clearAll`); history (`undo`, `redo`, `canUndo`, `canRedo`). Live drags use `*Position`/`dragWallBy` (amend, no undo step) then a `finalize*` (one undo step).
- `useInteraction(options)` where `options` carries `state`, `tool`, and all the drawing-state callbacks above → `{ draft, moveSnap, cursor, isDrawing, onDown, onMove, onUp, cancelDrawing }`. `GroundPlane` and `DrawingCanvas` depend on this exact shape.
- Pointer input into `useInteraction` is a normalized `Point` (`{x,y}` world/grid units, not screen px) — produced by `GroundPlane`'s raycast, one code path for mouse and touch.
- `Building3DOptions = { roof, wall, frame, roofMaterial }` — shared between `DesignerPage`, `Building3DPanel`, `Scene3D`.
- `PriceEstimate` / `PriceConfig` — shared between `pricing/`, `EstimatePanel`, and `Lead.estimate`.

## Done
- **Full 2D plan editor**: CAD click-to-place wall drawing with grid + node + wall-midpoint snapping; node/wall/fixture drag-to-move; connected walls follow moved corners; snap-merge joins corners at a shared node.
- **Architectural floor-plan look**: mitered poché walls (0.2 exterior / 0.1 interior), overall dimension strings, per-wall length labels, door swing arcs, window glazing.
- **Multi-room area detection** via half-edge face traversal (`findRooms`) — total + per-room area, exterior-wall set derived from the outer face. (Supersedes the spike's single-loop-only limitation.)
- **Openings**: doors/windows bound to walls by offset, preset widths, survive wall moves/stretches.
- **Fixtures**: furniture + structural columns; junction columns auto-synced to corners.
- **Room names**: stamped at a point, rename/clear via dialog + context menu.
- **Templates**: four furnished starter plans, auto-framed on load.
- **3D view**: extruded walls, punched door/window panels, parametric roof (gable/hip/shed/flat), wall/frame/roof material choices, free orbit.
- **Undo/redo** across all edits (50-step history, live-drag aware).
- **Pricing estimate**: area × grade rate + opening costs (placeholder THB rates), formatted, with disclaimer.
- **Leads**: lead-capture dialog → localStorage repo → admin table with editable status.
- **Theming**: MUI custom theme, brand palette, dark/light following OS with manual override; three.js scene colours themed separately.
- **i18n**: Thai (default) + English, fully translated, language switcher.
- **MUI**: installed and used for all chrome.
- **Plan gallery + file import/export**: `src/ui/PlanGallery.tsx` (scroll strip below the canvas) lists built-in templates + drop-in plans fetched from `public/plans/manifest.json`. `src/drawing/planFile.ts` defines the portable `PlanFile` format (`cg-house-plan` v1 wrapping `DrawingState`) + `parsePlanFile`/`planFileToJson`; upload (JSON) and download are gated behind sign-in. Gallery cards preview each plan as an **isometric 2.5D massing thumbnail** (`IsoThumbnail` in `ItemPreview.tsx`), not a flat plan.
- **Mock auth**: `src/auth/AuthProvider.tsx` — localStorage `cg:session`, `requireAuth(action)` gate + app-wide dialog; gates download/upload/send-to-team. **NOT real security** — placeholder until a real provider lands (Supabase Auth chosen).
- **Login/Sign-up page** (`/login`, `src/pages/LoginPage.tsx`): visual-only email + Google + Facebook sign in/up UI; buttons are clickable but non-functional (surface a "preview mode" notice). Real wiring deferred.
- Package manager is pnpm; `pnpm run build` passes (see Current state).
- Four pointer-race/coordinate bugs from the spike are fixed and documented in `MEMORY.md` (template CSS offset, R3F `e.target`, OrbitControls-vs-React-prop race, `useInteraction` stale-state race).

### `src/content/` — editable site content (not code)
- **`contact.json` — the ONE place to edit contact channels.** An array of `{ kind: 'phone'|'line'|'email'|'facebook'|'address', value, url? }` where `value` is one string (phone/email/LINE id) or a `{ th, en }` pair for text that must be translated (the address); `contact.ts` types it and derives the link (`tel:` for a phone with ≥6 digits, `mailto:` for an email, and line/address only when the entry carries an explicit `url` — we never invent a LINE or map URL) plus the i18n label key `mkt.contact.<kind>Label`. Values of `-` / `—` / empty count as "not filled in yet": never linked, and hidden from the footer. A channel may also carry an optional `label: {th,en}` that overrides the kind's default — needed as soon as a kind repeats, because two rows both reading "โทร" tell a visitor nothing about which number to try first (the backup phone and backup e-mail added 2026-10-03 use it). ⚠️ Both renderers used the **label as the React key**, which silently collides once a kind appears twice; the contact page now keys on `${kind}-${index}`. Read by the marketing **footer** and the **contact page** (icons + clickable values). Changing a number/email here updates both.

### SEO files
- **`scripts/generate-seo-files.mjs`** (runs as npm `prebuild`, also `pnpm run seo`) writes `public/robots.txt` + `public/sitemap.xml`. Routes come from the app + **the live catalogue in Supabase**: the `/home/:service` pages (canonical — `/` and `/home` only redirect, so they're deliberately not listed), `/products` + every published product, `/portfolio` + every published project, `/community`, `/about`, `/contact`, `/design`. robots disallows `/admin` and `/login`.
- ⚠️ **It used to regex the seed arrays in `src/catalog/*.ts`, and rotted silently.** Those stopped being the catalogue when content moved into Supabase; measured 2026-10-06 the sitemap advertised **7 project URLs that 404** and omitted **all 20 real projects** (25 URLs total, now 54). Reading the live data is the only version of this that stays true.
- Reads with the **anon key**, never the service key: RLS then returns exactly the published rows a visitor can see, so an unpublished draft cannot reach the index through a `.eq('published', true)` that someone forgets. The build env already carries both `VITE_SUPABASE_*` vars for the bundle.
- `lastmod` is each row's own `updated_at` (kept current by the `touch_updated_at` trigger), emitted as a **full W3C datetime** — truncating to a bare date would shift a row edited in the Thai evening back a day, since the column is UTC and local time is +07. Listing pages (`/products`, `/portfolio`, `/community`) take the newest `updated_at` of what they list; static pages take the build date.
- **Four build modes, all verified:** no `SITE_URL`/`CF_PAGES_URL` → robots only, no sitemap; a preview branch → `Disallow: /`, no sitemap; `SITE_URL` set but **Supabase not configured** → robots only plus a warning naming why; Supabase configured but unreachable → **the build fails** (exit 1, no file written) rather than publishing a sitemap from a fallback that would be wrong for months.
- The origin is **`SITE_URL`** — the same env var `vite.config.ts` uses for og:url/og:image. Without it robots.txt is still written but **the sitemap is skipped** (and a stale one deleted): guessed absolute URLs are worse than none. Build for real with `SITE_URL=https://<domain> pnpm run build`.
- `tsconfig.node.json` uses `module: esnext` + `moduleResolution: bundler` so `vite.config.ts` can import from `src/` (Vite bundles the config itself).
- **Open Graph / Twitter cards** — the `tdd-site-meta` plugin in `vite.config.ts` injects them into `index.html` at build: `og:type/site_name/locale(+alternate)/title/description`, `twitter:card=summary_large_image` + title/description always; `og:url`, `og:image` (+`width/height/alt`) and `twitter:image` only when `SITE_URL` is set. Title/description are **read back out of `index.html`** so the card and the search result can't drift apart. The share image is `public/brand/og-card.png` (1200×630, blueprint-grid card with the shield + Thai tagline) — regenerate with `pnpm run og` (`scripts/make-og-card.py`, Pillow; not part of the build, output committed).
- ~~Because this is a client-rendered SPA, these tags are site-wide~~ — **superseded 2026-10-06 by prerendering** (below). `index.html` is still the fallback for routes that are not prerendered.

### Contracting local search — "รับเหมา เพชรบูรณ์" (2026-10-07)
Goal stated by the owner: someone searching **รับเหมา เพชรบูรณ์** should find us. The page already had
the phrase in title/h1, but "ผู้รับเหมา" appeared nowhere and the h2s were generic, so:
- **`src/pages/home/ContractingLocalSection.tsx`**, rendered by `HomePage` on `/home/contracting` only:
  intro (whole province, small jobs welcome — both confirmed by the owner), the work types (taken from real
  portfolio entries), all 11 districts as chips, and a 5-question FAQ (MUI Accordion keeps collapsed answers
  mounted, so the prerendered HTML carries every answer) + **FAQPage JSON-LD**. Google only shows FAQ rich
  results for gov/health sites, so the markup aids understanding, not a snippet. Strings: `mkt.contractingLocal.*`.
- `FeaturedSection` / `PortfolioSection` take an optional `heading`; `HomePage` reads
  `mkt.service.<cat>.productsHead` / `.workHead` and falls back to the generic label, so only contracting
  changes for now ("บริการรับเหมาก่อสร้างและงานระบบ", "ผลงานรับเหมาก่อสร้างในเพชรบูรณ์").
- JSON-LD `areaServed` lists every Phetchabun district (`อำเภอ…`) besides the provinces.
- **Facebook Page (2026-10-07):** `https://www.facebook.com/cg9723/` ("หจก.ไทยดวงดี : CG อิเล็กทรอนิคส์", a public Page — checked via its og tags, not a personal profile) is the `facebook` channel in `contact.json` (footer + contact page) and the JSON-LD `sameAs`. Only a business Page belongs in `sameAs`; never a personal profile.
- **Company e-mail (2026-10-07):** `contact@thaidongdee.com` replaces the two personal Gmail addresses in `contact.json` and the JSON-LD `email`. It is Cloudflare Email Routing (free) → Email Worker `contact-forward` (Cloudflare dashboard, not this repo), which forwards each message to both Gmail inboxes; the second forward is wrapped so a failure there never bounces the mail. Personal addresses no longer appear on the site.
- **`/line` short link (2026-10-08):** `public/_redirects` sends `/line` (and `/line/`) to the LINE OA add-friend URL with a **302**, so printed material and images can say `thaidongdee.com/line` instead of `@610byzdy`. 302 on purpose: if a Premium ID replaces the basic ID, change the target here and every printed link follows.
- The bigger lever is off-site and outside this repo: the verified Google Business Profile (map pack),
  reviews, and links from the company's Facebook posts.

### Local SEO / structured data (2026-10-06)
- **JSON-LD** (`index.html`, `GeneralContractor`) carries the real `geo`
  (16.345432, 101.099445 — checked against Phetchabun's bounding box before writing it, since a
  transposed pair puts the pin in the ocean and nobody notices until a customer does) and
  `openingHoursSpecification` (Mon–Sat 08:00–17:00; Sunday as `opens == closes == "00:00"`, which is
  how schema.org says "closed"). `url` points at `/home/house` (`/` now 301s) and `logo` at
  `brand/favicon-256.png` — it pointed at `brand/logo-shield.png`, which the site stopped using when the
  logo became `favicon.svg`. Because the prerenderer uses `dist/index.html` as its template, all 54 pages
  inherit it.
- **Google-Search favicon (2026-10-08).** `index.html` carried only `<link rel="icon" type="image/svg+xml">`,
  and Google Search routinely ignores an SVG-only icon → it showed the generic globe next to the result.
  Added **raster PNG icons** `public/brand/favicon-{48,96,192}.png` (sizes a multiple of 48, downscaled from
  `favicon-256.png`) as `rel="icon" type="image/png"` plus an `apple-touch-icon`, keeping the SVG first for
  browsers. All prerendered pages inherit them via the `dist/index.html` template. ⚠️ Google only refreshes
  the search favicon when it re-crawls the home page, so the globe persists for days/weeks after deploy — not
  an error. (Separately: a plain Google text result shows NO og:image thumbnail by design — `og:image`
  = `brand/og-card.png`, 1200×630, is for FB/LINE/Twitter SHARE cards, verified 200, and is already correct.)
- **The address links to the map** (`contact.json` gained a `url` on the address channel, the same pin as
  `geo`), so the footer and contact page stop showing it as dead text.
- **Local keywords.** `<h1>` was "บ้านน็อคดาวน์" and the word **เพชรบูรณ์ appeared in no page's body at
  all**. Service pages now headline e.g. "บ้านน็อคดาวน์ บ้านสำเร็จรูป เพชรบูรณ์" via a SEPARATE
  `mkt.home.svcSeoN` key — ⚠️ do NOT put the search phrase in `svcN`: that label is also the category
  filter chip, the card title and an admin table cell, and a long string breaks all three (tried, caught).
  `ServiceAreaSection` names the districts individually, because someone in หล่มสัก searches for หล่มสัก.
- **Canonical + soft 404.** Nothing carried a canonical, and `/` plus every mistyped URL answered 200 with
  the SPA shell before moving in JavaScript — each one a duplicate of the landing page to a crawler.
  `_redirects` sends `/ → /home/house` as a **301**; `useSeo` writes a canonical for the current URL and a
  `robots` meta; an unknown path renders `NotFoundPage` with `noindex, follow` instead of redirecting
  home. It cannot return a 404 *status* (static host, the CDN already said 200) — `noindex` is the part
  that counts.
- **Descriptions clamp at 155** (`clampDescription`), not 300: Google renders ~155 and drops the rest, so
  the old limit was two-thirds invisible and ended mid-sentence. The prerenderer repeats the rule so the
  static head and the one the SPA sets after boot agree. Thai has no spaces, so the word-boundary cut
  falls back to a hard cut.
- **Images carry `width`/`height` attributes** (1600×1200 for a 4:3 slot — catalog photos are stored at a
  1600px long edge). The wrapper's `aspectRatio` reserved the box in CSS, but the `<img>` had no intrinsic
  size, so the HTML a crawler reads — and a browser before CSS applies — saw a zero-height image. The hero
  also gets `fetchPriority="high"`.

### Prerender / SSG — `scripts/prerender.mjs` + `src/entry-server.tsx` (2026-10-06)
Every URL used to serve the same `index.html` with an empty `<div id="root">` and one site-wide title/OG
card. Google renders JS and coped; **Facebook and LINE do not**, so every shared link previewed as the
same generic card whatever page it pointed at.

`pnpm run build` is now `tsc -b && vite build && build:ssr && prerender`: an SSR bundle of
`src/entry-server.tsx`, then a script that fetches the catalogue from Supabase and writes
`dist/<route>/index.html` for all **48 content routes** (5 static + 23 products + 20 projects), each with
its own `<title>`, `description`, `canonical`, `og:*`/`twitter:*` (including a per-row `og:image` from
Storage) and fully rendered body.
- ⚠️ **`prerenderToNodeStream` from `react-dom/static`, NOT `renderToString`.** Every route is
  `React.lazy`; `renderToString` does not wait for Suspense, it emits the fallback. The first attempt did
  exactly that and produced **48 byte-identical files** — header and footer, no page content. The failure
  is silent: the files exist and look plausible.
- ⚠️ **`useEffect` does not run while prerendering**, so `CatalogProvider` takes an `initial` prop and the
  build hands it the rows it already fetched. Without it every prerendered page is an empty shop.
- **Deliberately not hydration.** `main.tsx` keeps `createRoot`, which discards the prerendered DOM and
  renders fresh. That costs one re-render and avoids the entire hydration-mismatch class: the HTML is
  built as Thai + light (the documented defaults) while a returning visitor may have chosen English or
  dark, and that cannot be known at build time.
- Emotion styles are collected per render with a fresh `createCache`, or one page's styles leak into the
  next.
- **Not prerendered:** `/design` (a three.js canvas), `/admin/*` and `/login` — private, and robots
  already disallows them. They keep the SPA fallback.
- ⚠️ **Pages are written as `dist/<route>.html`, never `<route>/index.html`.** A directory index makes
  Cloudflare Pages enforce a trailing slash with a **308** — measured on the deployed site, every page
  did it — which puts a redirect in front of every internal link and leaves the canonical (`/about`)
  disagreeing with the URL serving it (`/about/`). See MEMORY.md.
- Check a build with **`pnpm run serve:dist`** (`scripts/serve-dist.mjs`), which models Pages' asset-first
  rule including that 308. ⚠️ `vite preview` does NOT — it applies its own SPA fallback
  first and serves `index.html` for every route, which makes prerendering look broken locally. Verify
  with a server that mimics the asset-first rule.
- A route that fails to render **fails the build** (exit 1): a skipped route silently keeps the old
  generic-card behaviour, which is the bug being fixed.
- **No Supabase env → prerender is skipped, except on `main` (2026-10-06).** Cloudflare Pages keeps
  Preview and Production env vars separately and only Production had `VITE_SUPABASE_*`, so every
  preview build died on `fetch('/rest/v1/…')` → "Invalid URL". A preview or local build without the vars
  now warns and exits 0 (SPA fallback still serves every route); a production build (`CF_PAGES_BRANCH`
  / `WORKERS_CI_BRANCH` = `main`) still fails, because shipping without prerender silently undoes the SEO.
  Setting the vars in Pages → Settings → Environment variables → **Preview** gives previews real HTML too.
- `/home` and `/home/` are a real **301** to `/home/house` in `_redirects` (no file exists for the alias,
  so it used to answer 200 with the SPA shell and move in JavaScript).
- Needs `@emotion/server` + `@emotion/cache` as devDependencies.
- `public/robots.txt` is committed; `public/sitemap.xml` is gitignored (per-domain, regenerated each build).

## Persistence / backends (current = localStorage, all swappable)
- Leads → `cg:leads`; price config → `cg:price-config`; theme preference → `cg:theme-preference`; language → `cg:language`. `LeadRepository` is async by design so a real backend (Supabase noted) can replace the localStorage impl without touching callers.

## Todo / Out of scope
- **Real pricing rates** — `config.ts` is explicitly placeholder; needs the company's actual per-sqm and per-opening numbers, and the Phase-2 cost factors (floor count, roof type, parking) that `estimate.ts` currently ignores.
- **Real backend** for leads + price config (currently localStorage only).
- **Physical touch-device testing** — the pointer path is unified for mouse/touch but has not been verified on a real touch device (drag-to-draw, node drag, pinch-zoom, hit-area sizing, Safari double-tap-zoom suppression).
- ~~**Bundle size**~~ — done 2026-09-06: routes + `Scene3D` are lazy-loaded (see Phase 2.5). The largest remaining chunk is `Scene3D` (904 kB / 239 kB gzip, three.js), which only the 3D view pulls.
- **No automated tests** — no test runner configured; verification is manual + build/lint. Geometry math (`polygonArea`, loops, faces) is the obvious first candidate for unit tests.
- Known minor: duplicated rename-room `MenuItem` block in `CanvasContextMenu.tsx`.

## Roadmap — full company website
Agreed direction to grow this from a tool into CG's company site.

**✅ Phase 1 — DONE (2026-07-29): marketing shell + Home/About/Contact.**
- `src/marketing/MarketingLayout.tsx` — sticky nav + mobile drawer + footer (every footer entry is a link: บริการ → `/home/:service`, บริษัท → `/about` `/portfolio` `/products?category=house` `/contact`, ติดต่อ → from `src/content/contact.json`); its own scroll container (`height:100vh; overflowY:auto`) because `#root`/body are `height:100vh; overflow:hidden` for the designer. Wraps marketing routes via `<Outlet/>`.
- `src/marketing/i18n.ts` — marketing strings registered as a `mkt.*` group via `i18n.addResourceBundle` (deliberately NOT edited into `locales/*.json`, to avoid colliding with concurrent edits there).
- `src/pages/AboutPage.tsx` — rewritten 2026-09-07 to cover **every** service line, not just knock-down houses: the headline, intro and four value cards (โปร่งใส / ครบวงจร / ได้มาตรฐาน / พร้อมเครื่องมือ) name contracting, electrical & fibre-optic work, built-in furniture and equipment rental. Below the CEO block, `WorkStrip` is a horizontally-scrolling rail of every delivered project (scroll-snap, native scrolling for touch/trackpad, arrows as a mouse affordance) — a rail rather than a grid because the point is breadth across service lines.
- `src/pages/HomePage.tsx` — hero (CTA → `/` designer), 4 service cards (บ้านน็อคดาวน์ = core + electronics/furniture/equipment-rental), featured models from `PLAN_TEMPLATES` with `IsoThumbnail` 3D previews + prices, portfolio strip, stats band, final CTA. `AboutPage.tsx`, `ContactPage.tsx` — contact form (→ localStorage `cg:contact-messages`, no backend yet) plus the contact-channel rail (phone / LINE / email / **Facebook** / address) read from `src/content/contact.json`, the same source as the footer.
- **Logo**: `src/ui/LogoMark` (`src/ui/Logo.tsx`) renders **`public/favicon.svg`** — the same file as the browser-tab icon, so header, footer and tab all change in one place; an inline copy of the artwork is the fallback. (`public/brand/logo-shield.png` is no longer referenced.)
- **One unified header** `src/ui/SiteHeader.tsx` (brand + marketing nav + "ออกแบบบ้าน" CTA → `/` + admin + login + lang/theme + mobile drawer), mounted by BOTH shells — dense 48px to keep the designer's `calc(100vh - 48px)` layout valid.
- `App.tsx` split into two layout routes: `AppShell` (SiteHeader + fixed-height column) for `/design /login /admin`; `MarketingLayout` (SiteHeader + scroll + footer) for `/home /products /portfolio /about /contact`. **Landing `/` redirects to `/home/house`; the designer tool lives at `/design`** (reversed from the earlier "tool at /" decision, per the user). All "ออกแบบบ้าน" CTAs point to `/design`.
- `AboutPage` includes a CEO/leadership section — **ชูชาติ ดวงดี / Chuchat Duangdee**, CEO; the photo is in place at `public/team/ceo.jpg` (900×900 JPEG, ~124 kB — converted down from the 1254×1254 PNG that was dropped in), shown in a 380px square column. Build + preview verified; content/figures/photo are placeholders pending real company data.

**✅ Phase 2 — DONE (2026-07-29): Products + Portfolio.**
- `src/catalog/` — bilingual seed content + helpers (swappable to a repo/backend later): `types.ts` (`Product`, `Project`, `Localized`, `ProductCategory`), `products.ts` (~10 seed products across house/electronics/furniture/rental + `getProduct`/`productsByCategory`/`heroProductFor`; `Product.bestSeller` marks one per line for the hero badge), `projects.ts` (~6 seed projects + `getProject`), `categories.tsx` (per-category label key + colour + icon), `useLocalized.ts`, `CatalogImage.tsx`.
- **Catalog images live in Supabase Storage** (bucket `catalog`, public read / staff write — migration `20260907090000_catalog_storage.sql`). `src/supabase/storage.ts` `imageUrl(path)` resolves the SAME relative path (`portfolio/<slug>.jpg`) to a Storage public URL when Supabase is configured and to `public/<path>` when it isn't, so a checkout with no Supabase project still renders the seed images. `catalog/images.ts` picks the path: the row's `imagePath` (`image_path`) if set, else the `<folder>/<slug>.jpg` convention. A missing object just 404s into `SmartImage`'s placeholder panel. Upload with `pnpm run images:upload` (`--dry-run` / `--delete-local`) or straight from `scripts/import-project.mjs`; both need `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (CLI only — the key bypasses RLS). Objects are uploaded **asking for** `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`, deliberately not `immutable`/1-year: paths are stable (`portfolio/<slug>.jpg`), so a corrected photo overwrites the same key — Supabase's CDN does purge on overwrite (measured ~10 s), but a browser that already cached an immutable response would keep the old photo for a year. Confirmed working 2026-10-07: a **GET** of any object returns `cache-control: public, max-age=3600, stale-while-revalidate=86400` with `cf-cache-status: HIT`, and the stored object metadata carries the same value (`POST /storage/v1/object/list/<bucket>` → `metadata.cacheControl`). ⚠️ **A HEAD of the same URL answers `cache-control: no-cache`** — Supabase's HEAD handler does not carry the header. That is a quirk of HEAD, not what browsers get, and it cost a round of wrong conclusions here: verify with `curl -s -o /dev/null -D - <url>` (GET), never `curl -sI` (HEAD). See MEMORY.md. Verified end-to-end on 2026-09-07: upload → public URL 200 byte-identical → a published row with `image_path`/`source_url` rendered the photo and the "ดูโพสต์ต้นฉบับ" button on `/portfolio/:slug` → test row and object deleted. **Brand assets stay in `public/`** (`brand/`, `team/ceo.jpg`) so the logo never waits on a Storage round trip.
- **Thumbnails (2026-10-07).** Every upload also writes a **400px JPEG** under a `thumbs/` prefix mirroring the
  original's path (`portfolio/foo.jpg` → `thumbs/portfolio/foo.jpg`). A prefix rather than a `-thumb` suffix so
  the two never interleave in the bucket browser, a whole folder can be regenerated in one go, and the uploader
  can tell a thumbnail from an original **by its path alone** instead of making thumbnails of thumbnails. Both
  upload paths are covered at one point each: `src/admin/client.ts` re-encodes the same bitmap in the browser,
  and `scripts/lib/storage.mjs` does it inside `uploadCatalogImage`, so `import-from-post`, `import-project`,
  `seed-products` and the bulk uploader inherit it. Deletes remove both objects — nothing lists the bucket, so
  an orphan under `thumbs/` would never be found again. Writing the thumbnail is **best-effort on both sides**:
  the original is already stored and every reader falls back to it, and failing an upload (losing someone's
  photo) to save a few kB is the wrong trade.
  ⚠️ **Storage 404s a missing thumbnail rather than serving the original**, so every reader must fall back
  explicitly — `src/admin/AdminImage.tsx` swaps on `onError`, and `CatalogImage`'s `thumb` prop nests a second
  `SmartImage` in its own `fallback` chain. `pnpm run images:thumbs` (`scripts/backfill-thumbnails.mjs`) walks
  the bucket and fills the gap for anything older; it skips what already has one and is safe to re-run. Run
  2026-10-07: **232 created, 0 failed**.
  **Who gets the small copy:** card-sized slots only — `/products`, `/portfolio`, `/community`, the home
  featured/portfolio/community rails, the About work strip, the admin listings, and the "related" cards at the
  foot of a detail page. Heroes, detail pages and the lightbox keep the full file, where 400px visibly softens.
  Measured on the 29 portfolio covers: **8,683 kB → 1,280 kB (−85%)**; one product cover 311 kB → 55 kB.
  Verified against a real prerendered build (53 pages): `products.html`/`portfolio.html` reference only
  `thumbs/`, a project page's gallery only originals.
  Known cost: a row with **no** photo (no `image_path`, so the `<folder>/<slug>.jpg` convention path, which is
  not in the bucket) now makes two failed requests instead of one before showing the coloured placeholder.
  The fix is real photos on those rows, not more branching.
- `src/ui/SmartImage.tsx` — renders a real photo if present else a fallback; an absolute URL is used as-is, a bare path is resolved against the deploy base. **Image naming convention** (drop real photos here, no code change): CEO → `public/team/ceo.jpg`; products → `public/products/<slug>.jpg`; portfolio → `public/portfolio/<slug>.jpg`. `CatalogImage` fallback = flat category-coloured panel + icon.
- **Per-service home pages** (`/home/:service` — house / electronics / furniture / rental): `HomePage` renders the SAME layout for the company home and for each service line; `useParams().service` swaps the content. Hero (service title/lead, its 3 highlights in the trust row, CTA: house→`/design`, others→`/contact`, hero card = that line's **best seller**, badged "ขายดี", linking to its product page — house models render as an iso plan thumbnail, other lines as their catalog photo), the 4 service cards (all links to `/home/:service`; only the one being viewed is outlined in primary — the house line is marked by its permanent "งานหลัก" chip, not a border), featured block (house plans on `/home` + `/home/house`, catalog products otherwise) with a **see-all button → `/products?category=<cat>`**, portfolio filtered to that category (section hidden when empty) with a **see-all button → `/portfolio?category=<cat>`**, stats, CTA. Strings live in the `mkt.service.*` i18n group. **`/home` (and `/`, and any unknown path) redirects to `/home/house`** — the house line is the landing page; `/home` is kept only as an alias, so `HomePage`'s company-wide variant (the `cat === null` branch) is currently unreachable, kept for the day a combined home is wanted again. Unknown `/home/:service` → `/home` → `/home/house`; the older `/services/:service` URLs redirect to `/home/:service`. The hero is a **fixed height on desktop** (`HERO_HEIGHT` 700 at md / 600 at lg+) with per-breakpoint line clamps on title/lead/highlights and a fixed hero-media height, so every service's hero is exactly the same height (verified 900/1024/1200/1440 px in both languages, no clipping); on mobile it grows with its content. `CatalogImage` gained an optional `height` prop for slots that must line up. `MarketingLayout` resets its own scroll container on route change (it scrolls internally, so the browser doesn't reset it).
- Pages: `ProductsPage` (`/products`, card grid), `PortfolioPage` (`/portfolio`) — both share **`useCatalogQuery` + `CatalogToolbar`**: category toggles, a search box and pagination (`PAGE_SIZE` 6), all held in the URL (`?category=&q=&page=`) so any view is linkable; changing a filter resets to page 1 and a stale `?page=` clamps into range, `ProductDetailPage` (`/products/:slug`, specs table + CTA — house→`/` designer, others→`/contact`), `ProjectDetailPage` (**`/portfolio/:service/:slug`** — the category is in the path so the page can offer service-specific CTAs: house → `/design`, everything else → `/contact`, plus that service's home `/home/:service` and `/products?category=…`. `catalog/images.ts` `projectPath()` builds it, and `/portfolio/:slug` — plus any wrong category in the path — redirects to the canonical URL, so older links and the previous sitemap keep working). Wired in `App.tsx` under `MarketingLayout`; `SiteHeader` nav now points สินค้า→`/products`, ผลงาน→`/portfolio`; Home links updated. **The Admin entry is hidden from the header** (`SHOW_ADMIN_LINK = false` in `SiteHeader.tsx`, desktop button + mobile drawer) until sign-in carries real roles — flip it to a role check then; the `/admin` route itself still works by URL. Build + preview verified.
- ⚠️ **Portfolio from Facebook — decided 2026-09-06/07: unfurl the link, never scrape.** The owner posts finished jobs on a **personal profile**, which has no read API (Graph API covers Pages only), and scraping the page is against Meta's terms and breaks on markup changes and expiring photo URLs. What *does* work, measured against a real post on 2026-09-07: fetching the post URL server-side and reading its **Open Graph tags** — the same metadata Facebook publishes for link previews. Findings baked into `scripts/lib/facebook.mjs`: send **no browser User-Agent** (a Chrome UA gets HTTP 400; curl's default gets 200 + og tags); `og:description` is the caption **truncated at ~300 chars**; `og:image` is the **first photo only**, ~1000px wide on a short-lived signed fbcdn URL (download immediately, never hot-link); `og:title` is just the profile name, so a real title must still be typed. `scripts/import-from-post.mjs` chains it (`--kind community` files the post under public-benefit work instead of the portfolio): unfurl → download → downscale (`lib/image.mjs`, only ever DOWN — `sips -Z` upscales otherwise, measured 1066px→1600px at 3x the bytes) → upload to the `catalog` bucket → upsert a **draft** row (`published = false`) with `image_path` + `source_url`. **A job is usually documented across several posts**, so `projects.sources` (jsonb `[{url?,label?,caption?,images?}]`, migration `20260907180000`, `source_url` mirrors the first) holds them in order — **each update carries its own photos and words while the project around them (id/slug, title, year, category, cover) is shared**; the row's `images` is the union (cover first) so cards need no knowledge of sources. An update survives its link being cleared (`url` optional), and re-fetching a changed link ADDS its photo to that update while REPLACING its text: the editor lists them as **collapsible cards** (label + photo count on the closed row, so a long job stays reorderable) with per-card fetch, label, bilingual caption, its own photo strip, up/down reordering and delete; the shared block above holds only what the whole job shares — ids, title, year, category, the shared description, and which photo is the cover (chosen with "ตั้งเป็นปก" under any timeline photo, never a second combined gallery) — "ดึงข้อมูล" unfurls all of them (one photo each), and `ProjectDetailPage` renders them as a **timeline** — a single source still shows as one "ดูโพสต์ต้นฉบับ" button. Verified end-to-end on the owner's real post (`pai-chaloem-abt-sadiang`). An embedded FB post iframe was rejected: unstyleable, tracking cookies, and the text isn't indexable as ours.
- **Admin screens (products)** — `/admin/products` lists every product (cover, name, category, price, a **star for the category's best seller** with the same confirm-before-stealing-it dialog, publish switch, edit, delete) and `/admin/products/edit[/:id]` edits one: bilingual name/short description/price unit, price (blank = "สอบถามราคา"), a photo grid with click-to-set-cover, ⌘V paste and a dashed add tile, and a repeatable spec table. Calls live in `src/admin/productApi.ts`; the API enforces one best seller per category. `scripts/seed-products.mjs` pushes the bundled seed products (now 21) into Supabase and can generate a placeholder photo for each, at `products/<slug>-<content hash>.jpg`. Three sources, in descending order of how well they actually worked: **`--drawn-images`** renders a flat vector illustration of the product from `scripts/lib/draw-product.py` (a `DRAWINGS` map of slug → draw function over a shared room/palette, so the catalogue grid reads as a set); **`--web-images`** pulls a LoremFlickr stock photo; **`--mock-images`** writes a flat brand-colour card with the product name. Every generated image is captioned so it cannot be mistaken for real work.

⚠️ **Stock photos did not work for this catalogue and the drawings are the default for a reason.** For appliance keywords LoremFlickr returned a neon shopfront sign, a cat, a Renaissance painting and red padding; Wikimedia Commons has genuine appliance photos under free licences, but they carry competitors' brand marks (Panasonic, Fagor, Whirlpool, Zojirushi, Breville) — a rival's badge on our own catalogue card is worse than an obvious placeholder. ~~Two furniture items use hand-picked stock photos~~ — **replaced 2026-10-08.** `built-in-kitchen` and
`built-in-wardrobe` now use the drawn illustrations from `scripts/lib/draw-product.py` (the `kitchen` and
`wardrobe` functions already existed), uploaded as `products/<slug>-<hash>.jpg` with the row's `image_path`
/`images` repointed. **Why a drawing and not another photo:** no licence can be verified for an arbitrary
web image, and even a correctly-licensed stock photo is still someone else's kitchen shown as our product —
the same problem, legally tidier. There are **no furniture projects in the portfolio** (checked: 0 rows), so
the company has no photo of its own to use here yet. The drawings carry the pipeline's caption
("ภาพตัวอย่าง (วาดจำลอง) — <slug>") so they cannot be mistaken for real work. **The real fix is still a photo
of an actual job**; drop one in and the row can be repointed in a minute.
⚠️ **The old objects are deliberately left in the bucket**: the prerendered `og:image` for those two pages
still points at them until the next deploy, so deleting them now would break the share cards. Delete
`products/built-in-kitchen-c3f97352.jpg` and `products/built-in-wardrobe-55da6bbf.jpg` (and their `thumbs/`
copies) AFTER a redeploy has rebuilt the static HTML.

**Appliance / materials line added 2026-09-07** (all quote-only — per-model prices would go stale in the seed): `refrigerator`, `chest-freezer`, `washing-machine`, `microwave-oven`, `rice-cooker`, `electric-kettle`, `air-conditioner`, `electric-car` (electronics), `bed-frame` (furniture), `steel-sections` (filed under `contracting` because the catalogue has **no building-materials category** — that mismatch is open, and a 6th `materials` category is the fix if more materials get sold).
- **Admin screens (portfolio)** — `/admin/portfolio` (`AdminPortfolioListPage`) is the list: cover thumbnail, title, category, year, photo count, publish switch, and links to the public page, the original post, the editor and delete. `/admin/portfolio/edit` (`AdminPortfolioEditPage`) adds one and `/admin/portfolio/edit/:id` edits one — **rows are addressed by their uuid, never by slug**, so the slug is editable at any time (migration `20260907170000` makes it nullable: blank means the site uses the id in the URL, via `projectRef()`). Shared calls live in `src/admin/portfolioApi.ts`. New items default to **published**, this Buddhist year (`buddhistYear()` — Facebook publishes no post date, verified), province เพชรบูรณ์, and a `<category>-<running number>` working title; the bilingual fields are laid out Thai-left / English-right, and the photo area shows a click-to-upload dropzone when empty. Paste a post link → "ดึงข้อมูล" prefills the caption and photo (several links, one per line, pull one photo each) → fill in the rest → save as draft or publish. The list also has a **star per row: the one featured project of its category** — the API clears the previous one so the rule can't be broken by two tabs, and taking the star from another project asks for confirmation first (starring an empty category, or unstarring, is immediate). Pasting an image (⌘V) uploads it into the update last clicked — the listener is on the window, because a `paste` with nothing focused never reaches a plain div. The list has a publish switch, a link to the original post, **edit** (loads the row back into the form — the slug is locked there, since upsert matches on it and renaming would create a second row; the photo already in Storage is kept unless a new one is fetched) and delete (which also removes the image from the bucket). **Multiple photos per project**: `projects.images text[]` (migration `20260907160000`, cover first; `image_path` mirrors `images[0]` so older readers keep working) — the admin form uploads any number of files straight into `portfolio/<slug>/…` in the bucket (`POST /api/upload`, base64 so the dev handler needs no multipart parser), shows them as a grid with "ตั้งเป็นปก" and delete, and a photo pulled from the Facebook post is added to the same gallery. `catalog/images.ts` `projectImagePaths()` returns the gallery (falling back to the single cover), and `src/ui/ImageGallery.tsx` renders cover + thumbnail strip + a lightbox with arrow-key/prev/next navigation on the project page. **The slug is optional**: left blank it is derived from the post id (`post-<id>`), or a random `project-<id>` when there is no link — nobody has to invent a URL to save a draft. Valid categories are the database's CHECK constraint rather than a list copied into the API, so adding one only needs a migration.
- **Listing screens: list / grid, and starred rows pinned (2026-10-07).** `/admin/products`, `/admin/portfolio`
  and `/admin/community` each switch between the table and a card grid from a toggle beside the filters. The
  choice is stored **per screen** (`cg:admin-view:<products|portfolio|community>`, read/written in try/catch —
  blocked site data throws rather than returning null), because the right answer differs by content: portfolio
  work is recognised by its photo, products are scanned by name and price. `list` stays the default.
  `src/admin/AdminGridCard.tsx` is a **shell with slots**, not a card per screen — the two row types carry
  different fields but identical chrome, and two copies would drift the first time one screen gained a button;
  for the same reason each page defines its star button and row actions once and both views render them.
  Every picture is an aspect-ratio box the image fills (identical whatever the photo's proportions), and the
  title and chip rows have **reserved heights** so cards match across rows, not only within one.
  Rows with the star (`best_seller` / `featured`) sort to the top — they are what each service home page leads
  with, so they are the rows most often checked. Sorted after filtering, and `Array.sort` is stable, so
  everything else keeps the API's order; community has no star and is left alone. Matches how the public
  `/portfolio` listing already orders items.
- **Photos without a post link (fixed 2026-09-07).** Uploads used to go only through a timeline entry, and the loose-photo section was hidden whenever it was empty — i.e. exactly when someone needed it — so a job with no Facebook post had nowhere to put a photo, and a paste with no card focused was refused. "รูปของงาน (ไม่ผูกกับอัปเดต)" is now always shown with its own dashed + tile, a paste with no card focused lands there, and the upload toast says to press save: **the file reaches Storage immediately but the row only learns about it on save**, so an upload followed by leaving the page looked like a failed upload when the photo was really sitting unreferenced in the bucket.
- **`/portfolio` lists starred work first.** The star already picked a category's featured project but the listing ignored it, and at `PAGE_SIZE` 6 a starred item could land on page 3. `PortfolioPage` sorts the filtered array by `featured` (stable sort, so everything else keeps its order).
- **A lone update's photos (fixed 2026-09-07).** One source collapses to a single "ดูโพสต์ต้นฉบับ" button rather than a one-entry timeline, but `ProjectDetailPage`'s loose-photo filter excluded photos belonging to ANY source, including that un-rendered one — a job posted about once showed its cover and nothing else. The filter now excludes only photos of a timeline entry that actually renders.
  - **No access control yet, and development-only, by explicit decision (2026-09-07).** The browser can't fetch facebook.com (no CORS) or hold the service-role key, so the endpoints live in `vite-dev-api.mts` — a Vite plugin with `apply: 'serve'`, i.e. they exist only while `pnpm run dev` runs on the owner's machine; the key stays in the dev process and never reaches the bundle. `/api/unfurl`, `GET|POST /api/projects`, `PATCH|DELETE /api/projects/:slug`. The page says all of this in a banner. **The `/admin/portfolio` route AND the page's dynamic import are both gated behind `import.meta.env.DEV` in `App.tsx`** (fixed 2026-09-07) — statically `false` in a production build, so Rollup drops the AdminPortfolioPage chunk and its `/api/*` calls entirely and the URL falls through to the catch-all redirect on the deployed site. Verified: a prod `dist/` contains no `AdminPortfolioPage` chunk and no `/api/unfurl`/`/api/projects` string, while `/admin` (leads) still ships. **Before this ships publicly it needs staff auth**: move the handlers to `supabase/functions/import-post`, gate on the caller's role, and only then re-expose the route in prod.

**✅ Mobile pass — DONE (2026-09-07).** The site was built desktop-first and every listing stacked one
full-width card per row below 600px: `/home/house` ran **8,327px at 375px — 10.3 full screens** before the
footer. It is now **4,356px (5.4 screens)**, with nothing above the `md` breakpoint changed (verified at
1280px: services 4 columns, models/work 3, all still `grid`, no horizontal overflow).
- **`RAIL_SX` / `RAIL_CARD_SX`** (`HomePage.tsx`) — a row of cards that is a `grid` on desktop and a
  scroll-snapped, swipeable **rail** on a phone, used by the featured products, featured models, portfolio
  and community sections. The rail bleeds to the screen edge (`mx: -3; px: 3`) so the next card peeks rather
  than looking cut off. A two-column grid was tried first and rejected: three cards left one alone on the
  last row, which reads as a broken layout rather than as "that is all of them".
- **Listing pages go two-up on a phone** (`/products`, `/portfolio`, `/community`, and the About value
  cards). `sm` and `md` are untouched — `sm` was already two columns.
- **About** — the CEO portrait leads on a phone: full width, 4:5, with the name and title set over the
  bottom of the photo. It had been capped at 260px to save height, which left the face of the company as a
  small square adrift in the column. The four value cards pay for it (icon beside the title at 28px), and
  the intro drops to 23px/14.5px.
- **⚠️ Thai text clamping gotcha.** `-webkit-line-clamp` at exactly N line-heights leaves the **tone marks
  and upper vowels of the next line poking through the cut**, because they sit well above their baseline.
  Every clamp on the site therefore sets a `maxHeight` a few pixels SHORT of the line boundary
  (e.g. `lineHeight: 1.6` with `maxHeight: '2.85em'` for two lines, not `3.2em`). Measured, not guessed —
  44.8px bled, 40px did not.
- **`joinMeta`** (`src/catalog/meta.ts`) — the "location · year · area" line. Building it with a literal
  `·` left the separator behind when a field was empty: community items carry no province and rendered
  "· 2569"; two imported jobs have no year and rendered "เพชรบูรณ์ ·".
- Footer links were 20px tall; they get vertical padding on touch widths only (32–45px measured).

**✅ Phase 3.4 / 3.5 — DONE (2026-09-13): real auth and a production back office.**
The admin screens ship to the deployed site and staff sign in to use them. The dev-only
`vite-dev-api.mts` is no longer the back end.

- **`src/auth/AuthProvider.tsx` is Supabase Auth**, not the localStorage mock. It exposes `user`
  (anyone signed in — still what gates the designer's download/upload/send-to-team), `role` read from
  `public.profiles`, `isStaff`, and a `loading` flag. **`loading` matters**: without waiting for the
  first `getSession()` a page reload bounces a signed-in admin straight back to the login screen.
  `onAuthStateChange` keeps tabs in step and picks up token refreshes.
- **`src/admin/AdminGuard.tsx`** wraps every `/admin/*` route at the layout level, so a new admin
  screen cannot be added unprotected. Three distinct states — still checking / signed out / signed in
  with no role — because conflating them makes the area impossible to debug. Signed out **redirects
  straight to `/login?next=<path>`** (`replace`, so Back leaves the admin area rather than bouncing);
  `next` carries path + query, so a deep link like `/admin/products/edit/<id>` survives the sign-in and
  lands back on that record. Signed in with no role still gets a card, not a redirect — being unknown
  to the system and being unapproved are different problems and must not look alike.
- **The admin talks to Supabase directly** (`src/admin/client.ts`), as the signed-in user. There is no
  admin server and that is the point: every policy already routes through `public.is_staff()`, so a
  middle tier would add a second place to get authorisation wrong without adding a check. Uploads go
  browser → Storage, resized to 1600px with a canvas first (downscale-only; phone photos are 3–8 MB
  against a 10 MB bucket cap).
- **`/admin/messages`** is new, and is why this phase mattered: `contact_messages` and `leads` are
  staff-read-only, and with no staff account **a message that arrived was stored correctly and seen by
  nobody**. The screen lists both, flags unanswered messages, and toggles `handled`.
- **Two sign-in pages, deliberately apart (2026-10-03).** `/login` is the customer one (the designer's
  save / download / send-to-team gate); **`/admin/login`** is staff-only, with no sign-up and no social
  buttons, and `AdminGuard` sends signed-out visitors there. Its route sits OUTSIDE the guard — inside,
  the guard would redirect to a page it is itself guarding. ⚠️ **Separate pages, NOT separate accounts**:
  both authenticate against the same Supabase Auth pool, and what keeps a customer out of the back office
  is their profile having no role (`is_staff()` in RLS). Signing in at `/admin/login` with a customer
  account says so on the page rather than failing opaquely.
- **Customer sign-up — `/login` (2026-10-03).** Sign-in and sign-up in one form; a customer account
  unlocks only the designer's save / download / send-to-team actions and carries no role, so it can
  never reach `/admin`. Three details that are easy to get wrong:
  - With confirmation on, `signUp` returns a user but **no session** — the form must say "check your
    inbox", not behave as if the person is signed in. The whole form is replaced by that panel, so a
    second submit cannot fire a second e-mail.
  - **Supabase will not reveal that an address is already registered**: it answers with a user whose
    `identities` array is empty, which looks identical to a fresh sign-up. That privacy property is kept
    — the message is the same either way — so the form cannot be used to enumerate accounts.
  - The confirmation link returns to `/login?confirmed=1`, which must also be on Supabase's redirect
    allow-list or it bounces to the project's Site URL.

  ⚠️ **SMTP is the blocker, and it is live.** `mailer_autoconfirm = false` and the project still uses
  Supabase's built-in sender: a real sign-up attempt on 2026-10-03 returned **`email rate limit
  exceeded`**. Until a real SMTP provider is configured, sign-up is unusable in production. **Resend
  needs a verified sending domain and this site has none** (it runs on `thai-dd.pages.dev`), so the
  option that works today is **SendGrid Single Sender Verification**, which verifies one plain address
  with no domain — `smtp.sendgrid.net:587`, username literally `apikey`, password = the API key.
  Deliverability from an unauthenticated sender is poor (expect spam folders); a custom domain remains
  the real fix.
- **`/login` performs a real sign-in.** Sign-up, password reset and the Google/Facebook buttons were
  deleted rather than left as decoration: **accounts are created by an administrator** in the Supabase
  dashboard, who then grants a role in SQL, so self-service sign-up could only ever produce an account
  that can do nothing. The header's Admin link is now `isStaff` rather than a hardcoded `false`.
- **Facebook import stays on the owner's machine.** A browser cannot fetch facebook.com (CORS), so
  `/api/unfurl` in `vite-dev-api.mts` remains the only server-side piece; `unfurlAvailable`
  (`import.meta.env.DEV`) disables the two fetch buttons everywhere else and says why. Everything
  else — text, photos from the device, publishing — works on the deployed site.

**Verified against the live database, not just the UI**: signed out, `/admin` shows the sign-in prompt;
as staff, the message the contact form stored on 2026-09-06 is readable and a publish toggle round-trips;
as a signed-in user with **no** role, `select` on `contact_messages` returns `[]`, `insert` into
`projects` is refused `42501`, and an upload to the `catalog` bucket is refused 403. `pnpm run build`
ships the admin chunks (largest 31 kB) with no `service_role` string in the bundle.

**Dashboard — `/admin` (2026-10-03), phase 1 of 2.** Replaces the module-card home page (deleted; the
sidebar now does that navigation). Counts come from `src/admin/statsApi.ts` as `head: true` COUNT queries
— ten totals transfer no rows, where fetching and counting in JS would grow with the catalogue and push
the work onto a phone. The "ต้องจัดการ" box leads, before the raw totals: a dashboard that opens with
counts makes you hunt for the one number that is actually a task. A project is `kind <> 'community'`
rather than `kind = 'project'`, because rows created before that column existed have it NULL.

The **GA4 card is now live** — see "GA4 dashboard stats" below. (It was a placeholder until 2026-10-07
because `VITE_GA_ID` was unset and reading the Data API needs a server-held key; both are resolved.)

**Back-office sidebar — `src/admin/AdminLayout.tsx` (2026-10-03).** Every `/admin` screen sits beside a
collapsible left nav. Two components by width, deliberately: a **permanent** drawer on `md`+ that shrinks
to a 64px icon rail (names move into tooltips, since an icon alone says nothing), and a normal overlay
below that, opened from a floating button — a rail would eat a fifth of a 375px screen and still not be
readable. Collapsed state persists in `cg:admin-nav-collapsed`, inside try/catch because blocked storage
throws. `src/admin/modules.tsx` holds the one list both the sidebar and the admin home page read, so a
new screen appears in both or neither. `activeModule()` matches **longest-prefix**: every admin path
starts with `/admin`, so a plain `startsWith` would light up the dashboard on every screen.

**Role management — `/admin/users`, migration `20260913140000_admin_manages_roles.sql`.** Adding or
removing a staff member is a screen, not a SQL edit. Two things are deliberately NOT in the migration:
who works here (an employee's e-mail in a migration is committed to git forever and replayed into every
environment, and a new hire would mean a code change and a redeploy), and the first admin — only an
admin can appoint one, so that single grant stays manual:

    update public.profiles set role = 'admin' where email = 'you@example.com';

⚠️ **`profiles` had a SELECT policy and nothing else**, so an UPDATE matched zero rows and PostgREST
answered **200 with an empty body** — a silent no-op that looks exactly like success. `setRole` therefore
treats an empty result as a failure and names the migration in the message; without that check the
screen would have reported success for a change that never happened. `profiles_admin_update` also
refuses `id = auth.uid()`: a sole admin demoting themselves would lock every human out of role
management permanently, recoverable only with the service key.

**Still open:** `/admin/leads` is the legacy localStorage table, superseded by `/admin/messages`;
nothing notifies anyone when a message arrives — see the LINE Messaging API plan discussed 2026-09-13
(LINE Notify itself shut down 2025-03-31 and is not an option).

**🚀 Phase 2.5 — Deploy to Cloudflare Pages (2026-09-06).** Ship the marketing site publicly *before*
starting Phase 3, so the DB work happens against a real deployment.

- **Host: Cloudflare Pages** (chosen by the user). Static build, no server. Recommended wiring is Pages'
  **Git integration** (Dashboard → Workers & Pages → Create → connect the GitHub repo): build command
  `pnpm run build`, output dir `dist`, production branch `main`. No API token in the repo, and every branch
  gets a preview URL for free. A GitHub Actions deploy workflow is the alternative if the repo must stay
  disconnected — it needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets.
- **`public/_redirects`** — the one thing that actually blocks a deploy. `BrowserRouter` uses real paths, so
  without a `/* /index.html 200` rewrite every URL except `/` 404s on refresh or when shared. Note
  `pnpm run preview` does this fallback on its own, so the bug is invisible locally — it only appears on the
  host. The file also maps `/version` → `/version.json`.
- **`/version`** — `vite.config.ts` emits `dist/version.json` (`{version, sha, built_at}`) at build time; sha
  comes from `CF_PAGES_COMMIT_SHA` / `GITHUB_SHA`, falling back to local git. Satisfies the global rule.
- **Build env vars** (Pages → Settings → Environment variables; see `.env.example`):
  `SITE_URL` = the canonical origin, used by `scripts/generate-seo-files.mjs` (robots/sitemap) *and* by the
  og:url/og:image tags. It **falls back to Cloudflare's own `CF_PAGES_URL`**, so a Pages build is
  self-configuring and needs no variable set; with neither, sitemap and og:url/og:image are skipped rather
  than guessed. `CF_PAGES_URL` is the *deployment's* URL (`https://<hash>.<project>.pages.dev`, a new hash
  every build), so on a production build the deployment label is stripped to reach the stable
  `<project>.pages.dev` — otherwise the sitemap advertises 25 URLs that go stale on the next deploy.
  Workers Builds (the dashboard's newer "Create an app" flow) has **no** URL variable at all, so `SITE_URL`
  must be set by hand there; it does provide `WORKERS_CI_BRANCH` / `WORKERS_CI_COMMIT_SHA`, which the build
  reads alongside the `CF_PAGES_*` pair. `wrangler.jsonc` is committed for that flow — an assets-only Worker
  whose `not_found_handling: "single-page-application"` is the Workers equivalent of `_redirects`. `VITE_GA_ID` = GA4 measurement ID, production only.
- **Domain decision (2026-09-06):** no custom domain is being bought soon, so the site launches on
  `<project>.pages.dev` **and is indexed there** (the user's call, knowing that those URLs will later compete
  with a real domain and need redirects/canonicals when one arrives).
- **Preview deployments are not indexed.** Every branch push on Pages is published at its own public
  `<hash>.<project>.pages.dev`; indexing those would make the site compete with copies of itself. A build
  whose `CF_PAGES_BRANCH` is not `main` gets `robots.txt` = `Disallow: /`, no sitemap, and a
  `<meta name="robots" content="noindex, nofollow">` (robots.txt alone doesn't stop a crawler that already
  has the URL from a link). A local or GitHub Actions build has no `CF_PAGES_BRANCH` and is treated as
  production, so `pnpm run build` keeps behaving normally. Verified by building all three cases.
- **GA4** — `src/analytics/ga.ts` + `RouteAnalytics` (mounted in `App`). Loads gtag.js only when `VITE_GA_ID`
  is set, so dev/preview traffic never reaches the company's property. Uses `send_page_view: false` plus an
  explicit `page_view` per route change, because GA's automatic page view fires once per script load and
  would report an entire SPA session as a single page.
- **Share tags** — og/twitter tags injected into `index.html` at build. They are **site-wide, not per route**:
  a crawler that doesn't run JS only ever sees that one file. Per-page cards need prerendering (below).

**LIVE since 2026-09-06: https://thai-dd.pages.dev** (Cloudflare Pages, Git integration, production branch
`main`). Verified against the deployed site: every route returns 200 on a direct request (the `_redirects`
proof), `/version` and `/version.json` both serve `{version:"main", sha, built_at}`, `robots.txt` allows
indexing, `sitemap.xml` has 25 URLs, og/twitter tags are present, the home page loads ~215 kB of JS with no
three.js, and GA is inert (no `VITE_GA_ID` set yet).

**Accepted risks — the user decided to launch with these known-broken (2026-09-06), traffic being ~zero:**
- **Prices on the site are placeholders.** `products.ts` (฿432k–฿972k) and the per-sqm rates in
  `pricing/config.ts` are invented numbers shown to customers with no disclaimer.
- **Every form is a dead end.** `/contact` and `LeadFormDialog` write to the *visitor's own* localStorage and
  then say "ส่งเรียบร้อย ทีมงานจะติดต่อกลับ". Nothing reaches the team. Phase 3's backend is the fix.
- **`/admin` is public and unguarded** (no auth check in `AdminPage`), and the header links to it for
  everyone; `/login` is a non-functional mock. robots.txt disallows both, which stops indexing, not access.

**Code-splitting — DONE (2026-09-06).** Routes are `React.lazy` (only `HomePage` stays eager, since `/`
redirects to it), each layout wraps its `<Outlet/>` in `<Suspense fallback={<RouteFallback/>}>`, and
`Scene3D` is lazy *inside* `DesignerPage` so three.js/r3f/drei only downloads when someone actually opens the
3D view. Measured on the built site: the marketing home went from **480 kB → 212 kB** of JS (encoded, 12
files) with no three.js at all; `/design` is 233 kB, and the 231 kB `Scene3D` chunk arrives on the 3D toggle.
`src/ui/RouteFallback.tsx` holds the spinner — it must NOT live in `App.tsx`, which imports the layouts that
use it (import cycle).

**Still open after this phase:** per-route `<title>`/meta/OG (needs prerender or SSG) · a real 1200×630 share
image (`brand/logo-shield.png` is 540×515 and will be cropped) · a PDPA cookie-consent banner before GA4 counts as compliant · custom domain + DNS.

**🔨 Phase 3 — IN PROGRESS: real backend (Supabase) + admin for catalog content.** Schema/RLS/repositories/Storage + a dev-only portfolio import have landed on `feat/supabase-catalog-admin` (see Current state); real auth and the production admin UI are still pending.

**Decision (2026-09-06, reverses the earlier "separate repo" note): the admin stays in THIS repo**, as a
self-contained `src/admin/` folder behind lazy-loaded `/admin/*` routes. Reasons: `Product` / `Project` /
`Localized` / `CATEGORY_META` are shared with the marketing pages and would immediately need a versioned
shared package if split; splitting gives **no** security benefit (the admin bundle is client-side either
way — the real gate is Supabase Auth + RLS on the server); one repo = one deploy, one pipeline, one
migration history for a team this size. Keep `src/admin/` free of imports *from* marketing pages (one-way
dependency: admin → catalog/types, never the reverse) so a future split stays cheap.
*Split later only when:* another team owns admin, it needs its own release cycle, or it must sit on a
separate domain / behind VPN.

**Order matters — backend first.** Products today are a hardcoded seed (`src/catalog/products.ts`) and every
"backend" is localStorage. An admin written against localStorage would only edit data in the editor's own
browser; site visitors would see nothing. So:

**3.0 — Hosting + cost (decided 2026-09-06).** Supabase Free for dev/staging, **Pro ($25/mo) for production**
once the site goes live. Free tier gives 500 MB DB / 1 GB storage / 5 GB egress / 50k MAU / 2 projects —
all far above what ~16 catalog rows and their photos need. Its two real problems are **auto-pause after
1 week of inactivity** (a quiet marketing site WILL hit this, and every page that reads the catalog then
errors) and **no backups** (the `leads` table is real customer contact data). Both are patched with cron,
so free tier can carry us until launch:
- `.github/workflows/supabase-keepalive.yml` — **written (2026-09-06)**: daily 03:00 UTC `select 1` so the
  project never idles into a pause. Runs in a pinned `postgres:17-alpine` container so the client version
  never has to be guessed.
- `.github/workflows/supabase-backup.yml` — **written (2026-09-06)**: daily 18:00 UTC `pg_dump --schema=public
  --format=custom`, uploaded as a workflow artifact with 90-day retention (GitHub's max). It restores the
  DATA, not Supabase's `auth` users — those need Supabase's own tooling. It also fails on a dump < 1 KB,
  because a "successful" backup of nothing is the failure mode that goes unnoticed for months.
- Both read `SUPABASE_DB_URL` from a repo secret. **Missing secret → warning + skip; a broken/failed
  connection → hard failure.** The distinction is deliberate: "not set up yet" and "set up but broken" must
  not look the same in the Actions log. The cost of the warning path is that a skipped keepalive is quiet —
  so after creating the Supabase project, set the secret and confirm one green run of each workflow.
- **Both workflows only start running once they are on the default branch** (GitHub schedules cron from
  there, not from a feature branch).
- ⚠️ This keeps a free project *alive*, it does not buy an SLA. Move to Pro the moment downtime costs a
  real customer.
- **SQL client access (DBeaver / pgAdmin / TablePlus):** Supabase is plain Postgres — connect with the
  Postgres driver, `db.<project-ref>.supabase.co:5432`, db `postgres`, user `postgres`, **SSL required**.
  Direct connection is **IPv6-only** unless the IPv4 add-on is bought; on an IPv4-only network use the
  session pooler instead (`aws-<region>.pooler.supabase.com:5432`, user **`postgres.<project-ref>`**).
  Never use port 6543 (transaction mode) from a GUI client — no prepared statements. Note that connecting
  as `postgres` **bypasses RLS entirely**, so 3.6's RLS verification must NOT be done through a SQL client.

**3.1 — Supabase project + schema.** Tables mirroring the existing types (bilingual columns as `jsonb`
`{th,en}` so `Localized` maps 1:1):
- `products` — `id uuid pk`, `slug text unique`, `category text check in (house|electronics|furniture|rental|contracting)`,
  `name jsonb`, `short_desc jsonb`, `price_from numeric null`, `price_unit jsonb null`, `specs jsonb`
  (array of `{label,value}`), `featured bool`, `sort_order int`, `published bool default false`,
  `image_path text null`, `created_at`/`updated_at timestamptz`.
- `projects` — same shape as `Project`: `slug`, `title jsonb`, `location jsonb`, `year text`, `category`,
  `area text null`, `description jsonb`, `featured bool`, `published bool`, `image_path text null`.
- `leads` — flatten `Lead`: contact columns + `status text`, `plan jsonb` (frozen `DrawingState`),
  `grade text`, `estimate jsonb`, `created_at`.
- `contact_messages` — replaces localStorage `cg:contact-messages`.
- `price_config` — single row replacing `cg:price-config`, so pricing stops being per-browser.
- `profiles` — `id uuid` (= `auth.users.id`), `role text check in (admin|staff)`. Role lives in a table, not
  in client state.

**3.2 — RLS (this is the actual security boundary).**
- `products` / `projects`: `select` to `anon` **only where `published = true`**; all writes require
  `exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'))`.
- `leads` / `contact_messages`: `insert` allowed to `anon` (public forms), `select`/`update` admin-only —
  otherwise anyone could read every customer's phone number.
- `price_config`: public `select`, admin-only `update`.
- Storage bucket `catalog` (public read, admin write) replaces the `public/products/<slug>.jpg` convention;
  `SmartImage` gains a Supabase-URL path and keeps the local-file fallback.

**3.3 — Repositories (same async pattern as `LeadRepository`).** `src/catalog/repository.ts`:
```ts
interface ProductRepository {
  list(opts?: { category?: ProductCategory; includeUnpublished?: boolean }): Promise<Product[]>
  get(slug: string): Promise<Product | null>
  create(input: Omit<Product, 'id'>): Promise<Product>
  update(id: string, patch: Partial<Omit<Product, 'id'>>): Promise<Product>
  remove(id: string): Promise<void>
}
```
Plus `ProjectRepository` (identical shape over `Project`). Ship **two** implementations: `SeedProductRepository`
(wraps today's static arrays, read-only — keeps the site working with no Supabase config) and
`SupabaseProductRepository`, selected by whether `VITE_SUPABASE_URL` is set. Marketing pages switch from
importing `PRODUCTS` directly to reading through the repo — that refactor is the whole point and must land
before any admin UI.

**3.4 — Real auth.** Replace the mock `src/auth/AuthProvider.tsx` (localStorage `cg:session`) with Supabase
Auth: email+password (Google/Facebook later — the `/login` buttons already exist as visuals). `requireAuth`
keeps its current call sites; add `useRole()` reading `profiles`. Sign-up must NOT self-assign a role —
roles are granted by an existing admin or directly in the DB.

**3.5 — Admin UI (`src/admin/`, lazy-loaded).**
- Routes: `/admin` (dashboard) · `/admin/products` (table: search + category filter + published toggle) ·
  `/admin/products/new` · `/admin/products/:id` (bilingual form — TH/EN tabs per field, specs repeater,
  image upload, publish switch) · `/admin/projects/*` (same) · `/admin/leads` (the current `AdminPage` table,
  moved) · `/admin/pricing` (edit `price_config` — finally kills the placeholder rates being per-browser).
- `AdminGuard` component: redirect to `/login` when signed out, show "no access" when role is missing.
  Client-side guard is UX only — RLS is what actually enforces it.
- All of `src/admin/*` behind `React.lazy` + `Suspense` so the marketing bundle doesn't grow (main chunk is
  already ~1.68 MB / 490 kB gzip).

**3.6 — Verify before calling it done.** `pnpm run build` + `pnpm run lint`; create/edit/publish a product in
admin and confirm it appears on `/products` in a **signed-out** browser; confirm a signed-out client cannot
`select` an unpublished row or any lead (test against the API directly, not through the UI).

**Open questions (ask, do not guess):** who hosts Supabase (company account vs dev account); whether product
prices shown publicly are final or "from" figures; whether `AdminPage`'s existing localStorage leads need
migrating into Supabase or can be dropped.

**Business (stated by user):** CG's main line is **knock-down / prefab houses**; secondary lines are **electronics** and **furniture**; also **construction-equipment rental**; and **general contracting** (`contracting` category — งานรับเหมาทั่วไป, e.g. fiber-optic cabling, electrical systems, added 2026-09-07). The public site must present these.

**`contracting` category (added 2026-09-07):** a 5th `ProductCategory` — teal `#0F6E56`, `EngineeringIcon`, label `mkt.home.svc5`. Wired through `types.ts`, `categories.tsx` (`CATEGORY_META` + `PRODUCT_CATEGORIES`), `HomePage` services array (5th card — the `md:repeat(4,1fr)` grid wraps it to a 2nd row), and the `mkt.home.svc5`/`mkt.service.contracting` i18n (th+en). Seed content: 2 quote-only products (`fiber-optic-cabling` — best seller, `electrical-systems`) + 1 project (`fiber-cabling-udon`). DB CHECK constraints widened by `supabase/migrations/20260907140000_add_contracting_category.sql`. Verified on `/home/contracting` and `/products?category=contracting` (tsc -b clean, no console errors).

**Key decisions:**
- **Keep the plan designer at `/`** (the tool stays the landing page). The marketing Home lives at a separate route (e.g. `/home`); nav links between them.
- **The admin back-office stays in THIS repo** (decided 2026-09-06, reversing the earlier separate-repo note) — isolated under `src/admin/`, lazy-loaded `/admin/*` routes, one-way dependency admin → catalog. See Phase 3 for the rationale and the split-later triggers. (`AdminPage` at `/admin` is the legacy leads table; it moves to `/admin/leads`.)
- Marketing content bilingual via i18n / `{th,en}` data fields; content stored through async repositories (localStorage now, swappable to a backend later), same pattern as `LeadRepository`.

**Planned public pages / sections:**
- **Home** (marketing) — hero + CTA to `/` designer, "what we do" service cards, featured products, featured portfolio, why-us + stats, testimonials, contact CTA, footer.
- **Products** (`/products`, `/products/:slug`) — categorized: knock-down house models / electronics / furniture / equipment rental; specs, price-from, images, "customize in the designer".
- **Portfolio** (`/portfolio`, `/portfolio/:slug`) — past projects (location, year, images, description).
- **About** (`/about`), **Contact** (`/contact`, reuse `LeadFormDialog` logic), optional **FAQ**.
- **MarketingLayout**: richer NavBar (+ mobile drawer) + Footer, replacing the current minimal AppBar for marketing routes.

**Planned data model:** `Product`, `Project`, `SiteContent`, `Testimonial`, `TeamMember`, `Faq` (+ repositories) — see the fuller breakdown discussed in-session.

**Cross-cutting flags:** SPA has weak SEO — marketing pages want prerender/SSG + per-route meta/OG; bundle already > 500 kB so lazy-load routes; real image hosting needs a backend; admin + gated actions need real auth (Supabase Auth chosen — Phase 3) — the `/login` page is currently a visual mock only.

## In progress — SVG 2D editor migration (spike/drawing-engine, uncommitted)
The 2D view is being moved off react-three-fiber onto a **pure-SVG vector renderer** so the on-screen plan and the (planned) PDF export share one code path and look identical — the reference being a siamplan.com construction set.
- **`src/sheet/`** (new):
  - `planSheetGeometry.ts` — pure helpers: `sheetBounds`, `planGrid` (structural grid axes → numbered ①②③ / lettered Ⓐ-Ⓔ bubbles), `dimensionChain`, `nodeDegrees`.
  - `PlanSheet.tsx` — the plan drawn as vector SVG (hollow mitered double-line walls via `computeWallOutlines`, door swing arcs / window glazing, fixtures, room name+area, grid bubbles, chained dimension runs). **Theme-aware** paper (follows dark/light via a `SheetPalette` from `useTheme().scene`); exposes `PRINT_SHEET_PALETTE` for a future black-on-white PDF. Accepts a controlled `viewBox` and `svgProps`. **Gotcha fixed:** `vector-effect:non-scaling-stroke` is NOT inherited from a `<g>` — it must sit on each stroked element, else `strokeWidth` is read in metres and walls balloon into a solid fill.
  - `PlanEditor.tsx` — interactive wrapper: owns pan (middle/Space-drag) + wheel-zoom-to-cursor `viewBox` state, converts pointer→world via the SVG CTM, and **reuses the existing `scene/useInteraction` state machine** (it was already pure). Overlays: node handles, rubber-band draft wall, snap ring, and a translucent **ghost preview** that follows the cursor for fixtures/openings/draw.
- **Wall types**: `src/drawing/wallTypes.ts` — `WALL_TYPES` (auto / exterior 0.2 / load-bearing 0.25 / interior 0.1 / partition 0.075). The draw tool (`tools.ts`) now carries `{ wallTypeId, thickness }`; `commitWall`/`addWall` accept an explicit `thickness`. Sidebar's old **Starter plans** list is replaced by a **Wall types** palette (templates still available in the gallery). `ItemPreview` gains `WallTypePreview`.
- `DesignerPage` now renders `PlanEditor` (not `DrawingCanvas`) in the plan view; the r3f `scene/` 2D components are currently unused but retained.
- `vite.config.ts` honours `PORT` env (autoPort dev servers).
- **Verified** (dev server, both themes): drawing, node handles, live grid+dimensions, ghost preview, wall-type palette, bottom toolbar, theme-following paper. `pnpm run build` passes.
- **TODO next**: (1) remove the right-panel Material-grade toggle → single estimate + a bottom-toolbar **material mode** where clicking a room assigns materials for a detailed per-area estimate (requested, not yet designed/built); (2) PDF A4 export (cover + plan + elevations + 3D snapshot + door/window schedule + BOQ) auto-download after design; (3) delete the now-dead r3f `scene/` 2D files once the SVG editor is signed off; (4) touch-device testing of the new pointer path.

## Admin user management — `/admin/users` + `functions/api/admin-users.ts` (2026-10-06)
Full staff account management from the back office, not just roles.
- **The privileged operations run in a Cloudflare Pages Function** (`functions/api/admin-users.ts`), because they need the Supabase **service_role** key which must never reach the browser. The browser calls `/api/admin-users` with the signed-in user's access token; the function verifies that token against GoTrue **and** that the caller is `role = 'admin'` in `profiles` (service_role read), then performs the action. Dependency-free (plain `fetch` to GoTrue + PostgREST). Ships with the Pages build — **no Supabase CLI / Docker** — the one manual step is setting `SUPABASE_SERVICE_ROLE_KEY` as a **Production secret** in Cloudflare Pages (it reuses the existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- Actions (email-only for passwords — nobody types another person's password): **invite** (`/auth/v1/invite`), **send set/reset-password email** (`/auth/v1/recover`, anon key), **change email** (`admin/users/{id}` with `email_confirm: true`), **change display name** (stored in auth `user_metadata.full_name`/`name`), plus the existing **role** change (straight to `profiles`, RLS-enforced). Invite/reset links `redirect_to` the site `/login` (the recovery landing). Needs SMTP — Brevo is already configured.
- **`src/admin/usersApi.ts`** adds `callAdmin()` (token-bearing POST), `listAuthUsers`, `inviteUser`, `sendPasswordReset`, `updateUserEmail`, `updateUserName`. **`src/pages/AdminUsersPage.tsx`**: name column, invite button, per-row menu (rename / change email / reset password), success snackbar.
- **Degrades gracefully**: if the function isn't deployed / the secret is unset, the page falls back to `listProfiles()` (list + role changes still work) and shows a warning explaining the Cloudflare secret step; the management buttons are disabled.
- ⚠️ **Assumes the Cloudflare *Pages* deployment** (Git integration, which reads `functions/`). The committed `wrangler.jsonc` assets-only Worker flow does NOT run Pages Functions — if the project is ever moved to that flow, `/api/admin-users` needs a Worker route instead.
- Cannot be verified from this environment (the page is behind `AdminGuard`/sign-in and the function needs the production secret); verify after deploy by signing in as admin.

## GA4 dashboard stats — `/admin` + `functions/api/ga-stats.ts` (2026-10-07)
Real visitor numbers on the back-office dashboard, replacing the honest placeholder card.
- **Tagging is done (item 1):** a GA4 property **"TDD Website"** (property id `557855535`, web stream
  `16057882667`, measurement id **`G-X71E2D3Z9G`**) collects from `thaidongdee.com`. `VITE_GA_ID` is set in
  Cloudflare Pages (Production) and verified in the live bundle. (The earlier auto-created "when-cookie-deram"
  property is orphaned — safe to delete.)
- **Reading the numbers (item 2) is a Cloudflare Pages Function**, same shape as `admin-users.ts`: the browser
  POSTs to `/api/ga-stats` with the signed-in user's access token, the function verifies it + `role='admin'`
  (service_role read), then calls the **GA4 Data API** as a Google **service account**. The service-account
  JWT is signed in-function with **WebCrypto** (`crypto.subtle`, RS256) and exchanged for an OAuth token — so
  the function stays dependency-free (no `google-auth-library`). It runs `runRealtimeReport` (active users) +
  two `runReport` totals (7 / 28 days: users / sessions / pageviews) + top pages + **top products by
  `itemName`/`itemsViewed`** (answers "which products do people look at", from our `view_item` events). The
  two breakdowns are best-effort (a wrong item-metric name can't blank the headline numbers).
- **`src/admin/gaApi.ts`** `loadGaStats()` returns `{configured:true, …}` or `{configured:false, reason}` —
  not-set-up is a normal state, not an error (only auth/Google failures throw), so the card shows three
  distinct states. **`src/pages/AdminDashboardPage.tsx`** `GaCard` renders live numbers, or names exactly
  which env var is still missing.
- **Manual deploy steps** (none are code): create a Google Cloud service account with the **Analytics Data
  API** enabled, grant it **Viewer** on the GA4 property (GA → Admin → Property access management), then set
  three Production env vars in Cloudflare Pages — `GA4_PROPERTY_ID=557855535`, `GA_SA_CLIENT_EMAIL`, and
  `GA_SA_PRIVATE_KEY` (a **secret**). Until all three are set the card says what's missing. Private key
  newlines may arrive as literal `\n`; the function normalises both.
- Same Pages-Functions caveat as admin-users: the committed `wrangler.jsonc` assets-only Worker flow does NOT
  run `functions/` — this assumes the Pages Git-integration deployment.
- **Local dev + always-on structure (2026-10-07).** Pages Functions don't run under `pnpm run dev`, so the
  card used to error with "no such dev endpoint" locally. `vite-dev-api.mts` now mirrors `/api/ga-stats`
  (signing the SA JWT with `node:crypto`, no auth check — localhost only): set the same three vars in
  `.env.local` and the local card shows real numbers. ⚠️ its `.env.local` parser allows **digits** in names
  (`GA4_PROPERTY_ID`) — the older `credentials()` parser's `[A-Z_]` would silently skip it. `GaCard` now
  **always renders its full structure** (the three metric boxes + the top-products section), filling "—" and
  a short note when GA is unreachable or unconfigured, instead of collapsing to a bare error — so it reads as
  a dashboard panel in every state.

## Current state
Phases 1, 2, 2.5 and the first half of Phase 3 are live on `main` — the Supabase schema/RLS/repositories, the catalog Storage bucket and the dev-only Facebook import merged via **PR #7** (`origin/main` tip `540c3b1`).

Current work sits on branch **`feat/tdd-catalog-and-admin`**, eight commits on top of `main`: the About page rewrite + work rail, the appliance/materials product line with its drawing pipeline, `--kind community` in the importer, starred-first portfolio ordering, and two admin/portfolio bug fixes (a lone update's photos, and uploading without a post link). Per NEVER MERGE a human opens and merges the PR.

**Home UI refinements + default-service change — branch `feat/auth-reset-password` (2026-10-06).** On top of the password-reset landing commit, a batch of home-page UX changes (opened as a PR for a human to merge):
- **Default service line is now `contracting`, not `house`.** `/`, `/home`, `/home/` 301→`/home/contracting` (`public/_redirects`), `App.tsx` `<Navigate>`, JSON-LD `url`, and the generic "go home" targets across LoginPage / ProfilePage / AdminGuard / AdminLoginPage / NotFoundPage. (The house line still lives at `/home/house`.)
- **FeaturedSection no longer special-cases house.** The `isHouseish` branch (iso-thumbnail "models" from `PLAN_TEMPLATES`) is gone — every line, house included, shows the same catalog-product grid; `FEATURED_IDS`/`models`/`RATE` removed. Cards are flex-column with the price pinned to the bottom (`mt:auto`) so prices align across a row, and the **short description was removed** (name + price only).
- **Prices show bare** (no "เริ่มต้น" prefix) in the home hero + featured grid (`priceLabel` in `HomePage`); "สอบถามราคา" still stands in for a null price.
- **PortfolioSection cards are per-card carousels** (`WorkCard.images: string[]` via `projectImagePaths`), reusing `ImageCarousel` like the hero. `ImageCarousel` gained a **`rounded` prop** (card-top images pass `rounded={false}`) and now **loops seamlessly forward**: a clone of the first slide is appended and the scroll jumps back to the real first slide on `scrollend` (with a 700 ms fallback), so it only ever scrolls one direction instead of snapping backward to wrap.
- **`SmartImage` shows a per-image loading skeleton** (shimmer until `onLoad`, then fade in; cached images detected via a ref so they don't stay faded out). Featured/Portfolio/Community grids also show **card skeletons while the catalogue is loading** (`CardSkeleton`/`CardSkeletonGrid` in `shared.tsx`; the image slot is an aspect-ratio box so it reserves the picture height — a bare `Skeleton` with `aspectRatio` collapses, see MEMORY.md).
- **ServicesSection** shows the small 2-line service label under each icon on every width (was desktop-only), matching `FloatingServiceBar`. **StatsSection** is 4-in-a-row on mobile too (was 2×2) with a top margin.
- **ServiceAreaSection leads with the map** (enlarged to 380/520, non-interactive, with an "เปิดใน Google Maps" button that deep-links to the Maps app). The **address sits in a small card overlaid on the map near the pin** (top-left), with a **copy-to-clipboard icon rendered inline at the end of the address** (`mkt.serviceArea.copy`/`copied`) so it stays attached to the text when it wraps. The **district paragraph stays as real body text below the map** (small/muted) — it is the only text carrying "เพชรบูรณ์" + the district keywords the local-SEO work relies on, and an overlay card is fine for SEO (crawlers read real text wherever it's positioned) but too small for the full list.
- **PortfolioSection carousel image slot is square (1:1)** on every width; `CardSkeleton`/`CardSkeletonGrid` take a `ratio` prop so the loading skeleton matches (square for portfolio, 16/9→4/3 elsewhere).
- Card grid gaps tightened `2 → 1.5`.
- ~~**Image delivery is still upload-time downscale only**~~ — superseded 2026-10-07: a 400px thumbnail is now written next to every upload and used by every card-sized slot (see the Storage section). There is still **no per-slot resize / WebP transform on serve**; Supabase Storage image transformations (`getPublicUrl(path,{transform})`) remain a paid-plan feature, so the sizes are the two fixed ones (1600px and 400px).

**Custom domain `thaidongdee.com` (bought on Cloudflare, 2026-10-07).** Canonical is now the apex `https://thaidongdee.com`; the static JSON-LD `url`/`logo`/`image` in `index.html` point there. Remaining steps are dashboard/DNS, NOT code:
- **Cloudflare Pages** → project → Custom domains → add `thaidongdee.com` (+ `www`, redirect www→apex). DNS is auto since the domain is on Cloudflare.
- **Pages env vars (Production)**: set `SITE_URL` **and** `VITE_SITE_URL` = `https://thaidongdee.com` → sitemap/robots/og:url and auth-email links switch to the real domain (until then they fall back to `CF_PAGES_URL` = pages.dev). Redeploy once.
- **Supabase** → Auth → URL Configuration: Site URL + add `https://thaidongdee.com/**` to Redirect URLs (keep pages.dev until cutover).
- **Email deliverability (the point of the domain):** Brevo → authenticate `thaidongdee.com` (add its DKIM/SPF/CNAME records to Cloudflare DNS) + add a **DMARC** TXT record; set Supabase SMTP sender to `no-reply@thaidongdee.com`. This is what moves mail out of spam.
- **Sender logo (BIMI)** needs DMARC at enforcement + an SVG logo + `default._bimi` TXT — a later phase, after DMARC is live.
- **SEO cutover**: the exact production host `thai-dd.pages.dev` 301-redirects to `thaidongdee.com` via **`functions/_middleware.ts`** (a Cloudflare Redirect Rule can't target `*.pages.dev` — that's Cloudflare's zone, not ours — so the redirect must come from the Pages app). It matches ONLY the exact prod host, so preview deployments keep working. ⚠️ Connect the custom domain to Pages BEFORE this is live, or pages.dev would redirect to a domain that isn't serving yet. Then add a Search Console property for `thaidongdee.com` (verify by DNS TXT).

### Hero is now an image-led banner — `src/pages/home/HeroBanner.tsx` (2026-10-08)
`/home/:service` opened with a two-column text block (`HeroSection`) and a picture beside it. For a
contractor the photos ARE the pitch, so the hero is a **photo slideshow with the copy set over it**:
eyebrow + headline, nothing else. **Full-bleed on a phone** (side margins waste the little width there
is) and **contained from `md`** — the same `maxWidth: 1180` + `px: 3` as `Wrap`, with rounded corners —
so the page keeps one left edge all the way down. ⚠️ The wrapper clips the corners, so `ImageCarousel`
is passed `rounded={false}`: two radii leave pale slivers at each corner.

- **`HeroSection` is kept, not deleted.** The two read differently (words-first vs work-first) and
  `HomePage` swaps between them in one place; the comment there lists exactly what to restore
  (`heroPlan`, `ctaTo`, and the fuller prop list), since both were removed as unused.
- **Reuses `ImageCarousel`** rather than a second slideshow — the scroll-snap track, forward-only loop
  and auto-advance already work there. Full-size images, not thumbnails: the slot is up to 600px tall.
- **No CTAs on the banner** (removed after review). With them gone the whole overlay stays
  `pointerEvents: none`, so the carousel underneath keeps its drag, arrows and dots with nothing to
  work around.
- **Two scrims, not one.** One gradient is not enough on a bright photo, and the slideshow changes the
  photo every 5.5s, so it must read on the brightest image in the set rather than an average one: a
  bottom-up wash (`0.92 → 0.75 → 0.35 → 0.08`) under the copy plus a left-to-right one
  (`0.60 → 0.30 → 0`) so the headline keeps its backing where the picture is pale.
- ⚠️ **Desktop height is capped against the viewport, not a flat number**:
  `min(540px, calc(100vh - 230px))` at `md`, `min(600px, …)` at `lg`; phones stay 320/380. The headline
  sits at the BOTTOM of the banner under ~230px of header + service strip, so a tall flat number **pushed
  the `h1` off a 768px-tall laptop entirely** — measured at 700px, it ended at y=889. The height was then
  tuned down by eye over several rounds to 540/600. The cap depends only on the
  viewport, so switching service lines still never changes the height (the reason `HERO_HEIGHT` was
  fixed in the first place).
- **The headline is still the page's `h1`** — the local-search phrase lives there and the
  "รับเหมา เพชรบูรณ์" work depends on it.
- **`HeroTrustStrip`** carries the three selling points below the banner rather than dropping them: they
  are real content from the `mkt.service.*` group. **Three columns at every width, phones included** —
  the type steps down (12.5/11.5px on `xs`) instead of the columns stacking, so it stays one glanceable
  row rather than three more things to scroll past.
- With no photos for a line, a flat category panel stands in, so the copy never lands on white.

**Home/marketing UI pass — branch `feat/marketing-home` (uncommitted working changes as of 2026-10-05).** `HomePage` was split into per-section components under `src/pages/home/` (`HeroSection`, `ServicesSection`, `FeaturedSection`, `PortfolioSection`, `CommunitySection`, `StatsSection`, `shared.tsx`). Changes this pass:
- **HeroSection** — mobile hierarchy is name/heading → image → buttons (via a `display:contents` wrapper whose children carry their own `order`; desktop keeps the plain 2-col block, so its stacking is unchanged). Primary/secondary CTAs sit on one row and split the width (`flex:1`) on mobile; both move to the bottom of the left column on desktop; the secondary button has a solid white fill (`background.paper`) over the grid hero. Long labels truncate with an ellipsis on one line (`ELLIPSIS` const + `minWidth:0`) instead of wrapping. Mobile top padding reduced (`pt:{xs:1.5}`). The best-seller **card/carousel fills the full section height on desktop** — the grid uses `alignItems:stretch`, the card is a flex column, and the media is absolutely positioned so its intrinsic image height can't inflate the auto grid track (see MEMORY.md). Chips (ขายดี / category) are overlaid on the image's top-left, not in the card frame.
- **`src/ui/ImageCarousel.tsx`** — the hero carousel's track is a native horizontal scroll-snap container, so it moves by trackpad/wheel/drag as well as arrows/dots/auto-advance; the active dot and auto-advance read the live scroll position.
- **FeaturedSection + PortfolioSection** now show **4 cards per row on desktop** (`repeat(4,1fr)`); `FEATURED_IDS` carries 4 house models, `catProducts` slices to 4, PortfolioSection `PAGE` = 8 (4×2). FeaturedSection product images are flatter on mobile (`CatalogImage` gained a responsive `ratio`, passed `16/9` on xs).
- **`src/pages/home/FloatingServiceBar.tsx`** (new) — a floating bottom category switcher mounted by `HomePage`: hides on scroll-down, reappears on scroll-up, hidden near the very top (`TOP_GUARD`), and needs ~90px of cumulative downward scroll to hide so it doesn't vanish on a nudge (`HIDE_AFTER`). Icons + 2-line-clamped labels; full-width bottom-nav on phones, compact centred bar on desktop. Scroll is tracked via a capture-phase `document` listener that ignores horizontal rails/carousels.
- **Header account menu** — `src/ui/AccountMenu.tsx` (new): a signed-in user shows a profile **avatar** in `SiteHeader` (the locally-saved photo, else the name/email initial), not the raw email. Clicking it opens: display name + email, **ตั้งค่าโปรไฟล์** (→ `/account`), **เข้าสู่หน้าผู้ดูแล** (only when `isStaff`), theme preference, and sign-out. The standalone theme gear shows only when signed out (theme lives in the account menu when signed in). The header's **Admin/back-office link was removed** (both toolbar and mobile drawer) per request — admins reach the back office from this menu instead; `/admin` is still reachable by URL and guarded by `AdminGuard`.
- **Profile settings page** — `src/pages/ProfilePage.tsx` at **`/account`** (under MarketingLayout; signed-out → `/login?next=/account`). Editable **display name, avatar (upload → center-cropped/downscaled to a 256px JPEG data-URL), address**; email is read-only (from auth); phone + Google/Facebook/LINE linking are shown but disabled (no backend yet). Persisted per-user in `localStorage` via `src/account/profileStore.ts` (same swappable pattern as leads/price-config; a `PROFILE_EVENT` lets the header avatar refresh live). A migration + storage bucket would replace the local store later.
- **Login page** (`src/pages/LoginPage.tsx`): added a **ลืมรหัสผ่าน?** link (calls `resetPassword` → `supabase.auth.resetPasswordForEmail`, new on `AuthProvider`) and **disabled** Google/Facebook/**LINE** social buttons (placeholders until the OAuth providers are configured). The staff→back-office hint was removed. ⚠️ A full password-reset LANDING page (handling the recovery token on `/login`) is still TODO; the request-reset half is wired.
- **Auth e-mail redirect** — sign-up confirmation + password-reset links now use `siteUrl()` (`src/supabase/client.ts`) = `VITE_SITE_URL` when set, else `window.location.origin` — so a sign-up started on a local dev server still points people at the real site, not `localhost`. Added `VITE_SITE_URL` to `.env.example`; must also be on Supabase's redirect allow-list. ⚠️ **Bilingual auth e-mails are a Supabase dashboard change, not code** — edit Auth → Email Templates to include TH + EN in the one template.
- SEO: per-route title/description via `src/seo/useSeo.ts` on products/portfolio/about/contact; `/portfolio` page size is 9.

**Done in Phase 3 so far:** 3.1 schema, 3.2 RLS, 3.3 repositories (`SupabaseProduct/ProjectRepository` + seed fallback + `CatalogProvider` — marketing pages no longer import `PRODUCTS`/`PROJECTS` directly), catalog Storage bucket + `imageUrl()`. **Still pending:** 3.4 real Supabase Auth (still the localStorage mock), the full admin UI (only the dev-only portfolio import exists — products/pricing/leads screens + `AdminGuard` + staff-auth gate not built), and 3.6 RLS verification against the live API.

Verification for the pushed branch: `tsc -b` clean, `oxlint` warnings-only (pre-existing fast-refresh `only-export-components`), rebased onto `origin/main` with no conflicts, `/home/contracting` + `/products?category=contracting` render with no console errors.

**Catalog content as of 2026-09-07:** 21 products and ~20 portfolio projects plus 9 community items, all imported from the owner's Facebook posts through `import-from-post.mjs`.

⚠️ **Two content caveats that need a human pass before launch.** (1) Facebook publishes no post date, so **year and province were defaulted to 2568 / เพชรบูรณ์ on roughly ten rows** — the site is currently displaying guessed values as fact. (2) Many captions are jokes, complaints, recruitment notices or donation appeals rather than descriptions of the work, so the descriptions on those rows were **written from the photo** rather than taken from the post; two captions were rejected outright as unusable on a company site. The source link is always kept, so the original text is one click away.

The app is a working bilingual, themed, MUI house-design tool with 2D editing, 3D massing, pricing, lead capture, a plan gallery with import/export, a marketing site (Home/Products/Portfolio/About/Contact, per-service home pages), and a visual login page. Next concrete steps: (1) open + merge the `feat/supabase-catalog-admin` PR, (2) **Phase 3.4/3.5** — real Supabase Auth + the production admin UI behind `AdminGuard` (move the dev import handlers to a `supabase/functions/import-post` Edge Function gated on staff role), (3) real pricing rates, (4) finish the remaining Chaiyaphum floor plans traced from the `.skp`, (5) per-route meta/OG via prerender/SSG.
