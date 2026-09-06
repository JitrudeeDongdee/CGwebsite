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

### `src/content/` — editable site content (not code)
- **`contact.json` — the ONE place to edit contact channels.** An array of `{ kind: 'phone'|'line'|'email'|'facebook'|'address', value, url? }` where `value` is one string (phone/email/LINE id) or a `{ th, en }` pair for text that must be translated (the address); `contact.ts` types it and derives the link (`tel:` for a phone with ≥6 digits, `mailto:` for an email, and line/address only when the entry carries an explicit `url` — we never invent a LINE or map URL) plus the i18n label key `mkt.contact.<kind>Label`. Values of `-` / `—` / empty count as "not filled in yet": never linked, and hidden from the footer. Read by the marketing **footer** and the **contact page** (icons + clickable values). Changing a number/email here updates both.

### SEO files
- **`scripts/generate-seo-files.mjs`** (runs as npm `prebuild`, also `pnpm run seo`) writes `public/robots.txt` + `public/sitemap.xml`. Routes come from the app + the catalog slugs, so the sitemap can't drift: the four `/home/:service` pages (canonical — `/` and `/home` only redirect, so they're deliberately not listed), `/products` + every product, `/portfolio` + every project, `/about`, `/contact`, `/design`. robots disallows `/admin` and `/login`.
- The origin is **`SITE_URL`** — the same env var `vite.config.ts` uses for og:url/og:image. Without it robots.txt is still written but **the sitemap is skipped** (and a stale one deleted): guessed absolute URLs are worse than none. Build for real with `SITE_URL=https://<domain> pnpm run build`.
- `tsconfig.node.json` uses `module: esnext` + `moduleResolution: bundler` so `vite.config.ts` can import from `src/` (Vite bundles the config itself).
- **Open Graph / Twitter cards** — the `tdd-site-meta` plugin in `vite.config.ts` injects them into `index.html` at build: `og:type/site_name/locale(+alternate)/title/description`, `twitter:card=summary_large_image` + title/description always; `og:url`, `og:image` (+`width/height/alt`) and `twitter:image` only when `SITE_URL` is set. Title/description are **read back out of `index.html`** so the card and the search result can't drift apart. The share image is `public/brand/og-card.png` (1200×630, blueprint-grid card with the shield + Thai tagline) — regenerate with `pnpm run og` (`scripts/make-og-card.py`, Pillow; not part of the build, output committed).
- Because this is a client-rendered SPA, these tags are **site-wide, not per page** — every URL shares one card until prerendering lands.
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
- `src/pages/HomePage.tsx` — hero (CTA → `/` designer), 4 service cards (บ้านน็อคดาวน์ = core + electronics/furniture/equipment-rental), featured models from `PLAN_TEMPLATES` with `IsoThumbnail` 3D previews + prices, portfolio strip, stats band, final CTA. `AboutPage.tsx`, `ContactPage.tsx` — contact form (→ localStorage `cg:contact-messages`, no backend yet) plus the contact-channel rail (phone / LINE / email / **Facebook** / address) read from `src/content/contact.json`, the same source as the footer.
- **Logo**: `src/ui/LogoMark` (`src/ui/Logo.tsx`) renders **`public/favicon.svg`** — the same file as the browser-tab icon, so header, footer and tab all change in one place; an inline copy of the artwork is the fallback. (`public/brand/logo-shield.png` is no longer referenced.)
- **One unified header** `src/ui/SiteHeader.tsx` (brand + marketing nav + "ออกแบบบ้าน" CTA → `/` + admin + login + lang/theme + mobile drawer), mounted by BOTH shells — dense 48px to keep the designer's `calc(100vh - 48px)` layout valid.
- `App.tsx` split into two layout routes: `AppShell` (SiteHeader + fixed-height column) for `/design /login /admin`; `MarketingLayout` (SiteHeader + scroll + footer) for `/home /products /portfolio /about /contact`. **Landing `/` redirects to `/home/house`; the designer tool lives at `/design`** (reversed from the earlier "tool at /" decision, per the user). All "ออกแบบบ้าน" CTAs point to `/design`.
- `AboutPage` includes a CEO/leadership section — **ชูชาติ ดวงดี / Chuchat Duangdee**, CEO; the photo is in place at `public/team/ceo.jpg` (900×900 JPEG, ~124 kB — converted down from the 1254×1254 PNG that was dropped in), shown in a 380px square column. Build + preview verified; content/figures/photo are placeholders pending real company data.

**✅ Phase 2 — DONE (2026-07-29): Products + Portfolio.**
- `src/catalog/` — bilingual seed content + helpers (swappable to a repo/backend later): `types.ts` (`Product`, `Project`, `Localized`, `ProductCategory`), `products.ts` (~10 seed products across house/electronics/furniture/rental + `getProduct`/`productsByCategory`/`heroProductFor`; `Product.bestSeller` marks one per line for the hero badge), `projects.ts` (~6 seed projects + `getProject`), `categories.tsx` (per-category label key + colour + icon), `useLocalized.ts`, `CatalogImage.tsx`.
- `src/ui/SmartImage.tsx` — renders a real photo if present else a fallback. **Image naming convention** (drop real photos here, no code change): CEO → `public/team/ceo.jpg`; products → `public/products/<slug>.jpg`; portfolio → `public/portfolio/<slug>.jpg`. `CatalogImage` fallback = flat category-coloured panel + icon.
- **Per-service home pages** (`/home/:service` — house / electronics / furniture / rental): `HomePage` renders the SAME layout for the company home and for each service line; `useParams().service` swaps the content. Hero (service title/lead, its 3 highlights in the trust row, CTA: house→`/design`, others→`/contact`, hero card = that line's **best seller**, badged "ขายดี", linking to its product page — house models render as an iso plan thumbnail, other lines as their catalog photo), the 4 service cards (all links to `/home/:service`; only the one being viewed is outlined in primary — the house line is marked by its permanent "งานหลัก" chip, not a border), featured block (house plans on `/home` + `/home/house`, catalog products otherwise) with a **see-all button → `/products?category=<cat>`**, portfolio filtered to that category (section hidden when empty) with a **see-all button → `/portfolio?category=<cat>`**, stats, CTA. Strings live in the `mkt.service.*` i18n group. **`/home` (and `/`, and any unknown path) redirects to `/home/house`** — the house line is the landing page; `/home` is kept only as an alias, so `HomePage`'s company-wide variant (the `cat === null` branch) is currently unreachable, kept for the day a combined home is wanted again. Unknown `/home/:service` → `/home` → `/home/house`; the older `/services/:service` URLs redirect to `/home/:service`. The hero is a **fixed height on desktop** (`HERO_HEIGHT` 700 at md / 600 at lg+) with per-breakpoint line clamps on title/lead/highlights and a fixed hero-media height, so every service's hero is exactly the same height (verified 900/1024/1200/1440 px in both languages, no clipping); on mobile it grows with its content. `CatalogImage` gained an optional `height` prop for slots that must line up. `MarketingLayout` resets its own scroll container on route change (it scrolls internally, so the browser doesn't reset it).
- Pages: `ProductsPage` (`/products`, card grid), `PortfolioPage` (`/portfolio`) — both share **`useCatalogQuery` + `CatalogToolbar`**: category toggles, a search box and pagination (`PAGE_SIZE` 6), all held in the URL (`?category=&q=&page=`) so any view is linkable; changing a filter resets to page 1 and a stale `?page=` clamps into range, `ProductDetailPage` (`/products/:slug`, specs table + CTA — house→`/` designer, others→`/contact`), `ProjectDetailPage` (`/portfolio/:slug`). Wired in `App.tsx` under `MarketingLayout`; `SiteHeader` nav now points สินค้า→`/products`, ผลงาน→`/portfolio`; Home links updated. **The Admin entry is hidden from the header** (`SHOW_ADMIN_LINK = false` in `SiteHeader.tsx`, desktop button + mobile drawer) until sign-in carries real roles — flip it to a role check then; the `/admin` route itself still works by URL. Build + preview verified.
- ⚠️ Facebook auto-pull of photos was requested but declined (auth-gated / ToS / fragile) — the naming convention above is the supported way to add real photos.

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
  than guessed. `VITE_GA_ID` = GA4 measurement ID, production only.
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

**📋 Phase 3 — PLANNED: real backend (Supabase) + admin for catalog content.**

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
- `products` — `id uuid pk`, `slug text unique`, `category text check in (house|electronics|furniture|rental)`,
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

**Business (stated by user):** CG's main line is **knock-down / prefab houses**; secondary lines are **electronics** and **furniture**; also **construction-equipment rental**. The public site must present these.

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

## Current state
On branch `spike/drawing-engine` (latest commit `644f181`, 2026-07-27). **Working tree has substantial uncommitted work** added this session — plan gallery + `planFile.ts` + `public/plans/*`, mock auth (`src/auth/`), `/login` page, iso thumbnails, a traced pilot plan (`public/plans/chaiyaphum-bedroom-floor.json`) — plus an in-progress `src/sheet/PlanSheet.tsx` (printable plan sheet) being edited by the user. `pnpm run build` passes with only the chunk-size warning. Nothing committed/pushed yet; per the no-direct-push rule a human opens any PR.
The app is a working bilingual, themed, MUI house-design tool with 2D editing, 3D massing, pricing, lead capture, a plan gallery with import/export, and a visual login page. Next concrete steps: (1) build the company website per the Roadmap above (Phase 1: marketing shell + Home), (2) finish the remaining Chaiyaphum floor plans traced from the `.skp` (approximate, one plan per floor), (3) **Phase 3** — Supabase backend + repositories + real auth + admin for catalog content (see Roadmap; backend lands before any admin UI), (4) real pricing rates, (5) SEO/prerender + route code-splitting.
