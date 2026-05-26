# Story 1.8: Zustand Store & TanStack Query Data Hooks

## Status

review

## Story

As a developer,
I want client state management and data-fetching hooks implemented,
So that the D3 graph engine and chrome components share application state reactively without unnecessary re-renders.

## Acceptance Criteria

**Given** `src/store/index.ts` implements `useDigStore` with Zustand
**When** I call `const focalArtistId = useDigStore((state) => state.focalArtistId)` (selector pattern)
**Then** it returns the current MBID or `null`
**And** calling `setFocalArtist(mbid)` updates the store and triggers re-renders only in subscribing components

**Given** `src/hooks/useArtistGraph.ts` is implemented with TanStack Query v5
**When** I call `useArtistGraph('a74b1b7f...')`
**Then** it destructures `{ data, isPending, error }` — never `isLoading`
**And** when `mbid` is `null`/`undefined`, the query does not execute

**Given** `src/hooks/useArtistSearch.ts` is implemented with TanStack Query v5
**When** I call `useArtistSearch('radio')`
**Then** it fetches after `SEARCH_DEBOUNCE_MS` (300ms) delay
**And** empty query does not trigger a fetch

**Given** `src/store/index.test.ts` is implemented
**When** I run `npm run test:run`
**Then** tests cover store initialization, `setFocalArtist`, `setFilters`, and `setAudioPreview` actions

## Tasks / Subtasks

- [x] Task 1: Create `src/store/index.ts` — Zustand v5 store (AC: 1)
  - [x] 1.1 Define `interface DigStore` with state fields and action signatures
  - [x] 1.2 State fields: `focalArtistId: string | null`, `filterEras: string[]`, `filterGenres: string[]`, `audioPreviewId: string | null`
  - [x] 1.3 Action: `setFocalArtist(id: string): void` — sets `focalArtistId`
  - [x] 1.4 Action: `setFilters(eras: string[], genres: string[]): void` — sets both arrays at once
  - [x] 1.5 Action: `setAudioPreview(id: string | null): void` — sets `audioPreviewId` (null stops playback)
  - [x] 1.6 Export `useDigStore` as single named export using Zustand v5 curried pattern: `create<DigStore>()(set => ...)`

- [x] Task 2: Create `src/store/index.test.ts` — pure state tests (AC: 4)
  - [x] 2.1 Reset store to initial state in `beforeEach` using `useDigStore.setState(initialState)` (partial merge — does NOT replace actions)
  - [x] 2.2 Test: all fields initialize to their zero-values (`null`, `[]`)
  - [x] 2.3 Test: `setFocalArtist('mbid-1234')` updates `focalArtistId` to `'mbid-1234'`
  - [x] 2.4 Test: `setFocalArtist` replacing an existing MBID updates correctly
  - [x] 2.5 Test: `setFilters(['1960s', '1970s'], ['rock'])` updates both arrays simultaneously
  - [x] 2.6 Test: `setFilters([], [])` clears both arrays
  - [x] 2.7 Test: `setAudioPreview('mbid-xyz')` sets `audioPreviewId`
  - [x] 2.8 Test: `setAudioPreview(null)` clears `audioPreviewId` to `null`
  - [x] 2.9 Run `npm run test:run` — all new tests pass, no regressions

- [x] Task 3: Create `src/hooks/useArtistGraph.ts` — graph data hook (AC: 2)
  - [x] 3.1 Accept `mbid: string | null | undefined`; return `useQuery(...)` result
  - [x] 3.2 `queryKey: ['graph', mbid]`
  - [x] 3.3 `enabled: !!mbid` — query does NOT execute when mbid is falsy
  - [x] 3.4 `queryFn`: `fetch('/api/graph/${mbid}')` → throw on non-OK → return `res.json()`
  - [x] 3.5 Typed return: `GraphApiResponse` interface with `{ data: GraphData; warnings?: string[] }`

- [x] Task 4: Create `src/hooks/useArtistSearch.ts` — debounced search hook (AC: 3)
  - [x] 4.1 Accept `query: string`
  - [x] 4.2 Implement debounce via `useState<string>` + `useEffect` timer (SEARCH_DEBOUNCE_MS from `@/graph/constants`)
  - [x] 4.3 `queryKey: ['search', debouncedQuery]`
  - [x] 4.4 `enabled: !!debouncedQuery.trim()` — empty/whitespace-only query does NOT fetch
  - [x] 4.5 `queryFn`: `fetch('/api/search?q=${encodeURIComponent(debouncedQuery)}')` → throw on non-OK → return `res.json()`
  - [x] 4.6 Typed return: `SearchApiResponse` interface with `{ data: Artist[] }`

- [x] Task 5: Create `src/hooks/useAudioPreview.ts` — preview URL hook (per architecture)
  - [x] 5.1 Accept `mbid: string | null | undefined`; return `useQuery(...)` result
  - [x] 5.2 `queryKey: ['preview', mbid]`
  - [x] 5.3 `enabled: !!mbid`
  - [x] 5.4 `queryFn`: `fetch('/api/preview/${mbid}')` → throw on non-OK → return `res.json()`
  - [x] 5.5 Typed return: `PreviewApiResponse` interface with `{ data: { previewUrl: string | null } }`

- [x] Task 6: Run full validations
  - [x] 6.1 `npm run test:run` — all tests pass (store tests + existing 104 tests)
  - [x] 6.2 `npm run lint` — 0 errors
  - [x] 6.3 `npm run build` — successful

## Dev Notes

### Zustand v5 — CRITICAL differences from v4

**Import:** Zustand v5 uses the **named export** `create` (not default import):

```typescript
// ✅ v5 correct
import { create } from 'zustand'

// ❌ v4 style — will NOT compile in v5
import create from 'zustand'
```

**TypeScript curried pattern** — use the `create<T>()((set) => ...)` double-call form:

```typescript
// ✅ Correct — curried form avoids type assertion
export const useDigStore = create<DigStore>()((set) => ({
  focalArtistId: null,
  filterEras: [],
  filterGenres: [],
  audioPreviewId: null,
  setFocalArtist: (id) => set({ focalArtistId: id }),
  setFilters: (eras, genres) => set({ filterEras: eras, filterGenres: genres }),
  setAudioPreview: (id) => set({ audioPreviewId: id }),
}))

// ❌ Also technically works but loses some TypeScript inference
export const useDigStore = create<DigStore>((set) => ({ ... }))
```

**Why curried?** The `create<T>()` pattern enables TypeScript to correctly infer the `set` callback's types without needing explicit `as` casts anywhere in the store.

### DigStore interface — exact shape from architecture

```typescript
interface DigStore {
  // ── State ──────────────────────────────────────────────────────
  /** MBID of the currently displayed focal artist. null on initial load. */
  focalArtistId: string | null;
  /** Active era filter values (e.g. ['1960s', '1970s']). Empty = no filter. */
  filterEras: string[];
  /** Active genre filter values (e.g. ['rock', 'jazz']). Empty = no filter. */
  filterGenres: string[];
  /** MBID of the artist whose audio preview is currently playing. null = no audio. */
  audioPreviewId: string | null;

  // ── Actions ────────────────────────────────────────────────────
  /** Set the focal artist. Called by pivot, search selection, and URL resolver. */
  setFocalArtist: (id: string) => void;
  /** Set both era and genre filters simultaneously (one Zustand update, not two). */
  setFilters: (eras: string[], genres: string[]) => void;
  /** Start/stop audio preview. Pass null to stop all previews. */
  setAudioPreview: (id: string | null) => void;
}
```

### Selector pattern — MANDATORY, NEVER deviate

```typescript
// ✅ Correct — selector pattern; only subscribing component re-renders
const focalArtistId = useDigStore((state) => state.focalArtistId)
const setFocalArtist = useDigStore((state) => state.setFocalArtist)

// ❌ BANNED — subscribes to entire store, causes re-renders on ANY state change
const { focalArtistId, setFocalArtist } = useDigStore()
const store = useDigStore()
```

This is enforced by the architecture and an explicit anti-pattern in `AGENTS.md`. Do NOT use whole-store destructuring.

### Testing Zustand stores without React

Zustand stores can be tested **without React Testing Library** by calling the store directly via `getState()` and `setState()`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useDigStore } from './index'

// Define initial state slice for resetting (actions are NOT in initialState)
const initialState = {
  focalArtistId: null as string | null,
  filterEras: [] as string[],
  filterGenres: [] as string[],
  audioPreviewId: null as string | null,
}

beforeEach(() => {
  // Partial merge — only resets state fields; actions are preserved in store
  useDigStore.setState(initialState)
})

it('setFocalArtist updates focalArtistId', () => {
  useDigStore.getState().setFocalArtist('test-mbid-1234')
  expect(useDigStore.getState().focalArtistId).toBe('test-mbid-1234')
})
```

**Why `getState()` and not `useDigStore()` in tests?** `useDigStore()` is a React hook — calling it outside a React component throws. `useDigStore.getState()` is the static accessor for the current store state, safe in plain test code.

**Why NOT `setState(initialState, true)` (replace=true)?** Replace mode would also remove all actions from the store — subsequent calls to `setFocalArtist` etc. would fail. Always use the default partial merge (no second argument).

### TanStack Query v5 — `isPending` not `isLoading`

This is an architecture-enforced rule and a **breaking change** from v4:

```typescript
// ✅ v5 — always use isPending
const { data, isPending, error } = useArtistGraph(mbid)

// ❌ v4 naming — deprecated in v5, will produce TypeScript warning
const { data, isLoading, error } = useArtistGraph(mbid)
```

`isPending` is true when: (1) the query has never been fetched yet, OR (2) the query is currently fetching. This replaces both `isLoading` (initial fetch) and the combination with `isFetching`.

### useArtistGraph — conditional execution pattern

```typescript
import { useQuery } from '@tanstack/react-query'
import type { GraphData } from '@/lib/data/types'

interface GraphApiResponse {
  data: GraphData
  warnings?: string[]
}

export function useArtistGraph(mbid: string | null | undefined) {
  return useQuery<GraphApiResponse>({
    queryKey: ['graph', mbid],
    queryFn: async () => {
      const res = await fetch(`/api/graph/${mbid}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error ?? `Graph fetch failed: ${res.status}`,
        )
      }
      return res.json() as Promise<GraphApiResponse>
    },
    enabled: !!mbid,   // ← query does not run until mbid is truthy
  })
}
```

**QueryClient default staleTime is 5 minutes** — already configured in `src/app/providers.tsx`:
```typescript
new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
})
```
This means a graph loaded within the last 5 minutes is served from TanStack Query cache without a network request. No additional staleTime config needed in the hooks.

### useArtistSearch — debounce via useState + useEffect

The debounce approach: maintain a second piece of state (`debouncedQuery`) that lags behind the raw input. The `queryKey` uses the debounced value, so queries only fire after the user pauses typing.

```typescript
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SEARCH_DEBOUNCE_MS } from '@/graph/constants'
import type { Artist } from '@/lib/data/types'

interface SearchApiResponse {
  data: Artist[]
}

export function useArtistSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<SearchApiResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error ?? `Search failed: ${res.status}`,
        )
      }
      return res.json() as Promise<SearchApiResponse>
    },
    enabled: !!debouncedQuery.trim(),   // ← empty/whitespace never fires
  })
}
```

**CRITICAL import path:** `SEARCH_DEBOUNCE_MS` is in `src/graph/constants.ts`, NOT in `src/lib/data/constants.ts`. The graph constants file contains timing/animation values; the data constants file has `DATA_THIN_THRESHOLD` and `ERA_EPOCH_LABELS`.

```typescript
// ✅ Correct import
import { SEARCH_DEBOUNCE_MS } from '@/graph/constants'

// ❌ Wrong file — SEARCH_DEBOUNCE_MS is not in data/constants
import { SEARCH_DEBOUNCE_MS } from '@/lib/data/constants'
```

### useAudioPreview — same pattern as useArtistGraph

```typescript
import { useQuery } from '@tanstack/react-query'

interface PreviewApiResponse {
  data: { previewUrl: string | null }
}

export function useAudioPreview(mbid: string | null | undefined) {
  return useQuery<PreviewApiResponse>({
    queryKey: ['preview', mbid],
    queryFn: async () => {
      const res = await fetch(`/api/preview/${mbid}`)
      if (!res.ok) throw new Error(`Preview fetch failed: ${res.status}`)
      return res.json() as Promise<PreviewApiResponse>
    },
    enabled: !!mbid,
  })
}
```

Note: The preview API route (`/api/preview/[mbid]`) doesn't exist yet — it's Story 2.2. The hook will compile and be importable now; it just won't have a working endpoint until that story. `useAudioPreview.ts` is created in this story because it belongs to the same hooks layer and follows the same pattern.

### QueryClientProvider — already configured

`src/app/providers.tsx` already wraps the app in `QueryClientProvider`. No additional setup is needed in the hooks. As long as these hooks are called from a component inside the React tree (which includes all `src/app/` pages), they have access to the `QueryClient`.

### Files to create (all NEW — no existing files modified)

| File | Action |
|------|--------|
| `src/store/index.ts` | CREATE — Zustand v5 store |
| `src/store/index.test.ts` | CREATE — pure state tests |
| `src/hooks/useArtistGraph.ts` | CREATE — graph data hook |
| `src/hooks/useArtistSearch.ts` | CREATE — debounced search hook |
| `src/hooks/useAudioPreview.ts` | CREATE — preview URL hook |

No existing files are modified in this story. The only "connection" is that future components will `import { useDigStore } from '@/store'` and hooks from `@/hooks/*` — both of which don't yet exist.

### Convention reminders

- `interface` for data shapes — `DigStore`, `GraphApiResponse`, `SearchApiResponse`, `PreviewApiResponse`
- Named exports only — `export const useDigStore`, `export function useArtistGraph`, etc.
- `null` for absent state — `focalArtistId: string | null`, not `focalArtistId?: string`
- No default exports — hooks and store are all named exports

### Previous story learnings

**Story 1.7 — `vi.mock` + `slugs.ts` transitive mock pattern:**
Story 1.7 found that `slugs.ts` had to be mocked in `graph-builder.test.ts` because it imports `searchArtists` (from musicbrainz), creating a circular chain during test setup. This pattern won't apply here — the store and hooks don't import data-layer modules that have circular dependencies. Store tests are pure Zustand state; no `vi.mock` needed.

**Story 1.2 — QueryClientProvider:**
`providers.tsx` was created in Story 1.2 with `staleTime: 5 * 60 * 1000`. The default staleTime applies to all hooks automatically — no per-hook configuration needed.

## Dev Agent Record

### Implementation Plan

1. Create `src/store/index.ts`
2. Create `src/store/index.test.ts` (write tests first — RED)
3. Verify tests pass (GREEN)
4. Create `src/hooks/useArtistGraph.ts`
5. Create `src/hooks/useArtistSearch.ts`
6. Create `src/hooks/useAudioPreview.ts`
7. `npm run test:run` → all pass
8. `npm run lint` → 0 errors
9. `npm run build` → success

### Debug Log

No blockers. All tasks implemented cleanly on first attempt.

- Tasks 1+2 followed strict RED-GREEN cycle: test file written first (import failed → RED), then store implemented (13/13 → GREEN).
- Zustand v5 curried `create<DigStore>()((set) => ...)` pattern compiles cleanly with no `as` casts.
- Store tests use `useDigStore.getState()` / `useDigStore.setState()` directly — zero React overhead.
- `useAudioPreview.ts` created without a backing API route (Story 2.2 provides `/api/preview/[mbid]`); compiles and typechecks cleanly.

### Completion Notes

All 6 tasks implemented and validated. 117/117 tests passing, 0 lint errors, build successful.

**Task 1 — `src/store/index.ts`:** Zustand v5 with `create<DigStore>()` curried pattern. Four state fields (`focalArtistId`, `filterEras`, `filterGenres`, `audioPreviewId`) and three actions (`setFocalArtist`, `setFilters`, `setAudioPreview`). Initial state: all null/empty. Selector-pattern-only access enforced via JSDoc.

**Task 2 — `src/store/index.test.ts`:** 13 unit tests across 4 `describe` blocks (initialization × 4, setFocalArtist × 3, setFilters × 3, setAudioPreview × 3). All tests use `getState()` directly — no React, no QueryClient wrapper needed. `beforeEach` resets via partial merge (actions preserved).

**Task 3 — `useArtistGraph.ts`:** Wraps `GET /api/graph/[mbid]`; `enabled: !!mbid`; throws typed error on non-OK response. `GraphApiResponse` interface typed for both full-success and warnings shape.

**Task 4 — `useArtistSearch.ts`:** `useState` + `useEffect` debounce with `SEARCH_DEBOUNCE_MS` (imported from `@/graph/constants`). `enabled: !!debouncedQuery.trim()` ensures whitespace-only input never fires. Query key uses debounced value so TanStack Query cache is keyed correctly.

**Task 5 — `useAudioPreview.ts`:** Same conditional pattern as `useArtistGraph`. `previewUrl: string | null` in response type supports both available and unavailable states per architecture. Compiles cleanly even without the backing route (Story 2.2).

**Task 6 — Validations:** 117/117 tests (104 prior + 13 new), 0 ESLint errors, production build clean with TypeScript pass.

## File List

| File | Action |
|------|--------|
| `src/store/index.ts` | CREATED — Zustand v5 `useDigStore`; 4 state fields, 3 actions |
| `src/store/index.test.ts` | CREATED — 13 unit tests; pure state testing via `getState()` |
| `src/hooks/useArtistGraph.ts` | CREATED — TanStack Query v5 hook; `GET /api/graph/[mbid]` |
| `src/hooks/useArtistSearch.ts` | CREATED — TanStack Query v5 hook; debounced `GET /api/search` |
| `src/hooks/useAudioPreview.ts` | CREATED — TanStack Query v5 hook; `GET /api/preview/[mbid]` |

## Change Log

- Story 1.8 implemented: Zustand Store & TanStack Query Data Hooks (Date: 2026-05-26)
  - Created `src/store/index.ts` — `useDigStore` with Zustand v5; selector-pattern-only access
  - Created `src/store/index.test.ts` — 13 pure state tests (no React required)
  - Created `src/hooks/useArtistGraph.ts` — graph data hook with conditional execution
  - Created `src/hooks/useArtistSearch.ts` — debounced search hook (SEARCH_DEBOUNCE_MS)
  - Created `src/hooks/useAudioPreview.ts` — preview URL hook (backing route in Story 2.2)
  - Full suite: 117/117 tests passing
