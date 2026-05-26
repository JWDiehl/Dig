# Story 1.7: Graph Builder & Core API Routes

## Story

As a developer,
I want the graph builder that orchestrates all three data sources and the core API routes operational,
So that a complete `GraphData` object can be assembled for any artist and served with proper partial-success and error handling.

## Status

review

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: Extend `src/lib/data/musicbrainz.ts` — add `getArtistByMbid`
  - [x] 1.1 Export `getArtistByMbid(mbid: string): Promise<Artist>` that calls `GET /ws/2/artist/{mbid}?fmt=json&inc=tags`
  - [x] 1.2 Throw `ArtistNotFoundError(mbid)` on HTTP 404
  - [x] 1.3 Throw `DataSourceError` on non-OK status or network failure (reuse `fetchWithRetry`)
  - [x] 1.4 Map response to `Artist` using the existing private `mapArtist` function (slug via `toBaseSlug`)

- [x] Task 2: Create `src/lib/data/graph-builder.ts` — multi-source orchestrator
  - [x] 2.1 Export `buildGraph(mbid: string, depth?: number): Promise<GraphData>` (default depth 2)
  - [x] 2.2 Fetch focal artist via `getArtistByMbid(mbid)` — rethrow `ArtistNotFoundError` as-is; wrap other errors as `DataSourceError`
  - [x] 2.3 Update focal artist slug using `generateSlug(focalArtist.name)` from `slugs.ts` (musicbrainz.ts cannot import slugs.ts due to circular dependency — graph-builder.ts has no such restriction)
  - [x] 2.4 Fetch all three influence sources in parallel with `Promise.allSettled`:
    - `wikipedia.getUpstreamInfluences(focalArtist.name)` → upstream names (primary)
    - `wikidata.getUpstreamInfluences(mbid)` → upstream names (secondary/supplement)
    - `wikidata.getDownstreamInfluences(mbid)` → downstream names
  - [x] 2.5 If ALL three sources reject → throw `DataSourceError`
  - [x] 2.6 For each rejected source, push a human-readable message to `warnings[]`
  - [x] 2.7 Deduplicate upstream names (case-insensitive) — Wikipedia primary; Wikidata adds names not already present
  - [x] 2.8 Cap at `MAX_INFLUENCES_PER_DIRECTION = 15` for each direction (upstream / downstream) before MusicBrainz lookups
  - [x] 2.9 Resolve each influence name to an `Artist` via `searchArtists(name)` — take first result; skip names with no MB result
  - [x] 2.10 Update each resolved artist's slug using `generateSlug(artist.name)` (no MBID suffix needed for influence nodes — base slug is sufficient)
  - [x] 2.11 Build `InfluenceEdge[]`:
    - Upstream edge: `{ sourceId: influenceArtist.mbid, targetId: mbid, direction: 'upstream', confidence: ... }`
    - Downstream edge: `{ sourceId: mbid, targetId: influencedArtist.mbid, direction: 'downstream', confidence: 'medium' }`
    - Confidence: `'high'` if name appears in BOTH Wikipedia AND Wikidata upstream; `'medium'` otherwise
  - [x] 2.12 Compute `isDataThin` for every artist: count edges where `sourceId === artist.mbid || targetId === artist.mbid`; if count < `DATA_THIN_THRESHOLD` → `isDataThin: true`
  - [x] 2.13 Return `GraphData` with `{ focalArtist, artists: [focalArtist, ...influenceArtists], edges, depth, warnings }`

- [x] Task 3: Create `src/app/api/search/route.ts` — artist search endpoint
  - [x] 3.1 `export const revalidate = 86400`
  - [x] 3.2 `export async function GET(req: NextRequest): Promise<NextResponse>` (named export, not default)
  - [x] 3.3 Read `q` query param from `req.nextUrl.searchParams.get('q') ?? ''`
  - [x] 3.4 Call `searchArtists(q)` — empty query returns `{ data: [] }` immediately (no MB call)
  - [x] 3.5 On success: `return NextResponse.json({ data: artists })`
  - [x] 3.6 On `DataSourceError`: `return NextResponse.json({ error: 'Unable to reach data sources', code: 503 }, { status: 503 })`

- [x] Task 4: Create `src/app/api/graph/[mbid]/route.ts` — graph assembly endpoint
  - [x] 4.1 `export const revalidate = 3600`
  - [x] 4.2 `export async function GET(_req: NextRequest, { params }: { params: Promise<{ mbid: string }> }): Promise<NextResponse>`
  - [x] 4.3 Await params: `const { mbid } = await params` (Next.js 16 requires async params)
  - [x] 4.4 Call `buildGraph(mbid, 2)`
  - [x] 4.5 On success with warnings: `return NextResponse.json({ data, warnings: data.warnings })`
  - [x] 4.6 On success without warnings: `return NextResponse.json({ data })`
  - [x] 4.7 Catch `ArtistNotFoundError`: `return NextResponse.json({ error: 'Artist not found', code: 404 }, { status: 404 })`
  - [x] 4.8 Catch all other errors: `return NextResponse.json({ error: 'Unable to reach data sources', code: 503 }, { status: 503 })`

- [x] Task 5: Create `src/lib/data/graph-builder.test.ts` — unit tests (mocked)
  - [x] 5.1 Mock `getArtistByMbid`, `searchArtists` from `./musicbrainz` with `vi.mock`
  - [x] 5.2 Mock `getUpstreamInfluences` from `./wikipedia` with `vi.mock`
  - [x] 5.3 Mock `getUpstreamInfluences`, `getDownstreamInfluences` from `./wikidata` with `vi.mock`
  - [x] 5.4 Test: successful full-source assembly → `artists.length ≥ 1`, `edges.length ≥ 1`, `warnings` empty
  - [x] 5.5 Test: Wikipedia fails, Wikidata succeeds → returns GraphData + `warnings` contains "Wikipedia" message
  - [x] 5.6 Test: all sources fail → throws `DataSourceError`
  - [x] 5.7 Test: `getArtistByMbid` throws `ArtistNotFoundError` → rethrows `ArtistNotFoundError` (not DataSourceError)
  - [x] 5.8 Test: artist with 0 edges → `isDataThin: true`; artist with ≥ `DATA_THIN_THRESHOLD` edges → `isDataThin: false`
  - [x] 5.9 Test: downstream edges have `direction: 'downstream'`; upstream edges have `direction: 'upstream'`
  - [x] 5.10 Test: duplicate upstream names (same name in Wikipedia + Wikidata) → deduplicated in output (single Artist, not two)

## Dev Notes

### Circular dependency constraint — CRITICAL

`slugs.ts` imports `searchArtists` from `musicbrainz.ts`. Therefore:
- `musicbrainz.ts` **cannot** import from `slugs.ts` (would create a circular import)
- `musicbrainz.ts` uses a private `toBaseSlug(name)` helper for slug generation internally
- `graph-builder.ts` **can** safely import from both `musicbrainz.ts` AND `slugs.ts` — use this to apply proper slugs after receiving Artist objects from MusicBrainz functions

```typescript
// In graph-builder.ts — safe to do this:
import { getArtistByMbid, searchArtists } from "./musicbrainz";
import { generateSlug } from "./slugs";

// After getting artist from musicbrainz, override the slug:
const artist = await getArtistByMbid(mbid);
const properSlug = generateSlug(artist.name);  // no MBID suffix unless collision
return { ...artist, slug: properSlug };
```

### MusicBrainz direct lookup endpoint (for getArtistByMbid)

```
GET https://musicbrainz.org/ws/2/artist/{mbid}?fmt=json&inc=tags
Headers: User-Agent: dig/0.1.0 (jondiehl22@gmail.com)
```

Response shape (same fields as search result):
```json
{
  "id": "a74b1b7f-71a5-4011-9441-d0b5e4122711",
  "name": "Radiohead",
  "tags": [{ "count": 5, "name": "alternative rock" }],
  "life-span": { "begin": "1985", "ended": false }
}
```

HTTP 404 = artist not found → throw `ArtistNotFoundError(mbid)`.

Reuse `fetchWithRetry` (already in musicbrainz.ts) — it handles rate limiting, retries, and network errors.
Reuse `mapArtist` (private function in musicbrainz.ts) — it handles the response mapping.

### Promise.allSettled pattern for partial-failure

```typescript
const [wikiResult, wikidataUpResult, wikidataDownResult] = await Promise.allSettled([
  wikipedia.getUpstreamInfluences(focalArtist.name),
  wikidata.getUpstreamInfluences(mbid),
  wikidata.getDownstreamInfluences(mbid),
]);

const warnings: string[] = [];
let upstreamNames: string[] = [];
let downstreamNames: string[] = [];

if (wikiResult.status === "fulfilled") {
  upstreamNames = [...wikiResult.value];
} else {
  warnings.push(`Wikipedia unavailable — upstream influences may be incomplete`);
}

if (wikidataUpResult.status === "fulfilled") {
  // Deduplicate: add Wikidata names not already in Wikipedia list
  for (const name of wikidataUpResult.value) {
    if (!upstreamNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      upstreamNames.push(name);
    }
  }
} else {
  warnings.push(`Wikidata upstream unavailable — upstream influences may be incomplete`);
}

if (wikidataDownResult.status === "fulfilled") {
  downstreamNames = wikidataDownResult.value;
} else {
  warnings.push(`Wikidata downstream unavailable — downstream influences may be incomplete`);
}

// Total failure check
if (
  wikiResult.status === "rejected" &&
  wikidataUpResult.status === "rejected" &&
  wikidataDownResult.status === "rejected"
) {
  throw new DataSourceError(
    `All influence data sources failed for MBID "${mbid}"`,
  );
}
```

### Resolving influence names to Artist objects

Influence sources return plain strings (e.g., "Chuck Berry", "Little Richard"). To build `Artist` objects:

```typescript
const MAX_INFLUENCES_PER_DIRECTION = 15;

async function resolveNamesToArtists(names: string[]): Promise<Artist[]> {
  const results: Artist[] = [];
  for (const name of names.slice(0, MAX_INFLUENCES_PER_DIRECTION)) {
    try {
      const artists = await searchArtists(name);
      if (artists.length > 0) {
        const a = artists[0];
        results.push({ ...a, slug: generateSlug(a.name) });
      }
      // Skip names that return no MB results — don't add stub artists
    } catch {
      // Individual name lookup failure — skip silently, don't fail whole graph
    }
  }
  return results;
}
```

**Rate limiting note:** `searchArtists` uses the rate limiter in `musicbrainz.ts` (1100ms minimum between requests). 15 upstream + 15 downstream = 30 lookups ≈ 33 seconds cold. This is acceptable because:
1. The graph API route has `revalidate = 3600` — the slow path runs at most once per hour per artist
2. Tests mock `searchArtists`, so test runs are instant
3. ISR edge caching means popular artists are almost always served from cache

### Edge construction and confidence determination

```typescript
// Track which names appear in both Wikipedia AND Wikidata (high confidence)
const wikiSet = new Set(
  (wikiResult.status === "fulfilled" ? wikiResult.value : [])
    .map((n) => n.toLowerCase())
);
const wikidataUpSet = new Set(
  (wikidataUpResult.status === "fulfilled" ? wikidataUpResult.value : [])
    .map((n) => n.toLowerCase())
);

// When building upstream edges:
const confidence = (
  wikiSet.has(influenceName.toLowerCase()) &&
  wikidataUpSet.has(influenceName.toLowerCase())
) ? "high" : "medium";

// Upstream edge shape (artist influenced the focal artist — roots to the left):
const upstreamEdge: InfluenceEdge = {
  sourceId: influenceArtist.mbid,   // the influencer
  targetId: focalArtistMbid,         // the focal artist was influenced BY them
  direction: "upstream",
  confidence,
};

// Downstream edge shape (focal artist influenced this artist — legacy to the right):
const downstreamEdge: InfluenceEdge = {
  sourceId: focalArtistMbid,         // focal artist influenced them
  targetId: influencedArtist.mbid,
  direction: "downstream",
  confidence: "medium",              // Wikidata only — single source
};
```

### isDataThin computation

```typescript
function countEdgesForArtist(mbid: string, edges: InfluenceEdge[]): number {
  return edges.filter(
    (e) => e.sourceId === mbid || e.targetId === mbid,
  ).length;
}

// Apply to every artist in the graph:
const allInfluenceArtists = [...upstreamArtists, ...downstreamArtists];
const allArtists = [focalArtist, ...allInfluenceArtists];
const artistsWithDataThin = allArtists.map((a) => ({
  ...a,
  isDataThin: countEdgesForArtist(a.mbid, edges) < DATA_THIN_THRESHOLD,
}));
```

Note: `DATA_THIN_THRESHOLD = 3` is imported from `./constants`. **Never hardcode `3`.**

### Next.js 16 API route — async params (CRITICAL)

Next.js 16 changed the route handler signature — `params` is now a **Promise**, not a plain object:

```typescript
// ✅ CORRECT for Next.js 16
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  const { mbid } = await params;   // ← MUST await
  ...
}

// ❌ WRONG (Next.js 13-15 style — TypeScript error in Next.js 16)
export async function GET(
  _req: NextRequest,
  { params }: { params: { mbid: string } },
): Promise<NextResponse> {
  const mbid = params.mbid;   // will produce a type error
  ...
}
```

This applies to ALL dynamic route segments. The search route has no params (just query params from `req.nextUrl`), so it doesn't need this.

### API route file locations and ISR

```
src/app/api/search/route.ts          export const revalidate = 86400
src/app/api/graph/[mbid]/route.ts    export const revalidate = 3600
```

Do NOT create the expand route (`src/app/api/graph/[mbid]/expand/route.ts`) — that is Story 2.3.

The full API handler template (from architecture doc):

```typescript
// src/app/api/graph/[mbid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/data/graph-builder";
import { ArtistNotFoundError } from "@/lib/errors";

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  const { mbid } = await params;
  try {
    const data = await buildGraph(mbid, 2);
    if (data.warnings.length > 0) {
      return NextResponse.json({ data, warnings: data.warnings });
    }
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      return NextResponse.json(
        { error: "Artist not found", code: 404 },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Unable to reach data sources", code: 503 },
      { status: 503 },
    );
  }
}
```

### Test structure (mocking with vi.mock)

```typescript
// src/lib/data/graph-builder.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";
import { buildGraph } from "./graph-builder";
import { DataSourceError, ArtistNotFoundError } from "../errors";

// Module-level mocks — vi.mock is hoisted before imports
vi.mock("./musicbrainz", () => ({
  getArtistByMbid: vi.fn(),
  searchArtists: vi.fn(),
}));
vi.mock("./wikipedia", () => ({
  getUpstreamInfluences: vi.fn(),
}));
vi.mock("./wikidata", () => ({
  getUpstreamInfluences: vi.fn(),
  getDownstreamInfluences: vi.fn(),
}));

import { getArtistByMbid, searchArtists } from "./musicbrainz";
import { getUpstreamInfluences as getWikiUpstream } from "./wikipedia";
import {
  getUpstreamInfluences as getWikidataUpstream,
  getDownstreamInfluences,
} from "./wikidata";

const mockFocalArtist = {
  mbid: "focal-mbid",
  slug: "test-artist",
  name: "Test Artist",
  genres: ["rock"],
  era: "1990s",
  imageUrl: null,
  isDataThin: false,
};

const mockInfluenceArtist = {
  mbid: "influence-mbid",
  slug: "influence-artist",
  name: "Influence Artist",
  genres: [],
  era: null,
  imageUrl: null,
  isDataThin: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  (getArtistByMbid as ReturnType<typeof vi.fn>).mockResolvedValue(mockFocalArtist);
  (getWikiUpstream as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getWikidataUpstream as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (getDownstreamInfluences as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (searchArtists as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});
```

### Integration test with live data (SKIP in CI)

The story ACs only require unit tests (mocked). Do NOT write live integration tests for graph-builder — those are covered by the individual client integration tests (musicbrainz.test.ts, wikipedia.test.ts, wikidata.test.ts). The graph-builder test file should be **unit tests only**, with all external calls mocked. No `describe.skipIf(!!process.env.CI)` block needed here.

### Existing files being modified

**`src/lib/data/musicbrainz.ts`** — Adding `getArtistByMbid`. Preserve all existing code exactly:
- `searchArtists` function (unchanged)
- `fetchWithRetry`, `mbFetch`, rate limiter state (unchanged)
- `mapArtist`, `extractGenres`, `extractEra`, `toBaseSlug` private helpers (unchanged)
- Just add the new export after the existing `searchArtists` function

```typescript
/**
 * Looks up a single artist by their MusicBrainz ID.
 *
 * Used by graph-builder.ts to fetch focal artist metadata.
 * Unlike searchArtists, this is an exact lookup — not a search.
 *
 * @throws {ArtistNotFoundError} when MBID does not match any artist (HTTP 404)
 * @throws {DataSourceError} on network failure or non-OK HTTP (non-404)
 */
export async function getArtistByMbid(mbid: string): Promise<Artist> {
  const url = `${MB_BASE_URL}/artist/${encodeURIComponent(mbid)}?fmt=json&inc=tags`;

  let res: Response;
  try {
    res = await fetchWithRetry(url);
  } catch (err) {
    if (err instanceof DataSourceError) throw err;
    throw new DataSourceError(
      `MusicBrainz lookup failed for MBID "${mbid}": ${String(err)}`,
    );
  }

  if (res.status === 404) {
    throw new ArtistNotFoundError(mbid);
  }

  if (!res.ok) {
    throw new DataSourceError(
      `MusicBrainz returned HTTP ${res.status} for MBID "${mbid}"`,
    );
  }

  let body: MbArtist;
  try {
    body = (await res.json()) as MbArtist;
  } catch {
    throw new DataSourceError(
      `MusicBrainz returned invalid JSON for MBID "${mbid}"`,
    );
  }

  return mapArtist(body);
}
```

Note: `ArtistNotFoundError` needs to be imported at the top of musicbrainz.ts. Currently it only imports `DataSourceError`. Add `ArtistNotFoundError` to the errors import.

### GraphData depth semantics

`depth` in `GraphData` = the hop depth of the returned graph data. For this story, `buildGraph(mbid, 2)` returns **hop-1 data** (direct influences only, since Wikipedia/Wikidata only provide direct influence relationships). The `depth` parameter is stored as-is in `GraphData.depth` and used by the D3 engine to determine rendering depth. True hop-2 expansion is handled by the `expand` API (Story 2.3).

This means `buildGraph(mbid, 2)` stores `depth: 2` in the returned `GraphData`, even though only hop-1 data is included. The `expand` API adds hop-2 nodes incrementally.

### Convention reminders (from architecture, enforced here)

- `ArtistNotFoundError` import: already in `errors.ts` — just add to `musicbrainz.ts`'s import
- `interface` for data shapes — all types from `types.ts`, never inline type aliases
- `null` for absent data (not `undefined`) — `imageUrl: null`, `era: null` in stub artists
- Named exports only — `export async function buildGraph(...)` (not default)
- `DATA_THIN_THRESHOLD` imported from `./constants` — never hardcode `3`
- Test files co-located: `graph-builder.test.ts` sits next to `graph-builder.ts` in `src/lib/data/`

### Files overview

| File | Action |
|------|--------|
| `src/lib/data/musicbrainz.ts` | MODIFY — add `getArtistByMbid` export + import `ArtistNotFoundError` |
| `src/lib/data/graph-builder.ts` | CREATE |
| `src/lib/data/graph-builder.test.ts` | CREATE |
| `src/app/api/search/route.ts` | CREATE |
| `src/app/api/graph/[mbid]/route.ts` | CREATE |

## Dev Agent Record

### Implementation Plan

1. Modify `musicbrainz.ts` — add `getArtistByMbid` + import `ArtistNotFoundError`
2. Create `graph-builder.ts` — full orchestration
3. Create `graph-builder.test.ts` — run tests to verify (RED before GREEN)
4. Create `src/app/api/search/route.ts`
5. Create `src/app/api/graph/[mbid]/route.ts`
6. `npm run test:run` → all pass
7. `npm run lint` → 0 errors
8. `npm run build` → success

### Debug Log

No blockers encountered. All tasks implemented cleanly on first attempt.

- Task 1 (getArtistByMbid): IDE briefly flagged `ArtistNotFoundError` as unused after import but before the function body was added — transient diagnostic, resolved immediately.
- Task 5 (tests): `slugs.ts` was also mocked (`vi.mock("./slugs", ...)`) because it internally calls `searchArtists` — without the mock, Vitest would resolve the real module and attempt the circular import chain during test setup.

### Completion Notes

All 5 tasks implemented and validated. Implementation highlights:

**Task 1 — `getArtistByMbid`:** Added to `musicbrainz.ts` reusing existing `fetchWithRetry` and `mapArtist` helpers. Added `ArtistNotFoundError` to the import line. HTTP 404 → `ArtistNotFoundError`; other non-OK / network → `DataSourceError`.

**Task 2 — `graph-builder.ts`:** Full orchestrator using `Promise.allSettled` for partial-failure tolerance. Deduplication is case-insensitive (Wikipedia primary, Wikidata adds missing names). `MAX_INFLUENCES_PER_DIRECTION = 15` caps before expensive sequential MusicBrainz lookups. Confidence is `'high'` only when a name appears in BOTH Wikipedia AND Wikidata upstream sets; otherwise `'medium'`. `isDataThin` computed via `countEdgesForArtist(mbid, edges) < DATA_THIN_THRESHOLD`. `generateSlug` applied to focal artist and all resolved influence artists after receiving them from MusicBrainz (circular dep constraint respected).

**Task 3 — `/api/search`:** `revalidate = 86400`. Empty `q` short-circuits before MusicBrainz. All errors → 503.

**Task 4 — `/api/graph/[mbid]`:** `revalidate = 3600`. `await params` (Next.js 16 async params). `ArtistNotFoundError` → 404; all other throws → 503. Warnings surfaced alongside data when present.

**Task 5 — `graph-builder.test.ts`:** 17 unit tests in 7 `describe` blocks covering: successful assembly (3 tests), partial failure with warnings (3 tests), all-sources-fail (1 test), unknown artist (2 tests), isDataThin computation (3 tests), edge directions (2 tests), upstream deduplication (3 tests). Full test suite: **104/104 passing**. Lint: **0 errors**. Build: **successful** (both dynamic routes appear in build output).

## File List

| File | Action |
|------|--------|
| `src/lib/data/musicbrainz.ts` | MODIFIED — added `getArtistByMbid` export; added `ArtistNotFoundError` to errors import |
| `src/lib/data/graph-builder.ts` | CREATED — multi-source orchestrator; exports `buildGraph` |
| `src/lib/data/graph-builder.test.ts` | CREATED — 17 unit tests; all external deps mocked with `vi.mock` |
| `src/app/api/search/route.ts` | CREATED — `GET /api/search?q=...` with `revalidate = 86400` |
| `src/app/api/graph/[mbid]/route.ts` | CREATED — `GET /api/graph/[mbid]` with `revalidate = 3600` |

## Change Log

- Story 1.7 implemented: Graph Builder & Core API Routes (Date: 2026-05-26)
  - Added `getArtistByMbid` to `musicbrainz.ts`
  - Created `graph-builder.ts` with `buildGraph` orchestrator (Promise.allSettled, deduplication, isDataThin, confidence scoring)
  - Created `GET /api/search` route with 24-hour ISR
  - Created `GET /api/graph/[mbid]` route with 1-hour ISR and partial-failure warnings
  - Created `graph-builder.test.ts` with 17 unit tests (104/104 full suite passing)
