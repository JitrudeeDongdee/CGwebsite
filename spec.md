# CGwebsite — house-design plan drawing engine

## Architecture
- Vite + React 19 + react-three-fiber (three.js) SPA, TypeScript, oxlint.
- Package manager: **pnpm** (pinned via `packageManager` field, `pnpm-lock.yaml` committed). npm/yarn lockfiles must not be reintroduced.
- **MUI (Material-UI) is installed and in use** for all UI chrome (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`), driven by a custom theme. The r3f canvas layers are NOT MUI — they read theme colours via `useTheme().scene` (see Theming).
- **Routing**: `react-router-dom` v7 with two routes — `/` (Designer) and `/admin` (Leads back-office); unknown paths redirect to `/`. Mounted in `main.tsx` as `AppThemeProvider > BrowserRouter > App`.
- **i18n**: `i18next` + `react-i18next` + browser language detector. Two languages, **Thai (default/fallback)** and **English**, both fully populated (140 leaf keys each, 15 top-level groups, in exact sync). All user-facing strings go through `t(...)`. Language persisted in localStorage key `cg:language`.

## Product requirements (stated by user) — status
- **Bilingual (Thai + English).** ✅ Implemented. Thai is the default/fallback; English confirmed as the second language. i18n layer is in from the start, no hardcoded UI strings.
- **Dark/light theme following the browser/OS preference** (`prefers-color-scheme`). ✅ Implemented via `AppThemeProvider` — a `ThemePreference` of `system | light | dark`; `system` follows `useMediaQuery('(prefers-color-scheme: dark)')`, the other two are explicit overrides (persisted in `cg:theme-preference`; the key is removed when `system`). three.js material/grid colours are themed **separately** from the MUI/DOM side via `sceneColors[mode]`.
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

## Persistence / backends (current = localStorage, all swappable)
- Leads → `cg:leads`; price config → `cg:price-config`; theme preference → `cg:theme-preference`; language → `cg:language`. `LeadRepository` is async by design so a real backend (Supabase noted) can replace the localStorage impl without touching callers.

## Todo / Out of scope
- **Real pricing rates** — `config.ts` is explicitly placeholder; needs the company's actual per-sqm and per-opening numbers, and the Phase-2 cost factors (floor count, roof type, parking) that `estimate.ts` currently ignores.
- **Real backend** for leads + price config (currently localStorage only).
- **Physical touch-device testing** — the pointer path is unified for mouse/touch but has not been verified on a real touch device (drag-to-draw, node drag, pinch-zoom, hit-area sizing, Safari double-tap-zoom suppression).
- **Bundle size** — build warns the main chunk is > 500 kB (~1.68 MB / 490 kB gzip); no code-splitting yet.
- **No automated tests** — no test runner configured; verification is manual + build/lint. Geometry math (`polygonArea`, loops, faces) is the obvious first candidate for unit tests.
- Known minor: duplicated rename-room `MenuItem` block in `CanvasContextMenu.tsx`.

## Roadmap — full company website
Agreed direction to grow this from a tool into CG's company site.

**✅ Phase 1 — DONE (2026-07-29): marketing shell + Home/About/Contact.**
- `src/marketing/MarketingLayout.tsx` — sticky nav + mobile drawer + footer; its own scroll container (`height:100vh; overflowY:auto`) because `#root`/body are `height:100vh; overflow:hidden` for the designer. Wraps marketing routes via `<Outlet/>`.
- `src/marketing/i18n.ts` — marketing strings registered as a `mkt.*` group via `i18n.addResourceBundle` (deliberately NOT edited into `locales/*.json`, to avoid colliding with concurrent edits there).
- `src/pages/HomePage.tsx` — hero (CTA → `/` designer), 4 service cards (บ้านน็อคดาวน์ = core + electronics/furniture/equipment-rental), featured models from `PLAN_TEMPLATES` with `IsoThumbnail` 3D previews + prices, portfolio strip, stats band, final CTA. `AboutPage.tsx`, `ContactPage.tsx` (contact form → localStorage `cg:contact-messages`).
- **One unified header** `src/ui/SiteHeader.tsx` (brand + marketing nav + "ออกแบบบ้าน" CTA → `/` + admin + login + lang/theme + mobile drawer), mounted by BOTH shells — dense 48px to keep the designer's `calc(100vh - 48px)` layout valid.
- `App.tsx` split into two layout routes: `AppShell` (SiteHeader + fixed-height column) for `/ /login /admin`; `MarketingLayout` (SiteHeader + scroll + footer) for `/home /about /contact`. **Tool stays at `/`.**
- `AboutPage` includes a CEO/leadership section — placeholder photo box (swap in a real `<img>`) + name/title/quote. Build + preview verified; content/figures/photo are placeholders pending real company data.

**✅ Phase 2 — DONE (2026-07-29): Products + Portfolio.**
- `src/catalog/` — bilingual seed content + helpers (swappable to a repo/backend later): `types.ts` (`Product`, `Project`, `Localized`, `ProductCategory`), `products.ts` (~10 seed products across house/electronics/furniture/rental + `getProduct`/`productsByCategory`), `projects.ts` (~6 seed projects + `getProject`), `categories.tsx` (per-category label key + colour + icon), `useLocalized.ts`, `CatalogImage.tsx`.
- `src/ui/SmartImage.tsx` — renders a real photo if present else a fallback. **Image naming convention** (drop real photos here, no code change): CEO → `public/team/ceo.jpg`; products → `public/products/<slug>.jpg`; portfolio → `public/portfolio/<slug>.jpg`. `CatalogImage` fallback = flat category-coloured panel + icon.
- Pages: `ProductsPage` (`/products`, category filter + card grid), `ProductDetailPage` (`/products/:slug`, specs table + CTA — house→`/` designer, others→`/contact`), `PortfolioPage` (`/portfolio`), `ProjectDetailPage` (`/portfolio/:slug`). Wired in `App.tsx` under `MarketingLayout`; `SiteHeader` nav now points สินค้า→`/products`, ผลงาน→`/portfolio`; Home links updated. Build + preview verified.
- ⚠️ Facebook auto-pull of photos was requested but declined (auth-gated / ToS / fragile) — the naming convention above is the supported way to add real photos.

**Business (stated by user):** CG's main line is **knock-down / prefab houses**; secondary lines are **electronics** and **furniture**; also **construction-equipment rental**. The public site must present these.

**Key decisions:**
- **Keep the plan designer at `/`** (the tool stays the landing page). The marketing Home lives at a separate route (e.g. `/home`); nav links between them.
- **The admin back-office moves to a SEPARATE repo** — do not build/expand admin here. (`AdminPage` currently at `/admin` is the legacy leads table; treat as transitional.)
- Marketing content bilingual via i18n / `{th,en}` data fields; content stored through async repositories (localStorage now, swappable to a backend later), same pattern as `LeadRepository`.

**Planned public pages / sections:**
- **Home** (marketing) — hero + CTA to `/` designer, "what we do" service cards, featured products, featured portfolio, why-us + stats, testimonials, contact CTA, footer.
- **Products** (`/products`, `/products/:slug`) — categorized: knock-down house models / electronics / furniture / equipment rental; specs, price-from, images, "customize in the designer".
- **Portfolio** (`/portfolio`, `/portfolio/:slug`) — past projects (location, year, images, description).
- **About** (`/about`), **Contact** (`/contact`, reuse `LeadFormDialog` logic), optional **FAQ**.
- **MarketingLayout**: richer NavBar (+ mobile drawer) + Footer, replacing the current minimal AppBar for marketing routes.

**Planned data model:** `Product`, `Project`, `SiteContent`, `Testimonial`, `TeamMember`, `Faq` (+ repositories) — see the fuller breakdown discussed in-session.

**Cross-cutting flags:** SPA has weak SEO — marketing pages want prerender/SSG + per-route meta/OG; bundle already > 500 kB so lazy-load routes; real image hosting needs a backend; admin (separate repo) + gated actions need real auth (Supabase Auth chosen) — the `/login` page is currently a visual mock only.

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

## Current state
On branch `spike/drawing-engine` (latest commit `644f181`, 2026-07-27). **Working tree has substantial uncommitted work** added this session — plan gallery + `planFile.ts` + `public/plans/*`, mock auth (`src/auth/`), `/login` page, iso thumbnails, a traced pilot plan (`public/plans/chaiyaphum-bedroom-floor.json`) — plus an in-progress `src/sheet/PlanSheet.tsx` (printable plan sheet) being edited by the user. `pnpm run build` passes with only the chunk-size warning. Nothing committed/pushed yet; per the no-direct-push rule a human opens any PR.
The app is a working bilingual, themed, MUI house-design tool with 2D editing, 3D massing, pricing, lead capture, a plan gallery with import/export, and a visual login page. Next concrete steps: (1) build the company website per the Roadmap above (Phase 1: marketing shell + Home), (2) finish the remaining Chaiyaphum floor plans traced from the `.skp` (approximate, one plan per floor), (3) wire real auth (Supabase) when ready, (4) real backend for leads/config + real pricing rates, (5) SEO/prerender + route code-splitting.
