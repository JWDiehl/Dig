---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-25'
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-Dig-2026-05-24/prd.md"
  - "_bmad-output/planning-artifacts/prds/prd-Dig-2026-05-24/addendum.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/briefs/brief-Dig-2026-05-24/brief.md"
workflowType: 'architecture'
project_name: 'Dig'
user_name: 'Jon'
date: '2026-05-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (17 total, 6 feature areas):**
- **Artist Search (FR-1–3):** Live MusicBrainz autocomplete, 300ms debounced, result selection drives graph load and URL update, zero-result empty state
- **Influence Graph (FR-4–7):** D3.js force-directed, Focal Artist centered, upstream left / downstream right, 2-hop default depth, data-thin indicator, on-demand per-node hop expansion
- **Graph Interaction (FR-8–11):** Node click → pivot, hover → detail panel + audio, pan/zoom (scroll/pinch), mobile tap-to-pivot
- **Filters (FR-12–13):** Era (decade buckets) and genre (multi-select OR), client-side, nodes dimmed not hidden, filter active state always surfaced
- **Audio Preview (FR-14–15):** Spotify 30s preview, 500ms hover dwell, one-at-a-time, graceful absence (not error), abstracted interface (swappable source per FR-15)
- **Shareable URLs (FR-16–17):** Next.js `/artist/[slug]` routing, pushState on pivot, back-button support, unknown slug → search-bar page (not 500)

**Non-Functional Requirements:**
- **Performance:** Initial graph render ≤3s (major artists, ≥10Mbps); hop expansion ≤2s; search autocomplete ≤300ms
- **External API resilience:** Wikipedia, Wikidata, MusicBrainz — all unreliable, rate-limited, no SLA. Partial data always preferable to crash. Graceful degradation required for any source.
- **No backend database:** Live API fetch only. No ETL pipeline. No hosted data store.
- **Audio abstraction:** Spotify preview integration must be behind a swappable interface (FR-15 is an explicit architectural requirement, not a suggestion)
- **Accessibility:** WCAG 2.1 AA for all chrome controls; graph canvas `role="img"` with aria-label; full graph keyboard traversal deferred to v2
- **Responsive:** Mobile-first, 375px baseline; three tiers: <768px (mobile), 768–1023px (tablet), 1024px+ (desktop)
- **Reduced motion:** `prefers-reduced-motion` support — physics disabled, instant pivot cross-fade substituted
- **Open source:** MIT license; no proprietary dependencies restricting redistribution

**Scale & Complexity:**
- Primary domain: Client-heavy full-stack web (Next.js + D3.js dominant)
- Complexity level: Medium — no auth, no DB, no user data; offset by high animation/physics complexity and 3-API integration layer
- Estimated architectural components: ~10 major (graph engine, data layer, search, routing, filter, audio, landing, detail panel, empty states, responsive shell)

### Technical Constraints & Dependencies

- **Next.js** (App Router) — routing, SSG for `/artist/[slug]`, Vercel deployment target
- **D3.js** — force simulation, zoom/pan, SVG rendering, owns all canvas DOM
- **Tailwind CSS** — all visual styling, dark-by-default, mobile-first utilities
- **Radix UI** — headless primitives: Combobox (search), HoverCard/Popover (detail panel), Tooltip (expand affordance), VisuallyHidden
- **Three external data APIs:**
  - Wikipedia MediaWiki API — infobox parsing (primary upstream influence source)
  - Wikidata SPARQL — P737 reverse queries (primary downstream source), P737 forward queries (secondary upstream)
  - MusicBrainz REST API — artist metadata: canonical IDs, genres, dates, images (NOT influence edges — pre-build sampling confirmed zero coverage)
- **Spotify Web API** — 30s preview URLs (behind abstraction interface; known availability risk per market)
- **Deployment:** Vercel or equivalent serverless/static host (no self-managed server)
- **OQ-3 (unresolved):** Slug format for special characters, non-Latin names, name collisions — MusicBrainz canonical IDs as fallback; needs decision before routing implementation

### Cross-Cutting Concerns Identified

1. **External API resilience** — Affects search, graph load, hop expansion, audio. All three data sources can fail independently. Architecture must define consistent error propagation and partial-success handling.
2. **Data normalization** — Wikipedia infobox, Wikidata SPARQL, and MusicBrainz return different schema shapes. A unified internal model (`Artist`, `InfluenceEdge`) must be defined before any component consumes data.
3. **Progressive/incremental loading** — The focal artist renders immediately; data arrives in parts. The graph component must accept streaming updates, not a single resolved payload.
4. **URL-as-state** — Pivot updates URL via pushState. Back button must restore full graph state. Refresh must reload from URL slug. Slug→ID resolution is a critical path on every page load.
5. **D3 + React DOM ownership** — D3's force simulation mutates DOM; React reconciles DOM. This boundary must be resolved explicitly in `<GraphCanvas>` architecture before implementation begins.
6. **Responsive layout** — Full-bleed D3 canvas resizes with viewport. Chrome layout (detail panel, filter strip) changes between three tiers. Canvas resize must trigger D3 simulation recentering.
7. **`prefers-reduced-motion`** — D3 simulation behavior must branch at runtime: full physics (default) vs. instant position assignment (reduced motion).
8. **Data-thin detection** — Threshold logic (< 3 influence relationships, per assumption) must be applied consistently across initial load, hop expansion, and unknown-slug paths.

## Starter Template Evaluation

### Primary Technology Domain

Client-heavy full-stack web application. Next.js handles routing, SSR/SSG, and the Vercel deployment target. D3.js dominates the client-side rendering surface.

### Starter Options Considered

- **create-next-app@latest** — Official Next.js scaffold. Current version 16.2.6 LTS (May 2026). Defaults now include TypeScript, Tailwind, ESLint, App Router, Turbopack, and `@/*` import alias. Also generates `AGENTS.md` for AI agent guidance.
- **Custom/manual setup** — Rejected. No meaningful advantage over `create-next-app` for this stack; adds setup overhead without benefit.
- **T3 stack (create-t3-app)** — Rejected. Includes tRPC, Prisma, NextAuth — all irrelevant to a no-database, no-auth project. Adds friction, not value.

### Selected Starter: create-next-app@latest

**Rationale:** Minimal, official, current. Provides exactly what Dig needs (TypeScript, Tailwind, App Router) and nothing it doesn't (no ORM, no auth, no unnecessary abstractions). Turbopack dev server is a genuine quality-of-life improvement for iterative D3 development.

**Initialization Command:**

```bash
npx create-next-app@latest dig \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Post-initialization package installs:**

```bash
# Graph rendering
npm install d3
npm install --save-dev @types/d3

# Radix UI headless primitives (accessibility layer)
npm install @radix-ui/react-popover
npm install @radix-ui/react-hover-card
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-visually-hidden
npm install cmdk   # Command/Combobox pattern built on Radix — for artist search
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript throughout. Strict mode enabled. `@/*` absolute imports from `src/`.

**Styling Solution:**
Tailwind CSS v4 (included by create-next-app). `tailwind.config.ts` at root. Design tokens (colors, spacing) defined in `theme.extend` per UX spec. Dark mode: `class` strategy — but since the entire app is dark-by-default, `:root` defaults suffice; no class toggling needed.

**Build Tooling:**
Turbopack for development (faster HMR — meaningful for iterative D3 work). Standard Next.js webpack for production builds. Vercel deployment via `next build`.

**Testing Framework:**
Not included by default — addressed in architectural decisions (Step 4). Jest + React Testing Library is the conventional choice; Vitest is the performance-oriented alternative.

**Code Organization (src/ directory structure):**

```
src/
  app/                    # Next.js App Router
    page.tsx              # Landing — pre-baked Miles Davis graph
    layout.tsx            # Root layout (dark canvas shell)
    artist/
      [slug]/
        page.tsx          # /artist/[slug] route
  components/             # React components (chrome layer)
    search/
    filters/
    detail-panel/
    nav/
    empty-states/
  graph/                  # D3 graph engine (canvas layer)
    GraphCanvas.tsx       # SVG mount point + D3 lifecycle
    simulation.ts         # Force simulation logic
    nodes.ts              # Node rendering + state management
    edges.ts              # Edge rendering
    zoom.ts               # Zoom/pan behavior
    pivot.ts              # Pivot transition animation
  lib/                    # Data layer
    data/
      types.ts            # Artist, InfluenceEdge — unified internal model
      wikipedia.ts        # Wikipedia infobox API client
      wikidata.ts         # Wikidata SPARQL client
      musicbrainz.ts      # MusicBrainz REST client
      graph-builder.ts    # Assembles Artist + InfluenceEdge from multi-source data
    audio/
      audio-preview.ts    # AudioPreview interface (swappable)
      spotify.ts          # Spotify implementation
    slugs.ts              # Slug ↔ MusicBrainz ID resolution
  hooks/                  # Custom React hooks
  types/                  # Shared TypeScript types
public/
  data/
    miles-davis.json      # Pre-baked landing graph (static, no API call)
```

**D3 + React Integration Pattern:**
D3 owns the SVG element. `<GraphCanvas>` renders an `<svg>` element and passes a `useRef` reference to the D3 engine. D3 directly manipulates SVG DOM on each simulation tick — React never re-renders the graph internals. This is mandatory for 60fps force simulation performance with 50+ nodes. React owns all chrome components; D3 owns everything inside the SVG boundary.

**Development Experience:**
- Turbopack HMR — fast iteration on D3 layout and animation tuning
- TypeScript strict — catches D3 datum typing issues early
- ESLint with Next.js rules — enforces App Router best practices
- `@/*` imports — no `../../` chains in deeply nested graph utilities

**Note:** Project initialization using the command above should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data fetching location: Next.js API Routes proxy for all sources
- Slug format: Human-readable + MBID-suffix on collision (OQ-3 resolved)
- D3/React DOM boundary: D3 owns SVG (decided in step 3)
- Client state management: Zustand

**Important Decisions (Shape Architecture):**
- Data fetching library: TanStack Query (React Query)
- Testing framework: Vitest
- API response shape: `{ data }` | `{ data, warnings }` | `{ error, code }`
- Edge caching: Vercel ISR at 1-hour revalidation for graph API routes

**Deferred Decisions (Post-MVP):**
- Filter state in URL (v2)
- Full graph keyboard accessibility (acknowledged deferral)
- Error monitoring / Sentry (not needed for v1 passion project)

### Data Architecture

**Data Fetching Location: Next.js API Routes (server-side proxy)**
- Rationale: Spotify Client Credentials OAuth requires server-side; consistent pattern to proxy all three data sources avoids mixed client/server fetch logic; enables edge caching; centralizes rate limiting
- All API calls originate from Next.js API Routes, never directly from the browser
- Spotify credentials stored in `.env.local`, never shipped to client

**Data Fetching Library: TanStack Query v5**
- Rationale: Request deduplication (same artist graph won't double-fetch in a session), stale-while-revalidate caching, loading/error state management, prefetching support for adjacent nodes on hover — all directly relevant to Dig's progressive loading pattern
- Used client-side to fetch from `/api/` routes

**Edge Caching: Vercel ISR**
- Graph API routes: `revalidate = 3600` (1 hour). Popular artist graphs served from edge cache — directly addresses 3s render NFR for major artists.
- Search API route: `revalidate = 86400` (24 hours). Artist name data changes rarely.
- Preview URL route: `revalidate = 0` (no cache). Spotify URLs may expire.

**Slug Format: Human-readable + MBID suffix on collision (OQ-3 resolved)**
- Generation: Normalize artist name → unicode-to-ASCII → lowercase → hyphenate → URL-safe
- Examples: `miles-davis`, `the-beatles`, `björk` → `bjork`
- Collision handling: Append 4-char MBID fragment → `john-coltrane-a74b`
- Resolution: Slug stored alongside MBID in MusicBrainz lookup; MBID is the canonical ID for all internal data operations; slug is URL-display only

**Unified Internal Data Model:**

```typescript
// src/lib/data/types.ts
interface Artist {
  mbid: string           // MusicBrainz canonical ID
  slug: string           // URL slug (generated, stored)
  name: string
  genres: string[]       // from MusicBrainz
  era: string | null     // active decade/era
  imageUrl: string | null
  isDataThin: boolean    // < 3 influence relationships
}

interface InfluenceEdge {
  sourceId: string       // Artist mbid
  targetId: string       // Artist mbid
  direction: 'upstream' | 'downstream'
  confidence: 'high' | 'medium' | 'low'  // source quality
}

interface GraphData {
  focalArtist: Artist
  artists: Artist[]
  edges: InfluenceEdge[]
  depth: number
  warnings: string[]     // partial source failures
}
```

### Authentication & Security

**No user authentication** — Dig is stateless for users. No session, no accounts.

**Spotify API credentials** — Client ID + Secret stored in `.env.local`. Server-side only via Next.js API Route. Never exposed in client bundle. Client Credentials OAuth flow runs on the server; only the preview URL (not the token) is returned to client.

### API & Communication Patterns

**API Route Structure:**

```
GET /api/search?q={query}          → Artist search (MusicBrainz)
GET /api/graph/{mbid}              → Influence graph (Wikipedia + Wikidata + MusicBrainz)
GET /api/graph/{mbid}/expand       → One-hop expansion for a specific node
GET /api/preview/{mbid}            → Spotify preview URL
```

**API Response Shape (consistent across all routes):**

```typescript
// Success
{ data: T }
// Partial success — graph rendered with available data, source(s) degraded
{ data: T, warnings: string[] }
// Total failure
{ error: string, code: number }
```

- Partial success is first-class — maps directly to "partial data preferable to crash" NFR
- `warnings` array surfaces to DataThinBadge component when non-empty

**Error Handling Standard:**
- Network errors → `{ error: "Unable to reach data sources", code: 503 }`
- Unknown slug → `{ error: "Artist not found", code: 404 }`
- Partial source failure → `{ data: partialGraph, warnings: ["Wikipedia unavailable"] }`
- `isDataThin` computed server-side based on edge count threshold (< 3)

### Frontend Architecture

**Client State Management: Zustand**
- Rationale: Lightweight (1kb), flat store, no boilerplate, no Context re-render cascades
- Store shape:

```typescript
interface DigStore {
  focalArtistId: string | null
  filterEras: string[]
  filterGenres: string[]
  audioPreviewId: string | null  // currently playing node
  setFocalArtist: (id: string) => void
  setFilters: (era: string[], genres: string[]) => void
  setAudioPreview: (id: string | null) => void
}
```

- D3 simulation state (node positions, velocities) lives entirely inside D3 — not in Zustand
- URL is the source of truth for `focalArtistId` on page load; Zustand syncs from URL

**Component Architecture:**
- React owns: all chrome (nav, search, filters, detail panel, empty states)
- D3 owns: everything inside the `<svg>` element (nodes, edges, zoom, simulation)
- Boundary: `<GraphCanvas>` component — React renders the `<svg>` mount point, passes `useRef` to D3 engine, passes filter state as props for D3 to apply dimming

**Audio Preview Architecture:**

```typescript
// src/lib/audio/audio-preview.ts
interface AudioPreviewProvider {
  getPreviewUrl(mbid: string): Promise<string | null>
}

// src/lib/audio/spotify.ts — implements AudioPreviewProvider
// Swap this file to change provider; interface contract unchanged
```

### Infrastructure & Deployment

**Hosting: Vercel**
- Production: auto-deploy from `main` branch
- Preview: auto-deploy on every PR (full Next.js environment)
- Environment variables: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` in Vercel dashboard

**CI/CD: GitHub Actions + Vercel**
- Vercel handles deployment automatically
- GitHub Actions runs on PR: `vitest run` + `eslint` — must pass before merge

**Testing Framework: Vitest**
- Rationale: Fast, native ESM, TypeScript-native, modern ecosystem default
- Scope: Unit tests for data layer (graph-builder, slug generation, API response parsing), component tests for chrome components via React Testing Library
- D3 graph engine: integration-tested via rendered SVG output, not unit-tested

**No error monitoring in v1** — Browser DevTools sufficient for a passion project. Sentry integration noted as a straightforward v2 addition if the app goes public.

### Decision Impact Analysis

**Implementation Sequence (decisions must be respected in this order):**
1. Data model types (`Artist`, `InfluenceEdge`, `GraphData`) — everything depends on this
2. API Routes + three data source clients — graph rendering depends on this
3. Slug resolution — routing depends on this
4. Zustand store — graph ↔ chrome communication depends on this
5. D3 `<GraphCanvas>` engine — all graph features depend on this
6. Chrome components — depend on store and data shape

**Cross-Component Dependencies:**
- Filter state (Zustand) → D3 engine applies dimming to nodes (not a React re-render)
- URL slug → Zustand focalArtistId → TanStack Query fetches graph data
- TanStack Query response → D3 engine receives new `GraphData` → re-runs simulation
- `AudioPreviewProvider` → Zustand `audioPreviewId` → `AudioPreviewControl` component

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

9 areas where AI agents could make different, incompatible choices without explicit rules: file naming, component exports, TypeScript type vs interface, test file placement, D3 selection patterns, Zustand store access, TanStack Query hook conventions, Tailwind class ordering, and null vs undefined for missing data.

---

### Naming Patterns

**File Naming Conventions:**

| File type | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `GraphCanvas.tsx`, `ArtistNode.tsx` |
| Hooks | camelCase, prefixed `use` | `useArtistGraph.ts`, `useFilterState.ts` |
| D3 engine modules | camelCase `.ts` | `simulation.ts`, `pivot.ts`, `zoom.ts` |
| Data/lib utilities | camelCase `.ts` | `graph-builder.ts`, `slugs.ts` |
| API route files | Next.js convention `route.ts` | `app/api/graph/[mbid]/route.ts` |
| Type definition files | camelCase `.ts` | `types.ts` |
| Test files | Same name + `.test.ts(x)` | `GraphCanvas.test.tsx`, `slugs.test.ts` |
| Constants files | camelCase `.ts` | `constants.ts` |

**API Route Naming:**
- Routes: plural nouns, kebab-case — `/api/search`, `/api/graph`, `/api/preview`
- Route parameters: `[mbid]` — always the MusicBrainz ID, never `[id]` or `[artistId]`
- Query parameters: camelCase — `?q=radiohead`, `?depth=2`

**Code Naming:**
- Components: PascalCase — `GraphCanvas`, `ArtistSearchInput`, `NodeDetailPanel`
- Zustand store hook: `useDigStore` (single named export from `src/store/index.ts`)
- TanStack Query hooks: `useArtistGraph(mbid)`, `useArtistSearch(query)`, `useAudioPreview(mbid)` — prefixed `use`, noun describes the data
- Event handlers on components: `on` prefix for props, `handle` prefix for implementations
  - Prop: `onPivot`, `onNodeHover`, `onFilterChange`
  - Implementation: `handlePivot`, `handleNodeHover`, `handleFilterChange`
- D3 internal functions: verb-noun — `renderNodes()`, `updateEdges()`, `applyFilters()`
- Constants: SCREAMING_SNAKE_CASE — `DEFAULT_GRAPH_DEPTH`, `DATA_THIN_THRESHOLD`, `PIVOT_DURATION_MS`

---

### Structure Patterns

**Component File Structure:**
Single file per component — no `ComponentName/index.tsx` directory pattern. Exception: if a component grows beyond ~200 lines with significant sub-components, it may split into a directory. Default: single file.

```
// ✅ Correct
src/components/search/ArtistSearchInput.tsx
src/components/search/SearchResultItem.tsx

// ❌ Avoid (directory pattern only if truly needed)
src/components/search/ArtistSearchInput/index.tsx
```

**Test File Placement:**
Co-located with source files — not in a separate `__tests__/` directory.

```
// ✅ Correct
src/lib/data/slugs.ts
src/lib/data/slugs.test.ts

src/components/search/ArtistSearchInput.tsx
src/components/search/ArtistSearchInput.test.tsx

// ❌ Avoid
src/__tests__/slugs.test.ts
```

**Component Exports:**
Named exports only — no default exports from component files.

```typescript
// ✅ Correct
export function GraphCanvas({ ... }: GraphCanvasProps) { ... }
export function ArtistSearchInput({ ... }: ArtistSearchInputProps) { ... }

// ❌ Avoid
export default function GraphCanvas() { ... }
```

Exception: Next.js route files (`page.tsx`, `layout.tsx`, `route.ts`) must use default exports per Next.js App Router convention.

**Index Barrel Files:**
Each `src/` subdirectory that is consumed by other modules exports via `index.ts`.

```typescript
// src/lib/data/index.ts
export type { Artist, InfluenceEdge, GraphData } from './types'
export { buildGraph } from './graph-builder'
export { resolveSlug, generateSlug } from './slugs'
```

---

### TypeScript Patterns

**Interface vs Type:**
- `interface` for all data model shapes (`Artist`, `InfluenceEdge`, `GraphData`, component props)
- `type` for unions, intersections, and utility types only

```typescript
// ✅ Correct
interface Artist { mbid: string; name: string; ... }
interface GraphCanvasProps { graphData: GraphData; onPivot: (mbid: string) => void }
type Direction = 'upstream' | 'downstream'
type ApiResponse<T> = { data: T } | { data: T; warnings: string[] } | { error: string; code: number }

// ❌ Avoid
type Artist = { mbid: string; name: string }
```

**Null vs Undefined:**
- Use `null` for data that may explicitly be absent (e.g., `imageUrl: string | null`)
- Use `undefined` only for optional function parameters/props
- Never use `null` and `undefined` interchangeably for the same field

```typescript
// ✅ Correct
interface Artist {
  imageUrl: string | null  // may have no image — null
  era: string | null       // may be unknown — null
}
function buildGraph(mbid: string, depth?: number): GraphData { ... }

// ❌ Avoid
imageUrl?: string  // when the field always exists but may be absent
```

**D3 Type Augmentation:**
D3 nodes must extend `SimulationNodeDatum`. Always type D3 data explicitly:

```typescript
// src/graph/types.ts
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'

interface GraphNode extends SimulationNodeDatum {
  mbid: string
  name: string
  genres: string[]
  direction: 'focal' | 'upstream' | 'downstream'
  isDataThin: boolean
  opacity: number  // managed by D3 for filter dimming
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  confidence: 'high' | 'medium' | 'low'
}
```

---

### Format Patterns

**API Response Consumption (TanStack Query):**
Always destructure from `useQuery` — never use the whole query object directly:

```typescript
// ✅ Correct
const { data, isPending, error } = useArtistGraph(mbid)
// Note: TanStack Query v5 uses `isPending`, NOT `isLoading`

// ❌ Avoid
const query = useArtistGraph(mbid)
if (query.isLoading) ...  // wrong v5 naming
```

**API Route Handler Pattern:**
All API routes follow the same handler shape:

```typescript
// src/app/api/graph/[mbid]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { mbid: string } }
): Promise<NextResponse> {
  try {
    const data = await buildGraph(params.mbid)
    if (data.warnings.length > 0) {
      return NextResponse.json({ data, warnings: data.warnings })
    }
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      return NextResponse.json({ error: 'Artist not found', code: 404 }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unable to reach data sources', code: 503 }, { status: 503 })
  }
}
```

**Date/Era Format:**
- Era stored as decade string: `"1960s"`, `"1970s"` (never as number `1960`)
- Filter chip label format: `"1960s — Soul / Funk"` (decade + epoch label)
- Epoch labels defined in `src/lib/data/constants.ts` as a lookup map

---

### D3 Integration Patterns

**Selection Storage:**
Store D3 selections in module-scoped variables within the D3 engine, not in React state or refs beyond the root SVG ref:

```typescript
// src/graph/GraphCanvas.tsx — React component
export function GraphCanvas({ graphData, filterState }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    initializeGraph(svgRef.current, graphData)
    return () => cleanupGraph()
  }, [])  // D3 owns lifecycle after mount

  useEffect(() => {
    if (!svgRef.current) return
    updateGraphData(graphData)  // D3 function, not React re-render
  }, [graphData])

  useEffect(() => {
    applyFilters(filterState)  // D3 applies opacity — no React re-render
  }, [filterState])

  return <svg ref={svgRef} className="w-full h-full" role="img" aria-label={...} />
}
```

**Animation Constants:**
All D3 timing and physics constants defined in `src/graph/constants.ts`:

```typescript
export const PIVOT_DURATION_MS = 700
export const NODE_RADIUS_FOCAL = 24
export const NODE_RADIUS_HOP1 = 16
export const NODE_RADIUS_HOP2 = 11
export const EDGE_OPACITY_DEFAULT = 0.13
export const NODE_OPACITY_DIMMED = 0.12
export const SIMULATION_ALPHA_DECAY = 0.028
export const HOVER_DWELL_MS = 500
export const SEARCH_DEBOUNCE_MS = 300
export const DATA_THIN_THRESHOLD = 3
```

**`prefers-reduced-motion` Check:**
Always use the shared utility, never inline the media query:

```typescript
// src/lib/motion.ts
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

---

### State Management Patterns

**Zustand Store Access:**
Always use the selector pattern — never subscribe to the whole store:

```typescript
// ✅ Correct
const focalArtistId = useDigStore((state) => state.focalArtistId)
const setFocalArtist = useDigStore((state) => state.setFocalArtist)

// ❌ Avoid
const { focalArtistId, setFocalArtist } = useDigStore()
```

**Filter State → D3:**
Filter changes never cause React re-renders of the graph. Filter state flows from Zustand → `<GraphCanvas>` prop → D3 `applyFilters()` function:

```typescript
// ✅ Correct: filter prop triggers D3 imperative update
useEffect(() => {
  applyFilters({ eras: filterEras, genres: filterGenres })
}, [filterEras, filterGenres])

// ❌ Avoid: filtering via React state causing SVG re-render
const visibleNodes = graphData.artists.filter(...)
```

---

### Process Patterns

**Loading State Handling:**
Progressive loading — never block render on data. Show focal artist immediately, fill in the rest. `isPending` from TanStack Query v5 drives the progressive animation state.

**Error Boundary Placement:**
One Error Boundary wraps `<GraphCanvas>`. Chrome components handle their own errors inline — they never throw to the boundary:

```typescript
<GraphErrorBoundary fallback={<GraphErrorState />}>
  <GraphCanvas ... />
</GraphErrorBoundary>
```

**Data-Thin Detection:**
Always computed server-side in `graph-builder.ts` using `DATA_THIN_THRESHOLD` constant. Never re-computed on the client. `isDataThin: boolean` is part of the `Artist` type and set once at the API layer.

**Tailwind Class Ordering:**
Follow the Prettier Tailwind plugin order (layout → box → typography → visual → interactive). Install `prettier-plugin-tailwindcss` — enforced via formatting, not memory.

---

### Enforcement Guidelines

**All AI Agents MUST:**
- Use named exports for all components (default export only for Next.js route files)
- Co-locate test files with source files (no `__tests__/` directories)
- Use `interface` for data shapes and component props; `type` for unions/utilities
- Use `null` (not `undefined`) for explicitly absent data fields in interfaces
- Use `isPending` (not `isLoading`) for TanStack Query v5 loading state
- Reference animation/physics constants from `src/graph/constants.ts` — never hardcode
- Access Zustand store via selector pattern — never destructure the whole store
- Never filter or transform graph data in React render — pass to D3 imperative functions
- Always check `prefersReducedMotion()` before starting D3 physics animation
- Use `DATA_THIN_THRESHOLD` constant — never hardcode the number `3`

**Anti-Patterns (Never Do):**

```typescript
// ❌ Default export components
export default function GraphCanvas() {}

// ❌ isLoading (TanStack Query v4 naming — we use v5)
const { isLoading } = useArtistGraph(mbid)

// ❌ Hardcoded animation duration
simulation.transition().duration(700)  // use PIVOT_DURATION_MS

// ❌ Whole-store Zustand subscription
const { focalArtistId } = useDigStore()

// ❌ Client-side data-thin computation
const isDataThin = artist.edges.length < 3  // use artist.isDataThin from API

// ❌ Filter via React state
const [visibleNodes, setVisibleNodes] = useState(graphData.artists)

// ❌ Inline prefers-reduced-motion check
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
// use prefersReducedMotion() utility
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
dig/
├── README.md
├── AGENTS.md                        # Next.js AI agent guidance (augment with arch decisions)
├── package.json
├── next.config.ts
├── tailwind.config.ts               # Design tokens in theme.extend.colors
├── tsconfig.json                    # strict: true, paths: { "@/*": ["./src/*"] }
├── vitest.config.ts
├── vitest.setup.ts                  # React Testing Library setup
├── .env.local                       # SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (gitignored)
├── .env.example                     # Template with placeholder values
├── .eslintrc.json
├── .prettierrc                      # includes prettier-plugin-tailwindcss
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                   # vitest run + eslint on PR
├── public/
│   └── data/
│       └── miles-davis.json         # Pre-baked landing graph (static, zero API call)
└── src/
    ├── app/                         # Next.js App Router
    │   ├── globals.css              # Tailwind base + CSS custom properties
    │   ├── layout.tsx               # Root layout: QueryClientProvider, dark canvas shell
    │   ├── page.tsx                 # Landing: loads miles-davis.json, no API fetch
    │   ├── not-found.tsx            # Global 404
    │   ├── artist/
    │   │   └── [slug]/
    │   │       ├── page.tsx         # /artist/[slug]: resolves slug→MBID, loads live graph
    │   │       └── not-found.tsx    # Unknown slug: search bar + "couldn't find artist"
    │   └── api/
    │       ├── search/
    │       │   └── route.ts         # GET /api/search?q= → MusicBrainz; revalidate=86400
    │       ├── graph/
    │       │   └── [mbid]/
    │       │       ├── route.ts     # GET /api/graph/[mbid] → full graph; revalidate=3600
    │       │       └── expand/
    │       │           └── route.ts # GET /api/graph/[mbid]/expand → +1 hop; revalidate=3600
    │       └── preview/
    │           └── [mbid]/
    │               └── route.ts     # GET /api/preview/[mbid] → Spotify URL; revalidate=0
    ├── components/                  # React chrome components (floating over canvas)
    │   ├── nav/
    │   │   ├── TopNav.tsx           # 48px frosted-glass bar, search + filter toggle
    │   │   └── TopNav.test.tsx
    │   ├── search/
    │   │   ├── ArtistSearchInput.tsx  # Radix cmdk Combobox; 300ms debounce
    │   │   ├── ArtistSearchInput.test.tsx
    │   │   └── SearchResultItem.tsx   # Artist name + disambiguating detail
    │   ├── filters/
    │   │   ├── FilterPanel.tsx      # Slide-down strip; collapsed by default
    │   │   ├── FilterPanel.test.tsx
    │   │   ├── FilterChip.tsx       # Era/genre chip; role="checkbox" + aria-checked
    │   │   └── FilterToggle.tsx     # Icon button + active dot indicator
    │   ├── detail-panel/
    │   │   ├── NodeDetailPanel.tsx  # HoverCard (desktop) / Popover bottom sheet (mobile)
    │   │   ├── NodeDetailPanel.test.tsx
    │   │   └── AudioPreviewControl.tsx  # Play/pause + waveform; absent when unavailable
    │   └── empty-states/
    │       ├── EmptyState.tsx       # Variants: no-search-results, artist-not-found, no-data
    │       ├── DataThinBadge.tsx    # node-level dot + graph-level notice variants
    │       └── GraphErrorState.tsx  # Error boundary fallback
    ├── graph/                       # D3 engine — owns SVG DOM entirely
    │   ├── GraphCanvas.tsx          # React SVG mount point; passes useRef to D3; Error Boundary host
    │   ├── GraphCanvas.test.tsx     # Integration test: renders SVG, pivot updates nodes
    │   ├── GraphErrorBoundary.tsx   # Wraps GraphCanvas; catches D3 exceptions
    │   ├── types.ts                 # GraphNode (extends SimulationNodeDatum), GraphLink
    │   ├── constants.ts             # PIVOT_DURATION_MS, NODE_RADIUS_*, EDGE_OPACITY_*, etc.
    │   ├── simulation.ts            # D3 forceSimulation setup, alpha management
    │   ├── nodes.ts                 # Node SVG rendering, genre color, state transitions
    │   ├── edges.ts                 # Edge SVG rendering, opacity by confidence
    │   ├── zoom.ts                  # d3.zoom behavior, min/max bounds, resize handler
    │   ├── pivot.ts                 # Pivot transition: recentering animation, pushState
    │   ├── expand.ts                # On-demand +1 hop: append nodes/edges, rerun simulation
    │   └── filters.ts               # applyFilters(): opacity dimming, never hides nodes
    ├── lib/                         # Data layer + utilities (server-safe unless noted)
    │   ├── data/
    │   │   ├── index.ts             # Barrel: re-exports types + graph-builder + slugs
    │   │   ├── types.ts             # Artist, InfluenceEdge, GraphData interfaces
    │   │   ├── constants.ts         # ERA_EPOCH_LABELS map, DATA_THIN_THRESHOLD = 3
    │   │   ├── wikipedia.ts         # MediaWiki infobox API client (upstream influences)
    │   │   ├── wikidata.ts          # SPARQL client: P737 forward + reverse queries
    │   │   ├── musicbrainz.ts       # MusicBrainz REST: artist metadata, genres, images
    │   │   ├── graph-builder.ts     # Orchestrates 3 sources → GraphData; sets isDataThin
    │   │   ├── graph-builder.test.ts
    │   │   ├── slugs.ts             # generateSlug(), resolveSlug(); OQ-3 resolved
    │   │   └── slugs.test.ts
    │   ├── audio/
    │   │   ├── index.ts             # Barrel
    │   │   ├── audio-preview.ts     # AudioPreviewProvider interface (swappable per FR-15)
    │   │   └── spotify.ts           # Spotify Client Credentials implementation
    │   ├── errors.ts                # ArtistNotFoundError, DataSourceError, PartialDataError
    │   └── motion.ts                # prefersReducedMotion() utility
    ├── store/
    │   ├── index.ts                 # useDigStore (Zustand): focalArtistId, filters, audio
    │   └── index.test.ts
    ├── hooks/                       # TanStack Query hooks (client-side)
    │   ├── useArtistGraph.ts        # useQuery → /api/graph/[mbid]
    │   ├── useArtistSearch.ts       # useQuery → /api/search?q= (debounced)
    │   └── useAudioPreview.ts       # useQuery → /api/preview/[mbid]
    └── types/
        └── index.ts                 # Re-exports shared types for convenient @/types imports
```

### Architectural Boundaries

**React / D3 Boundary — `<GraphCanvas>`**

The only point where React and D3 meet. React renders `<svg ref={svgRef}>` and manages the component lifecycle. Everything inside the `<svg>` is D3's domain. React never reads or writes SVG child elements after mount.

```
React territory                  │  D3 territory
─────────────────────────────────┼──────────────────────────────
<TopNav>                         │  <g class="edges"> ... </g>
<FilterPanel>                    │  <g class="nodes"> ... </g>
<NodeDetailPanel>                │  zoom behavior
<AudioPreviewControl>            │  force simulation
<GraphCanvas> → <svg ref={...}> ─┼─→ all SVG children
Zustand store reads              │  D3 selection mutations
TanStack Query data              │  animation timers
```

**Server / Client Boundary**

All external API calls happen server-side in Next.js API Routes. Nothing in `src/lib/data/` or `src/lib/audio/spotify.ts` is imported by client components — only by API route handlers.

```
Server (API Routes)              │  Client (React + D3)
─────────────────────────────────┼──────────────────────────────
wikipedia.ts                     │  useArtistGraph.ts
wikidata.ts                      │  useArtistSearch.ts
musicbrainz.ts                   │  useAudioPreview.ts
graph-builder.ts                 │  GraphCanvas.tsx + graph/*.ts
spotify.ts + credentials         │  AudioPreviewControl.tsx
ArtistNotFoundError              │  Zustand store
```

**External API Boundary**

```
                    ┌─────────────────────────────┐
                    │       Next.js API Routes      │
Browser ────────────│  /api/search                  │────→ MusicBrainz REST
  (TanStack Query)  │  /api/graph/[mbid]            │────→ Wikipedia MediaWiki
                    │  /api/graph/[mbid]/expand     │────→ Wikidata SPARQL
                    │  /api/preview/[mbid]          │────→ Spotify Web API
                    └─────────────────────────────┘
```

### Feature-to-Structure Mapping

| Feature (PRD) | Components | API Routes | Data Layer | D3 Engine |
|---|---|---|---|---|
| **FR-1–3: Artist Search** | `search/ArtistSearchInput.tsx`, `SearchResultItem.tsx` | `/api/search/route.ts` | `musicbrainz.ts`, `slugs.ts` | — |
| **FR-4: Graph render** | `graph/GraphCanvas.tsx` | `/api/graph/[mbid]/route.ts` | `graph-builder.ts`, all 3 clients | `simulation.ts`, `nodes.ts`, `edges.ts` |
| **FR-5: Node identity** | — | — | `musicbrainz.ts` (images) | `nodes.ts` |
| **FR-6: Data-Thin indicator** | `empty-states/DataThinBadge.tsx` | graph-builder sets `isDataThin` | `constants.ts` (threshold) | `nodes.ts` (amber dot) |
| **FR-7: Hop expansion** | — | `/api/graph/[mbid]/expand/route.ts` | `graph-builder.ts` | `expand.ts` |
| **FR-8: Pivot** | — | — | `slugs.ts` (URL update) | `pivot.ts` |
| **FR-9: Node hover** | `detail-panel/NodeDetailPanel.tsx` | — | — | `nodes.ts` (hover state) |
| **FR-10: Pan/zoom** | — | — | — | `zoom.ts` |
| **FR-11: Mobile touch** | `detail-panel/NodeDetailPanel.tsx` (Popover variant) | — | — | `zoom.ts`, `nodes.ts` |
| **FR-12–13: Filters** | `filters/FilterPanel.tsx`, `FilterChip.tsx`, `FilterToggle.tsx` | — | `constants.ts` (ERA_EPOCH_LABELS) | `filters.ts` |
| **FR-14–15: Audio preview** | `detail-panel/AudioPreviewControl.tsx` | `/api/preview/[mbid]/route.ts` | `audio/spotify.ts`, `audio/audio-preview.ts` | — |
| **FR-16–17: Shareable URLs** | — | — | `slugs.ts` | `pivot.ts` (pushState) |

### Integration Points

**Data Flow — Full Request Path:**

```
1. User loads /artist/radiohead
   → app/artist/[slug]/page.tsx
   → resolveSlug('radiohead') → mbid: 'a74b1b7f...'
   → Zustand: setFocalArtist('a74b1b7f...')
   → useArtistGraph('a74b1b7f...') → GET /api/graph/a74b1b7f...
   → graph-builder.ts: wikipedia + wikidata + musicbrainz → GraphData
   → GraphCanvas receives GraphData prop
   → D3 simulation runs → SVG renders

2. User clicks "Talk Talk" node
   → D3 nodes.ts onClick handler
   → Zustand: setFocalArtist('talk-talk-mbid')
   → pivot.ts: physics transition + pushState('/artist/talk-talk')
   → useArtistGraph fires with new MBID
   → new GraphData → D3 updateGraphData()

3. User activates Era filter "1960s"
   → FilterChip onClick → Zustand: setFilters(['1960s'], [])
   → GraphCanvas useEffect([filterEras]) fires
   → D3 filters.ts: applyFilters() dims out-of-era nodes
   → No React re-render of graph

4. User hovers a node (desktop)
   → D3 nodes.ts onMouseEnter → Radix HoverCard opens
   → NodeDetailPanel renders artist name, genre, era
   → 500ms dwell → useAudioPreview(mbid) fires
   → GET /api/preview/[mbid] → Spotify URL
   → AudioPreviewControl plays preview
```

**External Integration Points:**

| Service | File | Auth | Failure mode |
|---|---|---|---|
| MusicBrainz REST | `lib/data/musicbrainz.ts` | None (public) | PartialDataError → warnings[] |
| Wikipedia MediaWiki | `lib/data/wikipedia.ts` | None (public) | PartialDataError → warnings[] |
| Wikidata SPARQL | `lib/data/wikidata.ts` | None (public) | PartialDataError → warnings[] |
| Spotify Web API | `lib/audio/spotify.ts` | Client Credentials (env) | Returns null → AudioPreviewControl absent |

### File Organization Patterns

**Configuration Files (all at root):**
`next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `.eslintrc.json`, `.prettierrc`, `package.json`

**Static Assets (`public/`):**
Only `public/data/miles-davis.json` for the pre-baked landing graph. No images stored locally — all artist images fetched from MusicBrainz CDN URLs returned in `Artist.imageUrl`.

**Environment Files:**
`.env.local` — Spotify credentials (gitignored). `.env.example` — committed template. No other environment variables needed for v1.

**Development Workflow:**
- `npm run dev` → Turbopack dev server
- `npm run test` → Vitest in watch mode
- `npm run test:run` → Vitest single run (CI)
- `npm run lint` → ESLint
- `npm run build` → Next.js production build

**Deployment:**
Vercel reads `next.config.ts` and auto-detects Next.js. API Routes deploy as Vercel serverless functions. ISR revalidation handled by Vercel edge cache. No additional deployment configuration required beyond env vars in Vercel dashboard.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are version-compatible and MIT-licensed. Next.js 16, D3.js, Tailwind CSS v4, Radix UI (cmdk, HoverCard, Popover, Tooltip, VisuallyHidden), Zustand, TanStack Query v5, and Vitest have no conflicts. cmdk is built on Radix primitives — no duplication. D3 `useRef` pattern is fully compatible with React strict mode and Next.js App Router.

**Pattern Consistency:**
All 9 identified conflict points resolve to patterns that reinforce architectural decisions. Zustand selector enforces no cascade re-renders. `isPending` (not `isLoading`) enforces TanStack Query v5 API. Named exports enforce tree-shakeable components. D3 constants centralized in `src/graph/constants.ts` prevent hardcoding. `prefersReducedMotion()` utility enforces consistent animation branching.

**Structure Alignment:**
Every architectural layer has a distinct home. Server-side data clients (`lib/data/`, `lib/audio/`) are never imported by client components. D3 engine (`graph/`) is fully isolated — only `GraphCanvas.tsx` crosses the React/D3 boundary. `AudioPreviewProvider` interface is correctly placed in `lib/audio/audio-preview.ts`, consumed only by the API route and the Spotify implementation.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (17/17):**
All 17 functional requirements across all 6 feature areas are architecturally supported. Each FR maps to at least one specific file in the project structure. FR-15 (audio abstraction as an explicit architectural requirement) is satisfied by the `AudioPreviewProvider` interface pattern.

**Non-Functional Requirements Coverage (10/10):**
- Performance (≤3s render, ≤2s expansion, ≤300ms search): Addressed by ISR caching, pre-baked landing graph, and debounce constant.
- External API resilience: `PartialDataError` + `warnings[]` response shape ensures partial data is first-class, not a fallback.
- No backend DB: Confirmed throughout — no ORM, no migration, no data store.
- Audio swappable interface: `AudioPreviewProvider` enforces this per FR-15.
- WCAG 2.1 AA: Radix UI primitives provide ARIA for chrome; SVG has meaningful `aria-label`; graph canvas traversal deferred with explicit acknowledgment.
- Mobile responsive: Three-tier strategy (mobile/tablet/desktop), `NodeDetailPanel` switches between HoverCard and Popover, Tailwind mobile-first authoring.
- prefers-reduced-motion: `prefersReducedMotion()` utility used at D3 simulation branch points.
- MIT license: All dependencies (Next.js, D3, Tailwind, Radix, Zustand, TanStack Query, Vitest) are MIT-compatible.

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions are documented with rationale. Technology stack is fully specified. Integration patterns (API proxy, TanStack Query hooks, Zustand selectors, D3 lifecycle) are defined with code examples. Performance considerations are addressed architecturally (ISR caching, pre-baked landing, debounce).

**Structure Completeness:**
40+ files specified with purpose annotations. Three architectural boundaries defined with ASCII diagrams (React/D3, Server/Client, External API). Feature-to-structure mapping covers all 17 FRs. Data flow traced end-to-end for all four major user interaction paths.

**Pattern Completeness:**
9 conflict points identified and resolved. Anti-patterns documented with code examples. Enforcement guidelines specify mandatory behaviors for all AI agents.

### Gap Analysis Results

**Critical Gaps:** None. All FRs and NFRs are architecturally supported. No decisions are missing that would block implementation.

**Important Gaps (flag for implementation stories — non-blocking):**

1. **MusicBrainz rate limiting** — API enforces 1 req/sec. `musicbrainz.ts` implementation story should specify a simple retry-with-backoff or request queue. Not architecturally blocking but must be addressed in that story.

2. **Wikidata SPARQL query specifics** — Exact P737 forward (upstream) and reverse (downstream) query shapes are not prescribed here. Implementation story for `wikidata.ts` should validate queries against the 5 pre-build artists (Beatles, Björk, Fela Kuti, Kendrick Lamar, Daft Punk) before proceeding — per the validation precedent established in the PRD addendum.

3. **`miles-davis.json` schema conformance** — Pre-baked landing graph must exactly match the `GraphData` TypeScript interface. Must be generated by running `graph-builder.ts` against the live Miles Davis MBID, not hand-crafted, to ensure structural consistency.

**Nice-to-Have Gaps:**
- GitHub Actions `ci.yml` content not specified (conventional `vitest run` + `eslint` configuration; trivial to produce during setup story).

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all 16 checklist items confirmed, no critical gaps, all 17 FRs and 10 NFRs architecturally supported, 9 conflict points resolved, three major boundaries defined with explicit enforcement rules.

**Key Strengths:**
- Unusually clear React/D3 boundary with explicit enforcement rules — the most common failure mode for D3 + React projects is resolved before implementation starts
- Partial-success API response pattern built into the data layer — the "partial data preferable to crash" NFR is an architectural first-class citizen, not an afterthought
- `AudioPreviewProvider` interface isolates the most fragile external dependency (Spotify preview API) behind a swap-ready abstraction
- Pre-baked landing graph eliminates the most user-visible latency risk (first impression is always instant)
- ISR edge caching directly addresses the 3s render NFR without requiring a custom caching layer

**Areas for Future Enhancement (v2+):**
- Filter state persistence in URL (noted as v2 in decisions)
- Full graph keyboard accessibility (explicitly deferred with rationale)
- Error monitoring via Sentry (trivial addition when public traffic warrants)
- Saved/bookmarked graphs (requires auth + storage — intentionally out of scope)
- Advanced graph analytics (shortest path, influence strength scoring)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no substitutions without explicit discussion
- Use implementation patterns (naming, exports, TypeScript, Zustand, TanStack Query) consistently across all components
- Respect the React/D3 boundary: never update SVG children through React, never manage simulation state in Zustand
- Refer to the Feature-to-Structure Mapping table when uncertain which file owns a given responsibility
- Flag the three important gaps (rate limiting, SPARQL queries, miles-davis.json generation) in their respective implementation stories

**First Implementation Priority:**

```bash
# Story 1: Project initialization
npx create-next-app@latest dig \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Then install additional packages per Starter Template section
# Then define src/lib/data/types.ts — everything depends on this first
```