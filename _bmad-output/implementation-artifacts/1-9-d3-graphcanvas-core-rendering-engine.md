# Story 1.9: D3 GraphCanvas — Core Rendering Engine

## Status

review

## Story

As a music lover,
I want to see an influence graph rendered on screen with the focal artist centered and nodes colored by genre family,
So that I can visually understand an artist's influence network at a glance.

## Acceptance Criteria

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

**Given** `GraphCanvas.test.tsx` is implemented
**When** I run `npm run test:run`
**Then** tests pass: SVG renders correct node count, focal node has correct aria-label, `prefersReducedMotion` mock is applied

## Tasks / Subtasks

- [x] Task 1: Create `src/graph/simulation.ts` — D3 force simulation orchestrator (AC: 2)
  - [x] 1.1 Module-level mutable state: `sim`, `svgSel`, `nodeGroupSel`, `edgeLineSel` (not React state)
  - [x] 1.2 `initializeGraph(svgEl, graphData, onPivot)` — entry point; converts `GraphData` to `GraphNode[]` / `GraphLink[]`; sets up forces; calls `renderNodes`, `renderEdges`, `renderDirectionLabels`
  - [x] 1.3 Force setup: `forceCenter(width/2, height/2)` strong centering + `forceX` directional bias (upstream left, downstream right, focal center)
  - [x] 1.4 `prefersReducedMotion()` check: if true → `sim.stop()`, assign final positions instantly; if false → let alpha decay run with `SIMULATION_ALPHA_DECAY`
  - [x] 1.5 `updateGraphData(graphData)` — called when new focal artist; updates nodes/links and restarts simulation
  - [x] 1.6 `cleanupGraph()` — stops simulation, removes all SVG children; called on unmount
  - [x] 1.7 Import `prefersReducedMotion` from `@/lib/motion` — NEVER inline `window.matchMedia`

- [x] Task 2: Create `src/graph/nodes.ts` — node SVG rendering (AC: 3)
  - [x] 2.1 `genreColor(genres: string[]): string` — maps genre array to hex color using regex patterns; fallback `#D3CEB8` (Tusk)
    - Jazz/blues/soul → `#EDC458` (Honey Bee)
    - Rock/punk/funk → `#E05E37` (Killer Queen)
    - Electronic/ambient/experimental → `#9F76B6` (Purple Haze)
    - Hip-hop/R&B → `#ABCDBB` (Mr. Blue Sky)
    - Folk/world/reggae/afrobeats → `#EDC458` (Honey Bee, shared)
    - Classical/uncategorized/fallback → `#D3CEB8` (Tusk)
  - [x] 2.2 `nodeRadius(direction, isHop1: boolean): number` — returns `NODE_RADIUS_FOCAL` / `NODE_RADIUS_HOP1` / `NODE_RADIUS_HOP2` (isHop1 distinguishes hop-1 from hop-2)
  - [x] 2.3 `renderNodes(container, nodes, hop1Mbids, onPivot)` — D3 join; creates `<g role="button" aria-label="[name], [direction] influence">` groups
  - [x] 2.4 Node group anatomy (inside-out per UX-DR6):
    - Glow halo: `<circle class="glow-halo">` filter="url(#glow)", genre color, fill-opacity 0.18
    - Main circle: `<circle class="main-circle">` genre/focal fill, hop-level fill-opacity
    - Hover ring: `<circle class="hover-ring">` stroke only, opacity 0 → 1 on mouseenter
    - Data-thin dot: `<circle class="data-thin-dot" r="3">` fill `#EDC458`, top perimeter — only when `isDataThin`
    - Label text: `<text class="node-label">` 15px/600 focal; 13px/500 hop
  - [x] 2.5 Click handler calls `onPivot(node.mbid)` — Story 1.10 adds full pivot animation
  - [x] 2.6 Focal node: direction === 'focal' → White Rabbit fill (`#F3EDDD`), `NODE_RADIUS_FOCAL`, 600-weight label

- [x] Task 3: Create `src/graph/edges.ts` — edge SVG rendering (AC: 4)
  - [x] 3.1 `renderEdges(container, links)` — D3 join; creates `<line class="edge">` elements
  - [x] 3.2 All edges: stroke `#D3CEB8` (Tusk), `stroke-opacity` = `EDGE_OPACITY_DEFAULT` (0.13)
  - [x] 3.3 `updateEdgePositions(edgeLines)` — called each simulation tick to update `x1/y1/x2/y2`
  - [x] 3.4 Edges rendered in `<g class="edges">` group — rendered before `<g class="nodes">` so nodes appear on top

- [x] Task 4: Create `src/graph/filters.ts` — filter stub (AC: N/A — Story 2.4)
  - [x] 4.1 `applyFilters(filterState: FilterState): void` — no-op stub
  - [x] 4.2 JSDoc: "Full implementation in Story 2.4 — era and genre dimming via D3 selection opacity"
  - [x] 4.3 Named export only; `FilterState` interface exported

- [x] Task 5: Create `src/graph/GraphErrorBoundary.tsx` — error boundary class component
  - [x] 5.1 React class component extending `Component<Props, State>`
  - [x] 5.2 `static getDerivedStateFromError(error)` — sets `hasError: true`
  - [x] 5.3 `componentDidCatch(error, info)` — logs to console (no error monitoring in v1)
  - [x] 5.4 Props: `children: ReactNode; fallback: ReactNode`
  - [x] 5.5 Render: if `hasError` → `this.props.fallback`; else → `this.props.children`
  - [x] 5.6 Named export: `export class GraphErrorBoundary extends Component<Props, State>`

- [x] Task 6: Create `src/graph/GraphCanvas.tsx` — React SVG mount point (AC: 1, 5)
  - [x] 6.1 `'use client'` directive at top (D3 requires browser APIs)
  - [x] 6.2 Props: `graphData: GraphData | null; filterEras: string[]; filterGenres: string[]; onPivot: (mbid: string) => void; focalArtistName: string; upstreamCount: number; downstreamCount: number`
  - [x] 6.3 `const svgRef = useRef<SVGSVGElement>(null)`
  - [x] 6.4 Three `useEffect` hooks:
    - Init `[]` → `initializeGraph(svgRef.current, graphData, onPivot)` + return `cleanupGraph`
    - Data `[graphData]` → `updateGraphData(graphData)`
    - Filter `[filterEras, filterGenres]` → `applyFilters({ eras, genres })`
  - [x] 6.5 Aria label: `"Influence graph centered on ${focalArtistName}. ${upstreamCount} influences, ${downstreamCount} influenced artists."`
  - [x] 6.6 SVG: `<svg ref={svgRef} className="w-screen h-screen" role="img" aria-label={ariaLabel} />`
  - [x] 6.7 Direction labels rendered by `renderDirectionLabels` in simulation.ts; all-caps, letter-spaced, ≤15% opacity
  - [x] 6.8 Named export: `export function GraphCanvas(...)`

- [x] Task 7: Create `src/graph/GraphCanvas.test.tsx` — integration tests (AC: 6)
  - [x] 7.1 `vi.mock('@/lib/motion', ...)` — `prefersReducedMotion` returns `true`, disables physics
  - [x] 7.2 Used real D3 with JSDOM — `d3-selection` DOM operations work correctly
  - [x] 7.3 Test: SVG renders with `role="img"`
  - [x] 7.4 Test: aria-label contains focal artist name, upstream/downstream counts
  - [x] 7.5 Test: correct number of `[role="button"]` node groups (one per artist)
  - [x] 7.6 Test: focal/upstream/downstream node aria-labels verified
  - [x] 7.7 Test: `data-thin-dot` rendered for `isDataThin: true` nodes only
  - [x] 7.8 `genreColor` unit tests: all 5 genre families + fallback + edge cases (8 tests)

- [x] Task 8: Run full validations
  - [x] 8.1 `npm run test:run` — 136/136 tests pass (19 new + 117 existing, zero regressions)
  - [x] 8.2 `npm run lint` — 0 errors, 0 warnings
  - [x] 8.3 `npm run build` — TypeScript clean, static pages generated successfully

## Dev Notes

### Critical: D3 + React DOM Ownership Boundary

D3 owns the SVG DOM entirely after mount. React renders only `<svg ref={svgRef} ... />`. After `initializeGraph()` runs in the init `useEffect`, D3 appends, updates, and removes all SVG children. React NEVER reconciles SVG internals.

`'use client'` is required: D3 uses `window`, `document`, and SVG DOM APIs unavailable in Node.js.

### Module Architecture

`simulation.ts` is the orchestrator holding all module-level D3 state. `nodes.ts`, `edges.ts`, `filters.ts` are pure rendering utilities called by `simulation.ts`.

### hop-1 vs hop-2 Visual Distinction

`GraphNode.direction` is `"upstream"` or `"downstream"` for all non-focal nodes — it does NOT encode hop level. `simulation.ts` computes `hop1Mbids: Set<string>` (artists directly connected to focal) and passes it to `renderNodes`. `nodeRadius(direction, isHop1)` uses this to return the correct radius constant.

### Genre Color Priority

Hip-hop/R&B checked BEFORE jazz/blues to avoid R&B being matched by the jazz regex. Priority: hip-hop → jazz → rock → electronic → folk → Tusk fallback.

### prefersReducedMotion Integration

Always import from `@/lib/motion`. Never inline `window.matchMedia`. When true: `sim.stop()`, assign positions directly to node x/y, call `ticked()` once.

### Testing Approach

Mock `prefersReducedMotion()` → `true` for deterministic synchronous rendering. Use `await act(async () => {})` after `render()` to flush `useEffect` hooks. Check DOM structure via `container.querySelector` — no pixel position assertions.

## Dev Agent Record

### Completion Notes

Story 1.9 fully implemented. All 7 source files created:

- **simulation.ts**: Module-level D3 state (`sim`, `svgSel`, `nodeGroupSel`, `edgeLineSel`). `initializeGraph` sets up glow filter defs, edge/node layer groups, direction labels, force simulation, and initial render. `prefersReducedMotion` check: instant position assignment when true. `updateGraphData` re-runs join + restarts alpha. `cleanupGraph` stops sim and clears SVG.

- **nodes.ts**: `genreColor` regex mapping (8 genres → 5 colors + Tusk fallback, hip-hop priority before jazz). `nodeRadius(direction, isHop1)` returns correct constant. `renderNodes` D3 join with full 5-layer anatomy: glow-halo, main-circle, hover-ring, data-thin-dot, node-label. Click fires `onPivot`. Hover ring shows/hides on mouseenter/mouseleave. `updateNodePositions` translates groups to D3 tick positions.

- **edges.ts**: `renderEdges` D3 join creating `<line class="edge">` with Tusk stroke at `EDGE_OPACITY_DEFAULT`. `updateEdgePositions` reads resolved D3 source/target node x/y on each tick.

- **filters.ts**: No-op stub with `FilterState` interface exported. JSDoc marks Story 2.4 for full implementation.

- **GraphErrorBoundary.tsx**: Class component with `getDerivedStateFromError` + `componentDidCatch` (console.error only). Renders `fallback` on error.

- **GraphCanvas.tsx**: `'use client'`; 3 useEffects (init/data/filter); aria-label with focal name + counts; `<svg>` self-closing.

- **GraphCanvas.test.tsx**: 19 tests — 11 integration (SVG structure, aria, node count, data-thin dot, null graphData) + 8 unit tests for `genreColor`. All pass.

**Key architectural decision**: `nodeRadius` takes `isHop1: boolean` (not just direction) to support hop-1 vs hop-2 visual distinction, which the `GraphNode` type does not encode. `simulation.ts` computes `hop1Mbids` from edges and passes it through to `renderNodes`.

## File List

- `src/graph/simulation.ts` — NEW
- `src/graph/nodes.ts` — NEW
- `src/graph/edges.ts` — NEW
- `src/graph/filters.ts` — NEW
- `src/graph/GraphCanvas.tsx` — NEW
- `src/graph/GraphErrorBoundary.tsx` — NEW
- `src/graph/GraphCanvas.test.tsx` — NEW

## Change Log

| Date | Change |
|------|--------|
| 2026-05-27 | Story 1.9 implemented — D3 GraphCanvas core rendering engine (7 files, 19 new tests) |
