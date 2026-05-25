---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-Dig-2026-05-24/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
---

# Dig - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Dig, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Live autocomplete artist search — user types a partial artist name and sees a dropdown of matching results updating in real time (debounced at 300ms). Results display Artist name and a disambiguating detail (genre or era) where available.

FR-2: Search result selection loads the graph — selecting an autocomplete result renders the Influence Graph with the selected Artist as the Focal Artist and updates the browser URL to `/artist/[slug]`. If no influence data exists, a "no data" empty state is shown.

FR-3: Artist not found state — zero-result searches show an explicit "no artists found" message in the dropdown; the graph area does not update or clear.

FR-4: Graph renders with Focal Artist centered — system renders an Influence Graph with Focal Artist at center, Upstream Influences to the left, Downstream Influences to the right, to default Graph Depth of 2 Hops. Renders within 3 seconds for major artists on ≥10 Mbps.

FR-5: Node displays Artist identity — each node displays the Artist's name and, where available, a thumbnail image. Nodes without an available image display a consistent fallback (genre-colored placeholder).

FR-6: Data-Thin indicator — when an Artist's influence data is sparse (fewer than DATA_THIN_THRESHOLD relationships), a visual indicator is shown on that node and/or surfaced as a graph-level notice. Uses informative voice, not error language.

FR-7: On-demand hop expansion — user can expand any visible leaf node to reveal one additional hop of influence relationships beyond the currently rendered depth. Expansion is per-node. New nodes appear within 2 seconds of user action.

FR-8: Pivot on node click — clicking any node triggers a graph transition animation and renders the clicked Artist as the new Focal Artist. URL updates to `/artist/[slug]` for the new Focal Artist.

FR-9: Node hover state — hovering a node reveals an Artist detail panel or tooltip displaying: Artist name, genre(s), era/active years, and Audio Preview control (if available). Hover state activates within 200ms of cursor entering node bounds.

FR-10: Graph pan and zoom — user can pan by click-drag and zoom by scroll wheel (desktop) or pinch gesture (mobile). Graph has defined min/max zoom bounds.

FR-11: Mobile touch navigation — tap triggers Pivot; pinch-to-zoom and drag-to-pan are supported. Graph is navigable on a 375px viewport.

FR-12: Filter by Era — user can apply an Era filter to dim or hide nodes outside the selected time range. Era filter options derived from data present in the current graph (decade buckets). Clearing restores all nodes.

FR-13: Filter by Genre — user can apply a Genre filter to dim or hide nodes outside selected genres. Multiple genres selectable simultaneously (OR logic). Nodes without genre data are shown (not hidden) when a genre filter is active.

FR-14: Spotify preview on node hover — when a user hovers an Artist node and a Spotify preview URL is available, a short audio preview plays after 500ms hover dwell. Only one preview plays at a time.

FR-15: Graceful preview fallback — when no Spotify preview is available, the hover state displays normally with no audio and no error indication. The Audio Preview integration point must be abstracted (swappable interface).

FR-16: Artist route loads graph directly — navigating to `/artist/[slug]` loads the Influence Graph for the corresponding Artist without requiring a search. Unknown slug shows an "artist not found" page (not a 500 error).

FR-17: URL updates on Pivot — pivoting to a new Focal Artist updates the browser URL to `/artist/[slug]` via pushState so back button works. Refreshing after a Pivot reloads the current Focal Artist's graph.

### Non-Functional Requirements

NFR-1: Performance — Initial graph render for a major artist (The Beatles, Kendrick Lamar, David Bowie) within 3 seconds on a connection of ≥10 Mbps. On-demand hop expansion within 2 seconds. Search autocomplete within 300ms (debounced).

NFR-2: External API resilience — all three external data sources (MusicBrainz, Wikipedia, Wikidata) are unreliable, rate-limited, with no uptime guarantees. App must degrade gracefully when any source is slow or unavailable. Partial data is always preferable to a broken graph. Error states are visible and honest, not silent.

NFR-3: No backend database — all data fetched live from external open APIs. No ETL pipeline, no hosted data store in v1.

NFR-4: Audio preview abstraction — Spotify preview integration must be behind a swappable AudioPreviewProvider interface. Fragility of Spotify's preview API is a known risk. Swapping the source must not require feature redesign.

NFR-5: Accessibility — WCAG 2.1 AA for all interactive chrome controls (search, filters, detail panel). Graph canvas: role="img" with meaningful aria-label. Color is never the sole signal for meaning. Full graph keyboard traversal deferred to v2.

NFR-6: Responsive — Mobile-first authoring, 375px baseline. Three tiers: <768px (mobile), 768–1023px (tablet), 1024px+ (desktop). Touch-adapted interaction model on mobile.

NFR-7: prefers-reduced-motion — D3 physics animation must branch at runtime: full physics (default) vs. instant pivot cross-fade (reduced motion). Use shared `prefersReducedMotion()` utility — never inline the media query.

NFR-8: Open source — MIT license applied. Public GitHub repository. No proprietary dependencies that would restrict redistribution or community contribution.

NFR-9: MusicBrainz rate limiting — API enforces 1 req/sec. Implementation must include retry-with-backoff or request queue in `musicbrainz.ts`.

NFR-10: Naming + code conventions — all AI agents and contributors must follow the architectural patterns: named exports, co-located tests, interface for data shapes, `null` for absent data, `isPending` (not `isLoading`), Zustand selector pattern, D3 constants from `src/graph/constants.ts`, never hardcode animation values or thresholds.

### Additional Requirements

- **Starter template:** Use `create-next-app@latest` with `--typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`. This is the first implementation story.
- **Additional dependencies:** D3 + @types/d3; Radix UI (popover, hover-card, tooltip, visually-hidden, cmdk); Zustand; TanStack Query v5; Vitest + React Testing Library; prettier-plugin-tailwindcss.
- **Implementation sequence (must be respected):** (1) data model types → (2) API routes + data source clients → (3) slug resolution → (4) Zustand store → (5) D3 GraphCanvas engine → (6) chrome components.
- **Data model first:** `src/lib/data/types.ts` defining `Artist`, `InfluenceEdge`, `GraphData` interfaces must be implemented before any other component — everything depends on this.
- **All external API calls server-side only:** Never direct browser calls. All data fetches originate from Next.js API Routes (`/api/search`, `/api/graph/[mbid]`, `/api/graph/[mbid]/expand`, `/api/preview/[mbid]`).
- **Unified API response shape:** `{ data }` | `{ data, warnings }` | `{ error, code }`. Partial success (warnings[]) is first-class — maps to "partial data preferable to crash" NFR.
- **Data-thin detection server-side:** `isDataThin` computed in `graph-builder.ts` using `DATA_THIN_THRESHOLD` constant — never re-computed on client.
- **Slug format (OQ-3 resolved):** Human-readable + MBID suffix on collision (e.g., `john-coltrane-a74b`). `generateSlug()` and `resolveSlug()` in `src/lib/data/slugs.ts`.
- **ISR edge caching via Vercel:** Graph routes `revalidate = 3600` (1hr); search route `revalidate = 86400` (24hr); preview route `revalidate = 0` (no cache).
- **TanStack Query v5:** Use `isPending` not `isLoading`. Always destructure from `useQuery`.
- **Zustand store:** Single `useDigStore` from `src/store/index.ts`. Always use selector pattern — never destructure whole store.
- **D3/React boundary:** D3 owns SVG DOM entirely. `<GraphCanvas>` renders the `<svg>` mount point via `useRef` and passes filter state as props for D3 to apply dimming. React never updates SVG children after mount.
- **Filter state → D3:** Filter changes never cause React re-renders of graph. Flows: Zustand → `<GraphCanvas>` prop → D3 `applyFilters()`.
- **AudioPreviewProvider interface:** `src/lib/audio/audio-preview.ts` defines the interface. `src/lib/audio/spotify.ts` is the implementation. Interface consumed only by API route — Spotify credentials never reach client.
- **Error types:** `ArtistNotFoundError`, `DataSourceError`, `PartialDataError` in `src/lib/errors.ts`.
- **Animation/physics constants:** All timing and physics values in `src/graph/constants.ts` — `PIVOT_DURATION_MS = 700`, `DATA_THIN_THRESHOLD = 3`, `HOVER_DWELL_MS = 500`, `SEARCH_DEBOUNCE_MS = 300`, etc.
- **GitHub Actions CI:** `vitest run` + `eslint` must pass before PR merge. Config in `.github/workflows/ci.yml`.
- **Vercel deployment:** Auto-deploy from `main`; preview deploy on every PR. `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` set as environment variables in Vercel dashboard.
- **Wikidata SPARQL validation:** P737 forward (upstream) and reverse (downstream) queries must be validated against 5 pre-build artists (Beatles, Björk, Fela Kuti, Kendrick Lamar, Daft Punk) before the wikidata.ts implementation story is considered complete.
- **miles-davis.json generation:** Pre-baked landing graph must be generated by running `graph-builder.ts` against the live Miles Davis MBID — not hand-crafted — to ensure structural consistency with the `GraphData` TypeScript interface.
- **Test file placement:** Co-located with source files (no `__tests__/` directories). Named `[source].test.ts(x)`.
- **Named exports:** All components use named exports. Default exports only for Next.js route files (`page.tsx`, `layout.tsx`, `route.ts`).

### UX Design Requirements

UX-DR1: Full-bleed canvas layout — `100vw × 100vh` SVG is the world; no page padding, no container. UI chrome (top nav, filter panel, detail panel) floats over canvas using absolute/fixed positioning with Tailwind `backdrop-blur` + frosted glass effect.

UX-DR2: Three-layer chrome architecture — (1) Top nav: 48px, always visible, frosted glass, contains search + filter toggle; (2) Filter panel: 48px collapsed height, slides down from nav, collapsed by default; (3) Node detail panel: 280px fixed right (desktop) / full-width bottom sheet max 40vh (mobile). Chrome never obscures focal artist at canvas center.

UX-DR3: Design token implementation in `tailwind.config.ts` theme.extend.colors — canvas: `#1a1814`, chrome: `rgba(28,24,20,0.92)`, surface-elevated: `rgba(38,34,28,0.96)`, text-primary: `#F3EDDD`, text-secondary: `#8a8470`, text-dim: `#52503f`, node-focal: `#F3EDDD`, edge-default: Tusk (`#D3CEB8`) at 13% opacity, node-dimmed: genre color at 12% opacity, data-thin: `#EDC458`, focus-ring: `#F3EDDD` at 50%.

UX-DR4: Node genre-family color palette (secondary signal only — spatial position is primary): Jazz/blues/soul: `#EDC458` (Honey Bee); Rock/punk/funk: `#E05E37` (Killer Queen); Electronic/ambient/experimental: `#9F76B6` (Purple Haze); Hip-hop/R&B: `#ABCDBB` (Mr. Blue Sky); Folk/world/reggae/afrobeats: `#EDC458` (Honey Bee shared); Classical/uncategorized: `#D3CEB8` (Tusk). Color blindness support: node shape variation as secondary differentiator (circle vs. circle with ring).

UX-DR5: Typography system using Geist font throughout — label-artist: 13px/500/text-primary; label-artist-focal: 15px/600/text-primary; label-meta: 11px/400/text-secondary; ui-label: 13px/400/text-secondary; search-input: 15px/400/text-primary; detail-title: 16px/600/text-primary; detail-body: 13px/400/text-secondary; empty-state: 14px/400/text-dim.

UX-DR6: `<ArtistNode>` SVG component with all visual states — focal (White Rabbit fill, 0.95 opacity, largest radius, 600 weight label); default-hop1 (genre color 72% opacity, medium radius); default-hop2 (genre color 50% opacity, small radius); hover (genre color 100% + warm glow halo + hover ring + pointer cursor); dimmed (genre color 12% opacity); data-thin (amber dot on node perimeter); expand-available (expand affordance ring on leaf node hover/focus). Anatomy: glow halo circle → main circle → hover ring → label text below.

UX-DR7: Progressive graph reveal as loading experience — focal artist node appears immediately when API call begins; edges draw outward; nodes resolve one by one as API data arrives. No blocking spinner. Loading state IS the animation — they are the same thing.

UX-DR8: Physics-based pivot transition — ~700ms settle time; nodes drift and settle like stars rearranging; new nodes entering the graph fade in from edges; exiting nodes drift outward and fade out; the new focal artist transitions to focal visual state; URL updates via pushState during transition. Reduced motion variant: instant cross-fade of node positions instead of physics drift.

UX-DR9: `<ArtistSearchInput>` component built on Radix cmdk Combobox — idle state shows placeholder "Search any artist…"; 300ms debounce on input; loading indicator (inline spinner); results show artist name (text-primary, 13px) + disambiguating detail (text-secondary, 11px); "No artists found for '[query]'" empty state in dropdown; ESC closes dropdown without graph change; ARIA live region announces result count; keyboard navigable.

UX-DR10: `<NodeDetailPanel>` component — desktop variant: Radix HoverCard, fixed right side 280px wide, appears on hover, closes on cursor leave + Escape; mobile variant: Radix Popover bottom sheet, full-width max 40vh, opens on first tap, contains pivot prompt "Tap again to explore [Artist]", dismisses on tap outside or swipe down. Both variants contain: artist name (detail-title), genre + era (detail-body), AudioPreviewControl if available. role="dialog" with aria-label.

UX-DR11: `<FilterPanel>` + `<FilterChip>` + `<FilterToggle>` — panel collapses behind FilterToggle icon in nav (tap to expand/collapse as slide-down strip); Era chips format: "1960s — British Invasion / Motown"; Genre chips: multi-select OR logic; chips activate immediately (no apply button); out-of-range nodes dim to 12% opacity immediately; FilterToggle shows amber dot indicator (shape change, not color-only) when any filter active; amber dot accompanied by aria-label="Filters active"; Clear All in one tap; FilterChip uses role="checkbox" with aria-checked. Filter state is session-only (not in URL v1).

UX-DR12: `<DataThinBadge>` with three variants — node variant: small amber dot on node perimeter, visual only; graph-notice variant: inline notice "Limited data for this artist — showing what we have", role="status" aria-live="polite", appears after graph transition settles; no-downstream variant: "Downstream connections for this artist are sparse — expected for contemporary artists". Never uses error language.

UX-DR13: `<AudioPreviewControl>` — available-idle state: play circle + static waveform bars; loading state: spinner in place of play button; playing state: pause icon + animated waveform bars; unavailable state: component not rendered (not disabled, not greyed — absence is the UI). Audio begins on 500ms hover dwell (desktop) or when detail panel opens (mobile). Only one preview active at a time — hovering a second node stops the first. Radix VisuallyHidden for screen reader label on play button.

UX-DR14: `<EmptyState>` component with three variants — no-search-results: "No artists found for '[query]'" (graph unchanged); artist-not-found: "We couldn't find that artist. Try searching above." (search bar prominent, not a dead end); no-influence-data: "We don't have influence data for this artist yet." (node shown, search accessible). All use text-dim color, 14px, never error language. No variant interrupts the graph area.

UX-DR15: Mobile two-tap interaction model — first tap on any node opens bottom sheet detail panel (artist info + audio preview begins); second tap on same node commits to pivot; "Tap again to explore [Artist]" prompt makes the two-step model self-explanatory without any tutorial; tap outside bottom sheet dismisses panel without pivot; expand affordance appears inside detail sheet for leaf nodes on mobile.

UX-DR16: Three-tier responsive Tailwind implementation — mobile (<768px): bottom sheet for node detail, nodes 20% smaller, filter panel as icon; tablet (768–1023px): desktop layout, touch inputs treated as click events, hover states suppressed; desktop (1024px+): full hover model, right-side detail panel, horizontal filter strip. Mobile-first authoring: default classes for mobile, `md:` and `lg:` prefixes for larger breakpoints.

UX-DR17: Accessibility implementation — WCAG 2.1 AA for all chrome; 44×44px minimum touch targets (`.touch-target` utility class); focus rings on all interactive controls using `focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2`; keyboard traversal: Tab order = search → filter controls → detail panel; all non-text controls have aria-label; color blindness: node shape variation as secondary differentiator; graph canvas: `role="img"` with dynamic aria-label ("Influence graph centered on [artist]. [N] influences, [M] influenced artists.").

UX-DR18: Direction labels in graph — "← INFLUENCES" and "INFLUENCED →" rendered in SVG; all caps, letter-spaced, very low opacity; positioned on canvas to teach spatial grammar once and fade into background. Left = upstream (roots); Right = downstream (legacy). These labels teach without requiring instruction.

UX-DR19: ERA_EPOCH_LABELS mapping in `src/lib/data/constants.ts` — maps decade strings to combined filter chip labels: `{ "1960s": "1960s — British Invasion / Motown", "1970s": "1970s — Punk / Disco / Funk", ... }`. Filter chip displays combined label; decade string is the filter key.

UX-DR20: Pre-baked Miles Davis landing graph — `public/data/miles-davis.json` must conform exactly to `GraphData` TypeScript interface; generated by running `graph-builder.ts` against live Miles Davis MBID (not hand-crafted); curated to contain at least one visible surprising cross-genre connection accessible without pivoting or scrolling; landing page loads this JSON with zero API calls for instant render.

### FR Coverage Map

| FR | Epic | Note |
|---|---|---|
| FR-1 | Epic 1 | Live autocomplete search |
| FR-2 | Epic 1 | Result selection → graph load + URL nav |
| FR-3 | Epic 1 | Zero-result state in search dropdown |
| FR-4 | Epic 1 | Centered graph, 2-hop, ≤3s |
| FR-5 | Epic 1 | Node identity (name + image/fallback) |
| FR-6 | Epic 2 | Data-Thin indicator — node dot + graph notice |
| FR-7 | Epic 2 | On-demand per-node hop expansion |
| FR-8 | Epic 1 | Pivot on click — graph transitions |
| FR-9 | Epic 2 | Node hover → NodeDetailPanel |
| FR-10 | Epic 1 | Pan/zoom with bounds (zoom.ts) |
| FR-11 | Epic 3 | Mobile touch: tap-to-pivot, pinch-zoom |
| FR-12 | Epic 2 | Era filter with epoch labels |
| FR-13 | Epic 2 | Genre filter (multi-select OR) |
| FR-14 | Epic 2 | Spotify audio preview on hover dwell |
| FR-15 | Epic 2 | Graceful fallback + AudioPreviewProvider interface |
| FR-16 | Epic 1 | `/artist/[slug]` direct load; unknown slug → search |
| FR-17 | Epic 1 | pushState on pivot; back button restores state |

## Epic List

### Epic 1: Core Graph Experience
Users can search for any artist and land in a living influence graph — upstream roots on the left, downstream legacy on the right. They can navigate it by clicking nodes to pivot, pan and zoom, share the URL, and use the back button. The landing experience opens instantly on Miles Davis.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-8, FR-10, FR-16, FR-17

### Epic 2: Exploration Depth
Users can hover any node to see artist details and hear an audio preview, expand a node to go one hop deeper on demand, filter the graph by era (with epoch labels) and genre, and see honest data coverage indicators.
**FRs covered:** FR-6, FR-7, FR-9, FR-12, FR-13, FR-14, FR-15

### Epic 3: Mobile & Accessibility
Dig works fully on any mobile device at 375px with the two-tap interaction model, and meets WCAG 2.1 AA for all chrome controls. The prefers-reduced-motion user preference is respected throughout.
**FRs covered:** FR-11 (+ NFR-5, NFR-6, NFR-7)

---

## Epic 1: Core Graph Experience

Users can search for any artist and land in a living influence graph — upstream roots on the left, downstream legacy on the right. They can navigate it by clicking nodes to pivot, pan and zoom, share the URL, and use the back button. The landing experience opens instantly on Miles Davis.

### Story 1.1: Project Initialization & CI/CD Setup

As a developer,
I want the project scaffold created with all required tooling and CI/CD configured,
So that I can begin building features against a production-ready foundation with automated checks on every PR.

**Acceptance Criteria:**

**Given** a clean environment with Node.js installed
**When** `create-next-app@latest dig --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` runs and additional packages are installed (d3, @types/d3, @radix-ui/react-popover, @radix-ui/react-hover-card, @radix-ui/react-tooltip, @radix-ui/react-visually-hidden, cmdk, zustand, @tanstack/react-query, vitest, @testing-library/react, prettier-plugin-tailwindcss)
**Then** `npm run build` succeeds with zero errors
**And** `npm run dev` starts the Turbopack dev server
**And** `npm run test:run` exits 0 (empty Vitest suite)
**And** `npm run lint` reports zero ESLint errors

**Given** a GitHub repository is connected to Vercel
**When** a PR is opened against `main`
**Then** GitHub Actions CI runs `vitest run` + `eslint` automatically
**And** the PR is blocked from merge if either check fails

**Given** `.env.example` exists at the root
**When** I inspect it
**Then** it contains `SPOTIFY_CLIENT_ID=` and `SPOTIFY_CLIENT_SECRET=` as placeholder entries
**And** `.env.local` is listed in `.gitignore`

**Given** `AGENTS.md` is created at the project root
**When** I open it
**Then** it references the architecture document path and records key conventions: named exports only, `isPending` not `isLoading`, co-located test files, Zustand selector pattern

---

### Story 1.2: Design System Foundation

As a developer,
I want the design token system, layout shell, and global CSS established,
So that all subsequent components are styled consistently from the first pixel.

**Acceptance Criteria:**

**Given** `tailwind.config.ts` is configured with `theme.extend.colors`
**When** I inspect the file
**Then** all finalized tokens are present: `canvas: '#1a1814'`, `chrome: 'rgba(28,24,20,0.92)'`, `surface-elevated: 'rgba(38,34,28,0.96)'`, `text-primary: '#F3EDDD'`, `text-secondary: '#8a8470'`, `text-dim: '#52503f'`, `data-thin: '#EDC458'`, `focus-ring: '#F3EDDD'`
**And** genre-family colors: `honey-bee: '#EDC458'`, `killer-queen: '#E05E37'`, `purple-haze: '#9F76B6'`, `mr-blue-sky: '#ABCDBB'`, `tusk: '#D3CEB8'`

**Given** `src/app/layout.tsx` and `globals.css` are implemented
**When** I load the app at localhost:3000
**Then** the page background is `#1a1814` — no scrollbars, no white flash
**And** Geist font is loaded and applied throughout
**And** `QueryClientProvider` (TanStack Query) wraps the entire layout

**Given** the layout shell is full-bleed
**When** I resize the browser to any size
**Then** the canvas area remains `100vw × 100vh` with no padding, margin, or container

**Given** `src/lib/motion.ts` is implemented
**When** `prefersReducedMotion()` is called
**Then** it returns `true` when `(prefers-reduced-motion: reduce)` is active (Chrome DevTools emulation)
**And** returns `false` otherwise
**And** no D3 engine file calls `window.matchMedia` directly — all go through this utility

**Given** the `.touch-target` utility class is defined in `globals.css`
**When** applied to an element
**Then** it sets `min-height: 44px`, `min-width: 44px`, and uses flexbox centering

---

### Story 1.3: Data Model Types, Constants & Error Types

As a developer,
I want the TypeScript type contracts, animation constants, and error classes established,
So that every subsequent file builds against a stable, shared type system — never hardcoding values.

**Acceptance Criteria:**

**Given** `src/lib/data/types.ts` is implemented
**When** I inspect it
**Then** it exports `interface Artist { mbid, slug, name, genres, era, imageUrl, isDataThin }`
**And** absent-data fields use `null` not `undefined`: `imageUrl: string | null`, `era: string | null`
**And** it exports `interface InfluenceEdge { sourceId, targetId, direction: 'upstream' | 'downstream', confidence: 'high' | 'medium' | 'low' }`
**And** it exports `interface GraphData { focalArtist, artists, edges, depth, warnings: string[] }`

**Given** `src/lib/data/constants.ts` is implemented
**When** I import `DATA_THIN_THRESHOLD`
**Then** its value is `3`
**And** `ERA_EPOCH_LABELS` is a `Record<string, string>` mapping decade strings to combined labels (e.g., `"1960s": "1960s — British Invasion / Motown"`) covering decades from 1920s through 2020s

**Given** `src/graph/constants.ts` is implemented
**When** I inspect the file
**Then** it exports: `PIVOT_DURATION_MS = 700`, `HOVER_DWELL_MS = 500`, `SEARCH_DEBOUNCE_MS = 300`, `DATA_THIN_THRESHOLD = 3`, `EDGE_OPACITY_DEFAULT = 0.13`, `NODE_OPACITY_DIMMED = 0.12`, and `NODE_RADIUS_FOCAL`, `NODE_RADIUS_HOP1`, `NODE_RADIUS_HOP2` with distinct descending values
**And** a codebase-wide grep for hardcoded `700` or `500` or `0.13` in `src/graph/` returns zero results

**Given** `src/graph/types.ts` is implemented
**When** I inspect it
**Then** `GraphNode extends SimulationNodeDatum` with fields: `mbid`, `name`, `genres`, `direction: 'focal' | 'upstream' | 'downstream'`, `isDataThin: boolean`, `opacity: number`
**And** `GraphLink extends SimulationLinkDatum<GraphNode>` with `confidence`

**Given** `src/lib/errors.ts` is implemented
**When** I throw `new ArtistNotFoundError('test-slug')`
**Then** it is an instance of `Error` with a descriptive message
**And** `DataSourceError` and `PartialDataError` are similarly implemented

---

### Story 1.4: MusicBrainz Client & Slug Utilities

As a developer,
I want the MusicBrainz API client and slug generation/resolution utilities implemented and tested,
So that artist search and URL routing can reliably map between artist names and canonical MusicBrainz IDs.

**Acceptance Criteria:**

**Given** `src/lib/data/musicbrainz.ts` is implemented
**When** I call `searchArtists('radiohead')`
**Then** it returns an array including Radiohead with a valid MBID, `name`, `genres`, and `era`
**And** the call respects MusicBrainz's 1 req/sec rate limit via retry-with-backoff
**And** when MusicBrainz is unreachable, it throws `DataSourceError`

**Given** `generateSlug('The Beatles')` is called
**Then** it returns `'the-beatles'`
**When** I call `generateSlug('Björk')`
**Then** it returns `'bjork'` (unicode normalized to ASCII)
**When** two artists would produce the same base slug
**Then** `generateSlug` appends the first 4 chars of the MBID (e.g., `'john-coltrane-a74b'`)

**Given** `src/lib/data/slugs.test.ts` contains unit tests
**When** I run `npm run test:run`
**Then** all slug tests pass: basic slugification, unicode normalization, collision resolution, round-trip slug → MBID consistency

---

### Story 1.5: Wikipedia MediaWiki Client (Upstream Influences)

As a developer,
I want the Wikipedia infobox API client implemented and validated against real artist data,
So that upstream influence relationships can be reliably parsed from Wikipedia.

**Acceptance Criteria:**

**Given** `src/lib/data/wikipedia.ts` is implemented
**When** I call `getUpstreamInfluences('The Beatles')`
**Then** it returns an array of artist name strings parsed from the "influences" infobox field
**And** the result includes at least 2 well-known upstream influences for The Beatles

**Given** a Wikipedia article has no infobox or no influences field
**When** `getUpstreamInfluences` is called
**Then** it returns an empty array (not a thrown error)

**Given** Wikipedia MediaWiki API is unreachable
**When** the client attempts a request
**Then** it throws `DataSourceError`

**Given** the client is validated against 3 artists (The Beatles, Radiohead, Miles Davis)
**When** tests run
**Then** each returns at least 2 upstream influences
**And** parsing handles varied infobox formats (HTML entities, wikilinks, comma/pipe-separated lists)

---

### Story 1.6: Wikidata SPARQL Client (Downstream Influences)

As a developer,
I want the Wikidata SPARQL client implemented and validated against the 5 pre-build artists,
So that downstream influence relationships can be retrieved reliably and the P737 query shapes are confirmed before proceeding.

**Acceptance Criteria:**

**Given** `src/lib/data/wikidata.ts` implements P737 forward (upstream fallback) and P737 reverse (downstream) queries
**When** I call `getDownstreamInfluences` for Miles Davis's MBID
**Then** it returns a non-empty array of artists Miles Davis influenced

**Given** validation against 5 pre-build artists: The Beatles, Björk, Fela Kuti, Kendrick Lamar, Daft Punk
**When** queries run against all 5 (documented in `wikidata.test.ts`)
**Then** each query completes without error
**And** the query results confirm P737 data shape for each artist
**And** sparse results for contemporary artists (Kendrick) are accepted as valid (empty array is fine)

**Given** Wikidata SPARQL endpoint is unreachable
**When** the client attempts a query
**Then** it throws `DataSourceError` and does not hang (≤5 second timeout per query)

---

### Story 1.7: Graph Builder & Core API Routes

As a developer,
I want the graph builder that orchestrates all three data sources and the core API routes operational,
So that a complete `GraphData` object can be assembled for any artist and served with proper partial-success and error handling.

**Acceptance Criteria:**

**Given** `src/lib/data/graph-builder.ts` is implemented
**When** I call `buildGraph(mbid, 2)` with Radiohead's MBID
**Then** it returns a `GraphData` object with populated `artists[]` and `edges[]`
**And** `isDataThin` is `true` on any artist with fewer than `DATA_THIN_THRESHOLD` (3) relationships
**And** if any single source fails, the graph returns with `warnings[]` populated (partial success)
**And** if all sources fail, it throws `DataSourceError`

**Given** `GET /api/search?q=radiohead` is called
**Then** it returns `{ data: Artist[] }` with ISR `revalidate = 86400`
**And** an empty query returns `{ data: [] }`

**Given** `GET /api/graph/[mbid]` is called with a valid MBID
**Then** it returns `{ data: GraphData }` on full success
**And** `{ data: GraphData, warnings: string[] }` on partial source failure
**And** `{ error: 'Artist not found', code: 404 }` with HTTP 404 for unknown MBID
**And** `{ error: 'Unable to reach data sources', code: 503 }` with HTTP 503 for total failure
**And** ISR `revalidate = 3600`

**Given** `graph-builder.test.ts` is implemented
**When** I run `npm run test:run`
**Then** tests cover: successful GraphData assembly, partial failure with warnings, `isDataThin` computation, unknown artist error

---

### Story 1.8: Zustand Store & TanStack Query Data Hooks

As a developer,
I want client state management and data-fetching hooks implemented,
So that the D3 graph engine and chrome components share application state reactively without unnecessary re-renders.

**Acceptance Criteria:**

**Given** `src/store/index.ts` implements `useDigStore` with Zustand
**When** I call `const focalArtistId = useDigStore((state) => state.focalArtistId)` (selector pattern)
**Then** it returns the current MBID or `null`
**And** calling `setFocalArtist(mbid)` updates the store and triggers re-renders only in subscribing components

**Given** `src/hooks/useArtistGraph.ts` is implemented with TanStack Query v5
**When** I call `useArtistGraph('a74b1b7f...')`
**Then** it destructures `{ data, isPending, error }` — never `isLoading`
**And** when `mbid` is null/undefined, the query does not execute

**Given** `src/hooks/useArtistSearch.ts` is implemented with TanStack Query v5
**When** I call `useArtistSearch('radio')`
**Then** it fetches after `SEARCH_DEBOUNCE_MS` (300ms) delay
**And** empty query does not trigger a fetch

**Given** `src/store/index.test.ts` is implemented
**When** I run `npm run test:run`
**Then** tests cover store initialization, `setFocalArtist`, `setFilters`, and `setAudioPreview` actions

---

### Story 1.9: D3 GraphCanvas — Core Rendering Engine

As a music lover,
I want to see an influence graph rendered on screen with the focal artist centered and nodes colored by genre family,
So that I can visually understand an artist's influence network at a glance.

**Acceptance Criteria:**

**Given** `<GraphCanvas>` is mounted with `GraphData`
**When** I inspect the DOM
**Then** a full-viewport SVG renders (`100vw × 100vh`)
**And** D3 manages all SVG children — React never writes to SVG internals after mount
**And** the component renders without SSR errors in Next.js App Router

**Given** the D3 force simulation runs
**When** it initializes with a `GraphData` object
**Then** the focal artist node is positioned at SVG center via a strong centering force
**And** upstream nodes cluster left, downstream nodes cluster right
**And** when `prefersReducedMotion()` is `true`, physics is disabled and nodes are assigned final positions instantly

**Given** artist nodes are rendered by `nodes.ts`
**When** I inspect the SVG after loading The Beatles' graph
**Then** The Beatles node has White Rabbit fill (`#F3EDDD`), `NODE_RADIUS_FOCAL` size, 600-weight label
**And** 1-hop nodes: genre-family color at 72% opacity, `NODE_RADIUS_HOP1` size
**And** 2-hop nodes: genre-family color at 50% opacity, `NODE_RADIUS_HOP2` size
**And** nodes with `isDataThin === true` show an amber dot (`#EDC458`) on their perimeter
**And** each node group has `role="button"` and `aria-label="[Artist], [direction] influence"`

**Given** edges are rendered by `edges.ts`
**When** I inspect the SVG
**Then** edges render at `EDGE_OPACITY_DEFAULT` (13%) opacity with Tusk color (`#D3CEB8`)

**Given** direction labels are in the SVG
**When** I view the graph
**Then** "← INFLUENCES" appears left of center and "INFLUENCED →" appears right of center
**And** labels are all-caps, letter-spaced, rendered at ≤15% opacity
**And** the SVG has `role="img"` with `aria-label="Influence graph centered on [focal artist]. [N] influences, [M] influenced artists."`

---

### Story 1.10: Graph Interaction — Zoom, Pan & Pivot

As a music lover,
I want to zoom and pan the graph freely and click any node to recenter on that artist,
So that I can navigate deep influence networks and follow any thread I choose.

**Acceptance Criteria:**

**Given** D3 zoom behavior is active on the canvas
**When** I scroll the mouse wheel
**Then** the graph zooms around the cursor position within defined bounds (minimum shows focal artist + all 1-hop neighbors; maximum makes node labels legible)
**When** I click-drag
**Then** the graph pans smoothly; releasing the drag stops panning immediately

**Given** I click a non-focal node
**When** the click event fires
**Then** D3 immediately begins the force simulation transition — no loading indicator appears first
**And** the clicked node transitions to focal visual state (White Rabbit, `NODE_RADIUS_FOCAL`) over `PIVOT_DURATION_MS` (~700ms)
**And** nodes leaving the graph drift outward and fade out
**And** new nodes entering drift in from the edges and fade in

**Given** `prefersReducedMotion()` returns `true` during a pivot
**When** the transition runs
**Then** node positions update instantly via cross-fade — no drift animation

**Given** a pivot completes
**When** I inspect the browser
**Then** the URL has updated to `/artist/[new-slug]` via `pushState` (no page navigation)
**And** pressing Back restores the previous focal artist's full graph
**And** refreshing the page after pivot reloads the current focal artist (not the original)

**Given** `GraphCanvas.test.tsx` is implemented
**When** I run `npm run test:run`
**Then** integration tests pass: SVG renders correct node count, pivot updates focal node visual state, zoom behavior initializes correctly

---

### Story 1.11: Artist Search Input & Top Nav

As a music lover,
I want to type an artist name and see instant autocomplete suggestions,
So that I can find and load any artist's graph in a single fluid action.

**Acceptance Criteria:**

**Given** `<ArtistSearchInput>` built on Radix cmdk Combobox
**When** I type "radio"
**Then** a dropdown appears within `SEARCH_DEBOUNCE_MS` (300ms) showing results including "Radiohead"
**And** each result shows artist name (13px/text-primary) + disambiguating detail (11px/text-secondary)
**And** Arrow keys cycle through results; Enter selects; Tab moves focus
**And** an ARIA live region announces the result count to screen readers

**Given** I type a query matching no artists
**When** the search resolves
**Then** the dropdown shows "No artists found for '[query]'" and the graph is unchanged

**Given** I press Escape while the dropdown is open
**Then** the dropdown closes; the graph and URL are unchanged

**Given** I select a result
**When** the selection fires
**Then** `useDigStore.setFocalArtist(mbid)` is called, the URL updates to `/artist/[slug]`, and the dropdown closes

**Given** `<TopNav>` is the 48px frosted-glass bar
**When** the app loads
**Then** TopNav is always visible at the top, uses `backdrop-blur` + chrome token
**And** the search input fills available width
**And** a filter toggle icon button sits right-aligned (inactive state, no dot indicator yet)
**And** TopNav height is 48px and does not obscure the focal artist node

**Given** `ArtistSearchInput.test.tsx` is implemented
**When** I run `npm run test:run`
**Then** tests cover: idle state renders, results appear on typing, no-results message, Escape closes, onSelect called with correct MBID

---

### Story 1.12: Landing Page, Artist Route & Not-Found Pages

As a music lover,
I want an instantly-loaded landing graph and direct URL access to any artist,
So that Dig's first impression is immediate and every graph state is shareable from the start.

**Acceptance Criteria:**

**Given** `public/data/miles-davis.json` is generated by running `graph-builder.ts` against Miles Davis's live MBID
**When** I inspect the file
**Then** it exactly conforms to the `GraphData` TypeScript interface
**And** it was NOT hand-crafted — it was produced by `graph-builder` to guarantee structural consistency
**And** it contains at least one visible cross-genre connection accessible without pivoting (the aha moment)

**Given** `src/app/page.tsx` (landing page) is implemented
**When** I load localhost:3000
**Then** the Miles Davis graph appears within 1 second — no API call, no loading state
**And** "Follow the thread." appears as subtitle copy beneath the search bar

**Given** `src/app/artist/[slug]/page.tsx` is implemented
**When** I navigate to `/artist/radiohead`
**Then** `resolveSlug('radiohead')` resolves to Radiohead's MBID
**And** `useArtistGraph(mbid)` triggers and the graph loads progressively (focal artist first)
**And** Zustand `focalArtistId` is set to Radiohead's MBID

**Given** an unknown slug is navigated to (e.g., `/artist/xxxxunknown`)
**When** resolution fails
**Then** `src/app/artist/[slug]/not-found.tsx` renders: search bar prominent, text "We couldn't find that artist. Try searching above."
**And** HTTP status is 404 (not 200 or 500)
**And** the user can search from the not-found page

---

## Epic 2: Exploration Depth

Users can hover any node to see artist details and hear an audio preview, expand a node to go one hop deeper on demand, filter the graph by era (with epoch labels) and genre, and see honest data coverage indicators.

### Story 2.1: Node Hover & Artist Detail Panel (Desktop)

As a music lover,
I want to hover any node to reveal the artist's name, genre, and era,
So that I can preview an artist's context before deciding whether to pivot to them.

**Acceptance Criteria:**

**Given** a non-focal node is hovered for ≥200ms
**When** the cursor enters the node bounds
**Then** `<NodeDetailPanel>` opens on the right side of the canvas (280px wide, frosted glass, `surface-elevated` token)
**And** the panel shows: artist name (detail-title: 16px/600/text-primary), genre tags (detail-body: 13px/text-secondary), era/active years (detail-body)
**And** the panel does not obscure the focal artist node at canvas center
**And** an `<AudioPreviewControl>` slot is reserved (renders empty until Story 2.2 is merged)

**Given** the cursor leaves the node
**Then** `<NodeDetailPanel>` closes

**Given** a keyboard user focuses a node and presses Enter/Space
**When** the action fires
**Then** the detail panel opens with `role="dialog"` and `aria-label="[Artist name] details"`
**And** pressing Escape closes the panel

**Given** `NodeDetailPanel.test.tsx` is implemented
**When** I run `npm run test:run`
**Then** tests cover: correct artist data renders, closes on cursor leave, Escape key closes

---

### Story 2.2: Audio Preview Integration (Spotify + AudioPreviewControl)

As a music lover,
I want to hear a short audio preview when I hover an artist node,
So that the graph becomes a sensory experience — not purely visual.

**Acceptance Criteria:**

**Given** `AudioPreviewProvider` interface in `src/lib/audio/audio-preview.ts`
**When** I inspect the file
**Then** it defines `getPreviewUrl(mbid: string): Promise<string | null>` only
**And** no client component imports it directly — only `src/app/api/preview/[mbid]/route.ts` consumes it

**Given** `GET /api/preview/[mbid]` is called with a valid MBID
**Then** it returns `{ data: { previewUrl: string } }` when available
**And** `{ data: { previewUrl: null } }` when unavailable (not `{ error }`)
**And** `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are accessed server-side only
**And** `revalidate = 0`

**Given** a node is hovered and a preview is available
**When** `HOVER_DWELL_MS` (500ms) of dwell elapses
**Then** audio begins playing; the play button becomes pause; the waveform animates
**And** if the cursor leaves before 500ms, no audio starts

**Given** audio is playing from one node and I hover a second node
**When** the second node's dwell completes
**Then** the first audio stops and the second begins (one active preview at a time)

**Given** no Spotify preview is available for an artist
**When** `<NodeDetailPanel>` opens
**Then** `<AudioPreviewControl>` is NOT rendered — not disabled, not greyed — the slot is absent

---

### Story 2.3: On-Demand Hop Expansion

As a music lover,
I want to expand any leaf node to reveal one additional hop of influence relationships,
So that I can go deeper on a specific branch without loading the entire graph at once.

**Acceptance Criteria:**

**Given** a leaf node (at current depth boundary) is hovered
**When** the cursor enters the node
**Then** an expand affordance (ring indicator or + icon) appears on the node perimeter
**And** the affordance is visible only on leaf nodes — not on nodes that already have children rendered

**Given** I click the expand affordance
**When** the request fires
**Then** `GET /api/graph/[mbid]/expand` is called for that node's MBID only
**And** new nodes drift in from the canvas edges (not teleport from nothing)
**And** existing nodes reposition via force simulation to accommodate new nodes
**And** expansion completes within 2 seconds

**Given** expansion finds no additional data for a node
**When** the API returns an empty result
**Then** a `<DataThinBadge>` appears on that node
**And** the node itself remains in the graph (not removed)

**Given** I expand node A and then node B
**When** I inspect the graph
**Then** expanding node A did not expand any other leaf nodes — expansion is strictly per-node

**Given** `/api/graph/[mbid]/expand/route.ts` is implemented
**When** called with a valid MBID
**Then** it returns only the new `artists[]` and `edges[]` for the +1 hop
**And** `revalidate = 3600`

---

### Story 2.4: Era & Genre Filters

As a music lover,
I want to filter the influence graph by era and genre,
So that I can narrow to the connections most relevant to the time period or style I'm exploring.

**Acceptance Criteria:**

**Given** I click the `<FilterToggle>` icon in the TopNav
**When** the toggle activates
**Then** `<FilterPanel>` slides down from under TopNav via CSS `max-height` transition
**And** Era chips appear on the left, Genre chips on the right, "Clear All" far right

**Given** I click an Era chip for "1960s"
**When** the chip activates
**Then** it displays the full epoch label "1960s — British Invasion / Motown" (from `ERA_EPOCH_LABELS`)
**And** it has `role="checkbox"` with `aria-checked="true"` in selected state
**And** Zustand `setFilters` is called immediately (no "Apply" button)
**And** D3 `applyFilters()` dims out-of-era nodes to `NODE_OPACITY_DIMMED` (12%) — nodes are NOT removed

**Given** `src/graph/filters.ts` applies filters imperatively
**When** `applyFilters({ eras, genres })` is called
**Then** D3 selection updates node opacity — zero React re-renders of the graph occur
**And** nodes without era/genre data remain visible (not dimmed) when filters are active

**Given** Genre chips for "Rock" and "Electronic" are both active
**When** filters apply
**Then** nodes matching Rock OR Electronic remain at full opacity (OR logic within genre)

**Given** I click "Clear All"
**When** the action fires
**Then** all chips deactivate, Zustand filters reset, all nodes return to full opacity immediately

**Given** filters are active and I collapse the `<FilterPanel>`
**When** the panel slides back up
**Then** the `<FilterToggle>` shows an amber dot (shape change — appears/disappears, not color-only)
**And** accompanied by `aria-label="Filters active"`
**And** node dimming persists on the canvas (filters stay active while panel is collapsed)

---

### Story 2.5: Data-Thin Indicators & Empty States

As a music lover,
I want honest, calm signals when influence data is sparse or unavailable,
So that I understand the picture without feeling like something is broken.

**Acceptance Criteria:**

**Given** an artist node has `isDataThin === true`
**When** I view it in the graph
**Then** a small amber dot (`#EDC458`) appears on the node perimeter — visual only, no text at the node level

**Given** a graph-level data-thin state is detected (focal artist has <3 total connections)
**When** the graph finishes loading
**Then** a graph-notice variant renders: "Limited data for this artist — showing what we have"
**And** it has `role="status"` and `aria-live="polite"` — announced after graph settles, not during transition
**And** it uses `text-dim` color, 14px/400

**Given** `<EmptyState>` is implemented with 3 variants
**When** a search query returns zero results
**Then** `no-search-results` variant shows: "No artists found for '[query]'" in the dropdown — graph unchanged
**When** `/artist/[slug]` loads for an artist with zero influence relationships
**Then** `no-influence-data` variant shows: "We don't have influence data for this artist yet." — focal artist node still renders
**When** an unknown slug is loaded
**Then** `artist-not-found` variant activates: "We couldn't find that artist. Try searching above."

**Given** `<GraphErrorBoundary>` wraps `<GraphCanvas>`
**When** the D3 engine throws an unhandled exception
**Then** `<GraphErrorState>` renders: "Having trouble reaching our data sources — try refreshing"
**And** the error is caught — no full-page crash
**And** none of the empty state or error variants use the words "unavailable", "failed", or "error" in user-facing copy

---

## Epic 3: Mobile & Accessibility

Dig works fully on any mobile device at 375px with the two-tap interaction model, and meets WCAG 2.1 AA for all chrome controls. The prefers-reduced-motion user preference is respected throughout.

### Story 3.1: Three-Tier Responsive Layout

As a music lover on any device,
I want chrome elements to adapt cleanly to my screen size,
So that the graph canvas is never obscured and the interface is always appropriately sized.

**Acceptance Criteria:**

**Given** Tailwind mobile-first authoring across all components
**When** I view the app at 375px (mobile)
**Then** the TopNav search bar is full-width, fixed at top
**And** the filter toggle appears as an icon button (filter panel not shown by default)
**And** graph nodes render at 80% of their desktop size (20% smaller to reduce collision density)

**Given** I view the app at 768px (tablet `md:` breakpoint)
**When** I interact with the layout
**Then** the desktop layout applies (FilterPanel available, right-side detail panel)
**And** touch inputs are treated as clicks (Radix primitives handle transparently)
**And** hover states are suppressed — no HoverCard hover previews on tablet

**Given** I view the app at 1024px+ (desktop `lg:` breakpoint)
**When** I interact
**Then** the full hover model works: HoverCard previews, right-side 280px `NodeDetailPanel`, horizontal FilterPanel strip

**Given** I resize the browser from wide to 375px
**When** the resize event fires
**Then** no layout breaks at any intermediate width
**And** the D3 simulation recenters on the focal artist after resize

**Given** `touch-action: none` is applied to the canvas SVG
**When** a user swipe-drags on the canvas
**Then** the page does not scroll — only the graph pans
**And** TopNav and FilterPanel use `touch-action: auto` (vertical scroll preserved)

---

### Story 3.2: Mobile Two-Tap Interaction & Bottom Sheet Detail Panel

As a music lover on mobile,
I want to tap a node to preview it and tap again to navigate,
So that I can explore the influence graph on my phone without accidentally pivoting on every tap.

**Acceptance Criteria:**

**Given** I tap any non-focal node on a <768px viewport
**When** the first tap fires
**Then** a bottom sheet slides up from the bottom edge (full-width, `max-height: 40vh`)
**And** it shows: artist name (detail-title), genre, era, audio preview (begins playing immediately)
**And** it shows the pivot prompt: "Tap again to explore [Artist Name]" in `text-secondary`

**Given** the bottom sheet is open and I tap the same node a second time
**When** the second tap fires
**Then** the pivot commits: graph transitions, sheet closes, URL updates to `/artist/[slug]`

**Given** the bottom sheet is open and I tap outside the sheet or swipe down
**When** the dismiss gesture fires
**Then** the sheet closes with no pivot

**Given** a leaf node is shown in the bottom sheet
**When** the sheet is open
**Then** the expand affordance is accessible within the sheet (not hover-only)
**And** tapping the expand affordance triggers hop expansion for that node

**Given** an artist node has an audio preview available
**When** the bottom sheet opens (mobile)
**Then** audio begins immediately — no 500ms dwell required (sheet open = trigger)
**And** closing the sheet stops the audio

**Given** `NodeDetailPanel.test.tsx` is updated for mobile
**When** I run `npm run test:run`
**Then** tests cover the mobile variant: opens on first tap, pivot on second tap, dismisses on outside tap

---

### Story 3.3: prefers-reduced-motion Support

As a user who has enabled reduced motion in their OS,
I want all animations replaced with instant transitions,
So that the product is safe and comfortable for me to use.

**Acceptance Criteria:**

**Given** `prefers-reduced-motion: reduce` is active (emulated via Chrome DevTools)
**When** the landing page loads
**Then** the Miles Davis graph appears at final node positions — no settlement animation plays

**Given** I pivot to a new artist with reduced motion active
**When** the pivot fires
**Then** node positions update instantly via cross-fade — no drift-and-settle physics
**And** URL updates correctly, back button works

**Given** new nodes load progressively with reduced motion active
**When** nodes arrive from API
**Then** they appear at their final positions — no drift-in animation
**And** the focal artist still appears first (progressive reveal is maintained)

**Given** the D3 engine files `simulation.ts`, `pivot.ts`, `expand.ts`
**When** I search for `window.matchMedia` in `src/graph/`
**Then** zero direct calls exist — all access goes through `prefersReducedMotion()` from `src/lib/motion.ts`

---

### Story 3.4: Accessibility Audit & WCAG 2.1 AA Compliance

As a user relying on keyboard navigation or assistive technology,
I want all chrome controls to be fully keyboard-accessible with visible focus indicators,
So that I can use Dig's search, filters, and artist details without a mouse.

**Acceptance Criteria:**

**Given** I navigate the app using only the Tab key
**When** I tab through the interface
**Then** Tab order is: search input → filter toggle → filter chips (when panel open) → detail panel close (when open)
**And** every focused element shows a visible focus ring: `focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2`
**And** no interactive chrome element is unreachable by keyboard

**Given** I run axe DevTools against the app
**When** the scan completes
**Then** zero WCAG 2.1 AA violations are reported for all chrome elements (search, filters, detail panel, audio control)
**And** all non-text icon controls have `aria-label` or Radix `VisuallyHidden` text

**Given** every interactive chrome element
**When** I measure its clickable/tappable area
**Then** it is at minimum 44×44px (`.touch-target` utility applied)

**Given** genre-family node colors carry semantic meaning
**When** I emulate Deuteranopia in Chrome DevTools > Rendering
**Then** nodes remain distinguishable via shape variation (circle vs. circle with ring) as a secondary differentiator
**And** influence direction (left/right) is readable purely through spatial position — no color dependency

**Given** the graph canvas SVG with `role="img"`
**When** a screen reader announces the element
**Then** it reads: "Influence graph centered on [artist]. [N] influences, [M] influenced artists."
**And** individual nodes are NOT announced as traversable (full keyboard traversal is intentionally deferred to v2)

**Given** all accessibility work is complete
**When** I run cross-browser smoke tests (Chrome, Firefox, iOS Safari) at 375px, 768px, and 1024px
**Then** no layout breaks or interaction regressions appear at any breakpoint