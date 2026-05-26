# Story 1.3: Data Model Types, Constants & Error Types

## Story

As a developer,
I want the TypeScript type contracts, animation constants, and error classes established,
So that every subsequent file builds against a stable, shared type system — never hardcoding values.

## Status

review

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/data/types.ts` — unified data model interfaces
  - [x] 1.1 Export `interface Artist` with all required fields; `imageUrl: string | null`, `era: string | null`
  - [x] 1.2 Export `interface InfluenceEdge` with direction and confidence union types
  - [x] 1.3 Export `interface GraphData` with `warnings: string[]`

- [x] Task 2: Create `src/lib/data/constants.ts` — data-layer constants
  - [x] 2.1 Export `DATA_THIN_THRESHOLD = 3`
  - [x] 2.2 Export `ERA_EPOCH_LABELS: Record<string, string>` covering 1920s–2020s with combined decade + epoch label strings

- [x] Task 3: Create `src/graph/constants.ts` — animation and physics constants
  - [x] 3.1 Export timing constants: PIVOT_DURATION_MS, HOVER_DWELL_MS, SEARCH_DEBOUNCE_MS
  - [x] 3.2 Export threshold/opacity constants: DATA_THIN_THRESHOLD, EDGE_OPACITY_DEFAULT, NODE_OPACITY_DIMMED
  - [x] 3.3 Export node radius constants: NODE_RADIUS_FOCAL, NODE_RADIUS_HOP1, NODE_RADIUS_HOP2 (distinct descending values)

- [x] Task 4: Create `src/graph/types.ts` — D3 simulation type extensions
  - [x] 4.1 Export `interface GraphNode extends SimulationNodeDatum` with all required fields
  - [x] 4.2 Export `interface GraphLink extends SimulationLinkDatum<GraphNode>` with confidence

- [x] Task 5: Create `src/lib/errors.ts` — custom error classes
  - [x] 5.1 Implement `ArtistNotFoundError` extending Error with descriptive message (includes slug)
  - [x] 5.2 Implement `DataSourceError` extending Error
  - [x] 5.3 Implement `PartialDataError` extending Error

- [x] Task 6: Create `src/lib/errors.test.ts` — unit tests
  - [x] 6.1 ArtistNotFoundError: instanceof Error, instanceof ArtistNotFoundError, message contains slug
  - [x] 6.2 DataSourceError: instanceof Error, instanceof DataSourceError, message descriptive
  - [x] 6.3 PartialDataError: instanceof Error, instanceof PartialDataError, message descriptive
  - [x] 6.4 Verify name property on each error class is set correctly

## Dev Notes

### Architecture requirements

**Interface vs type rule:** Use `interface` for ALL data shapes and component props. Use `type` only for unions and utility types.

**Null vs undefined rule:** `null` for explicitly absent data (imageUrl, era). `undefined` only for optional function parameters. Never use interchangeably for the same field.

**Custom error pattern — set `name` property for instanceof chains in transpiled environments:**
```ts
export class ArtistNotFoundError extends Error {
  constructor(slug: string) {
    super(`Artist not found: "${slug}"`)
    this.name = "ArtistNotFoundError"
    Object.setPrototypeOf(this, ArtistNotFoundError.prototype)
  }
}
```
`Object.setPrototypeOf` is required because TypeScript's ES5 transpilation breaks `instanceof` checks on Error subclasses. Always include it.

**D3 type imports:** `SimulationNodeDatum` and `SimulationLinkDatum<T>` come from `'d3'` (the project installs the full `d3` package + `@types/d3`). Import from `'d3'` not `'d3-force'`.

**DATA_THIN_THRESHOLD duplication:** The constant appears in BOTH `src/lib/data/constants.ts` (data layer — used by graph-builder.ts server-side) and `src/graph/constants.ts` (graph engine — used by D3 node rendering). This is intentional per the architecture: the data layer and graph engine are separate modules. Both must equal 3.

**ERA_EPOCH_LABELS decade coverage:** Must cover 1920s through 2020s. Example from AC: `"1960s": "1960s — British Invasion / Motown"`. Format: `"[decade]s — [Epoch1] / [Epoch2]"`.

**Node radius values from architecture doc:**
- `NODE_RADIUS_FOCAL = 24`
- `NODE_RADIUS_HOP1 = 16`
- `NODE_RADIUS_HOP2 = 11`

**GraphNode.opacity:** managed by D3 for filter dimming. Set to `1` by default; D3 `applyFilters()` mutates this directly.

**GraphNode.direction:** `'focal' | 'upstream' | 'downstream'` — note this differs from InfluenceEdge.direction which is `'upstream' | 'downstream'` (no 'focal').

### Files to create

| File | New/Modified |
|------|-------------|
| `src/lib/data/types.ts` | Create |
| `src/lib/data/constants.ts` | Create |
| `src/graph/constants.ts` | Create |
| `src/graph/types.ts` | Create |
| `src/lib/errors.ts` | Create |
| `src/lib/errors.test.ts` | Create |

## Dev Agent Record

### Implementation Plan

1. Create all five source files in order (types → constants → graph constants → graph types → errors)
2. Write errors.test.ts covering all three error classes
3. Run `npm run test:run` — all pass
4. Run `npm run lint` — zero errors
5. Run `npm run build` — TypeScript compilation confirms type correctness

### Debug Log

No issues encountered. Pure TypeScript story — all files compiled cleanly on first pass.

AC grep check: `src/graph/` files other than `constants.ts` contain zero bare occurrences of `700`, `500`, or `0.13` — the only matches are in `constants.ts` itself (the definition site).

### Completion Notes

All 6 tasks and 16 subtasks complete. Summary:

- **types.ts** — 3 interfaces: `Artist` (7 fields, `imageUrl|era = string|null`), `InfluenceEdge` (direction + confidence unions), `GraphData` (focalArtist, artists, edges, depth, warnings[]).
- **data/constants.ts** — `DATA_THIN_THRESHOLD = 3`, `ERA_EPOCH_LABELS` with 11 decades (1920s–2020s), exact AC format "1960s — British Invasion / Motown".
- **graph/constants.ts** — 9 named exports: PIVOT_DURATION_MS=700, HOVER_DWELL_MS=500, SEARCH_DEBOUNCE_MS=300, DATA_THIN_THRESHOLD=3, EDGE_OPACITY_DEFAULT=0.13, NODE_OPACITY_DIMMED=0.12, NODE_RADIUS_FOCAL=24, NODE_RADIUS_HOP1=16, NODE_RADIUS_HOP2=11; plus SIMULATION_ALPHA_DECAY=0.028.
- **graph/types.ts** — `GraphNode extends SimulationNodeDatum` (mbid, name, genres, direction, isDataThin, opacity); `GraphLink extends SimulationLinkDatum<GraphNode>` (confidence).
- **errors.ts** — ArtistNotFoundError, DataSourceError, PartialDataError. All use `Object.setPrototypeOf` to fix instanceof in ES5-transpiled environments.
- **errors.test.ts** — 18 tests across 4 describe blocks; includes cross-class instanceof isolation.

**Validation:** `npm run test:run` → 22/22 ✅ | `npm run lint` → 0 errors ✅ | `npm run build` → success ✅

## File List

- `src/lib/data/types.ts` (created)
- `src/lib/data/constants.ts` (created)
- `src/graph/constants.ts` (created)
- `src/graph/types.ts` (created)
- `src/lib/errors.ts` (created)
- `src/lib/errors.test.ts` (created)
- `_bmad-output/implementation-artifacts/1-3-data-model-types-constants-errors.md` (created)

## Change Log

- 2026-05-26: Story 1.3 implemented — unified data model types (Artist, InfluenceEdge, GraphData), data-layer constants (DATA_THIN_THRESHOLD=3, ERA_EPOCH_LABELS 1920s–2020s), graph engine constants (PIVOT_DURATION_MS=700, HOVER_DWELL_MS=500, SEARCH_DEBOUNCE_MS=300 + node radii + opacity values), D3 extension types (GraphNode, GraphLink), and error classes (ArtistNotFoundError, DataSourceError, PartialDataError) with 18 unit tests.