# Story 1.11: Artist Search Input & Top Nav

## Status

review

## Story

As a music lover,
I want to type an artist name and see instant autocomplete suggestions,
So that I can find and load any artist's graph in a single fluid action.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: Create `src/components/search/SearchResultItem.tsx` — presentational result row (AC: 1)
  - [x] 1.1 Props interface: `interface SearchResultItemProps { artist: Artist }` — named export
  - [x] 1.2 Render artist name: `<span>` with 13px text, `text-[#F3EDDD]` (White Rabbit / text-primary)
  - [x] 1.3 Render disambiguating detail: genre (first in array) or era — `<span>` 11px, `text-[#A09880]` (text-secondary); if neither available, omit entirely (never show empty string)
  - [x] 1.4 No default export — named export only per architecture

- [x] Task 2: Create `src/components/search/ArtistSearchInput.tsx` — cmdk Combobox with debounced search (AC: 1–4)
  - [x] 2.1 Props interface: `interface ArtistSearchInputProps { onSelect: (artist: Artist) => void; className?: string }` — named export
  - [x] 2.2 Controlled query state: `const [query, setQuery] = useState("")` — drives cmdk input
  - [x] 2.3 Consume `useArtistSearch(query)`: `const { data, isPending } = useArtistSearch(query)` — extract `const artists = data?.data ?? []`
  - [x] 2.4 cmdk Command root: `<Command shouldFilter={false}>` — CRITICAL: `shouldFilter={false}` disables cmdk's built-in text filtering; we use server-side search
  - [x] 2.5 `<Command.Input>`: controlled via `value={query} onValueChange={setQuery}`, `placeholder="Search any artist…"`, `aria-label="Search artists"`
  - [x] 2.6 Escape handler: `onKeyDown={(e) => { if (e.key === "Escape") setQuery("") }}` on `Command.Input` — clears query, closes dropdown, no graph or URL change
  - [x] 2.7 `<Command.List>`: only rendered when `query.trim().length > 0` — conditional render prevents empty dropdown flash on focus
  - [x] 2.8 Within `Command.List`: render `<Command.Empty>` only when `!isPending && artists.length === 0` — shows `"No artists found for '{query}'"` with the live query interpolated
  - [x] 2.9 Within `Command.List`: map artists → `<Command.Item key={artist.mbid} value={artist.mbid} onSelect={() => handleSelect(artist)}>` wrapping `<SearchResultItem artist={artist} />`
  - [x] 2.10 `handleSelect(artist)`: calls `setQuery("")` first (closes dropdown), then `onSelect(artist)` — order matters: close before parent side effects
  - [x] 2.11 ARIA live region: `<div role="status" aria-live="polite" className="sr-only">` announces `{artists.length} result{artists.length !== 1 ? 's' : ''} for {query}` when results arrive; empty string otherwise
  - [x] 2.12 No default export — named export only

- [x] Task 3: Create `src/components/nav/TopNav.tsx` — 48px frosted-glass navigation bar (AC: 5)
  - [x] 3.1 Props interface: `interface TopNavProps { onArtistSelect: (artist: Artist) => void }` — named export
  - [x] 3.2 Root element: `<nav>` with `className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center gap-3 px-4"` — `h-12` = 48px, `z-50` floats over canvas
  - [x] 3.3 Frosted glass style (inline or Tailwind): `style={{ backgroundColor: "rgba(28,24,20,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(243,237,221,0.08)" }}` — matches `chrome` token + `chrome-border` from UX spec
  - [x] 3.4 Search input: `<ArtistSearchInput onSelect={onArtistSelect} className="flex-1 min-w-0" />` — `flex-1` fills available width
  - [x] 3.5 Filter toggle button: `<button aria-label="Toggle filters" className="flex-shrink-0 p-2 rounded text-[#A09880] hover:text-[#F3EDDD] transition-colors">` containing an SVG filter icon (use a simple 3-line funnel icon inline — no external icon library dependency in this story)
  - [x] 3.6 Filter toggle is **inactive state only** — no onClick handler, no dot indicator, no panel in this story (Story 1.13 activates it); `// TODO Story 1.13: wire up filter panel` comment added
  - [x] 3.7 No default export — named export only

- [x] Task 4: Update `src/app/page.tsx` — integrate TopNav and wire search-to-graph (AC: 4, 5)
  - [x] 4.1 Add `focalArtistId` selector: `const focalArtistId = useDigStore((state) => state.focalArtistId)` inside `GraphView`
  - [x] 4.2 Change `useArtistGraph` call: `const activeMbid = focalArtistId ?? MILES_DAVIS_MBID; const { data, isPending, error } = useArtistGraph(activeMbid)` — falls back to Miles Davis only when store is null (initial load)
  - [x] 4.3 Add `handleArtistSelect` callback with `useCallback` — calls `setFocalArtist(artist.mbid)` + `window.history.pushState`
  - [x] 4.4 Add `TopNav` import and render it above `GraphCanvas` in a React Fragment `<>`
  - [x] 4.5 Add `Artist` import from `@/lib/data/types`
  - [x] 4.6 Keep existing `handlePivot` and `popstate` logic unchanged

- [x] Task 5: Create `src/components/search/ArtistSearchInput.test.tsx` — unit tests (AC: 6)
  - [x] 5.1 Mock `useArtistSearch` at module level via `vi.mock`
  - [x] 5.2 Test: idle state — renders input with `placeholder="Search any artist…"`, no dropdown visible
  - [x] 5.3 Test: results appear — mock returns artist, type query, assert artist name visible
  - [x] 5.4 Test: no-results message — mock returns empty array, type query, assert "No artists found for" visible
  - [x] 5.5 Test: Escape closes dropdown — type to open, press Escape, input cleared, results gone
  - [x] 5.6 Test: `onSelect` called with correct artist — type, click result (role="option"), assert onSelect spy called with correct mbid
  - [x] 5.7 All tests use `@testing-library/react` `render`, `screen`, `fireEvent`
  - [x] 5.8 `mockArtist` fixture defined per spec

- [x] Task 6: Create `src/components/nav/TopNav.test.tsx` — smoke tests (AC: 5)
  - [x] 6.1 Mock `ArtistSearchInput` to avoid cmdk DOM complexity
  - [x] 6.2 Test: renders a `<nav>` element (role="navigation")
  - [x] 6.3 Test: nav has `h-12` class (48px height)
  - [x] 6.4 Test: filter toggle button present with `aria-label="Toggle filters"`
  - [x] 6.5 Test: `onArtistSelect` prop passes through — verified via `flex-1` className on mock input

## Dev Notes

### Component file locations (must match architecture exactly)
```
src/components/
  nav/
    TopNav.tsx                  ← NEW
    TopNav.test.tsx             ← NEW
  search/
    ArtistSearchInput.tsx       ← NEW
    ArtistSearchInput.test.tsx  ← NEW
    SearchResultItem.tsx        ← NEW (no test file — tested through ArtistSearchInput)
```

No `index.tsx` directory pattern — single file per component per architecture.

### Named exports only
```typescript
// ✅ Correct — every component file in this story
export function ArtistSearchInput({ ... }: ArtistSearchInputProps) { ... }
export function TopNav({ ... }: TopNavProps) { ... }
export function SearchResultItem({ ... }: SearchResultItemProps) { ... }

// ❌ Wrong — will fail code review
export default function ArtistSearchInput() { ... }
```

Exception: `src/app/page.tsx` keeps its `export default function Home()` (Next.js App Router requirement).

### cmdk v1 API — critical configuration

`cmdk: ^1` is installed. The key patterns for our search use case:

```tsx
import { Command } from "cmdk";

// CRITICAL: shouldFilter={false} disables cmdk's built-in text matching.
// We use server-side search via useArtistSearch — cmdk must not double-filter.
<Command shouldFilter={false}>
  <Command.Input
    value={query}
    onValueChange={setQuery}
    placeholder="Search any artist…"
    aria-label="Search artists"
    onKeyDown={(e) => {
      if (e.key === "Escape") setQuery("");
    }}
  />
  {query.trim().length > 0 && (
    <Command.List>
      {!isPending && artists.length === 0 && (
        <Command.Empty>No artists found for &apos;{query}&apos;</Command.Empty>
      )}
      {artists.map((artist) => (
        <Command.Item
          key={artist.mbid}
          value={artist.mbid}
          onSelect={() => handleSelect(artist)}
        >
          <SearchResultItem artist={artist} />
        </Command.Item>
      ))}
    </Command.List>
  )}
</Command>
```

**cmdk keyboard behavior (built-in, no code needed):**
- `↑`/`↓` Arrow keys: cycle through `Command.Item` elements
- `Enter`: fires `onSelect` on the focused item
- Tab: moves browser focus (not cmdk-specific)

**Escape behavior (custom):** cmdk does not natively clear the input. The `onKeyDown` handler on `Command.Input` must call `setQuery("")` explicitly on Escape.

**Loading state:** Do NOT show `Command.Empty` while `isPending` is true. The debounce delay means the query has been typed but the API hasn't responded yet. Flashing "No artists found" during the 300ms debounce window would be misleading. Guard: `!isPending && artists.length === 0`.

**Dropdown visibility:** Conditionally render `Command.List` when `query.trim().length > 0`. This prevents an empty dropdown flash when the user first focuses the input. The dropdown closes automatically when `setQuery("")` is called (Escape or after selection).

### useArtistSearch hook — already implemented

`src/hooks/useArtistSearch.ts` is complete and correct. Do NOT modify it.

```typescript
// Signature:
export function useArtistSearch(query: string): UseQueryResult<SearchApiResponse>

// Where:
interface SearchApiResponse {
  data: Artist[];
}

// Usage:
const { data, isPending } = useArtistSearch(query);
const artists = data?.data ?? [];
```

**Key behaviors:**
- Internal 300ms debounce — the hook handles debouncing. Do NOT add a second debounce in the component.
- `enabled: !!debouncedQuery.trim()` — empty/whitespace queries do not trigger a fetch.
- `isPending: true` during the debounce window AND during the API fetch. This is correct — use `isPending` to guard the empty state message.
- TanStack Query v5: use `isPending` NOT `isLoading` (v4 API, will cause a type error).

### Zustand selector pattern — mandatory

```typescript
// ✅ Correct — selector function, subscribes to single slice
const setFocalArtist = useDigStore((state) => state.setFocalArtist);
const focalArtistId = useDigStore((state) => state.focalArtistId);

// ❌ Wrong — subscribes to entire store, triggers on every update
const { setFocalArtist } = useDigStore();
```

This is enforced by architecture and verified in story code review.

### page.tsx data flow after this story

Before Story 1.11, `page.tsx` hardcodes `MILES_DAVIS_MBID` as the argument to `useArtistGraph`. After this story, the focal artist must be driven by the Zustand store so that search selections update the graph:

```typescript
const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

function GraphView() {
  const setFocalArtist = useDigStore((state) => state.setFocalArtist);
  const focalArtistId = useDigStore((state) => state.focalArtistId);
  
  // Falls back to Miles Davis when store is null (initial load, pre-search)
  const activeMbid = focalArtistId ?? MILES_DAVIS_MBID;
  const { data, isPending, error } = useArtistGraph(activeMbid);
  const graphData = data?.data ?? null;
  ...
}
```

Note: when `handleArtistSelect` fires, `setFocalArtist(artist.mbid)` updates `focalArtistId` in the store → `activeMbid` changes → `useArtistGraph` refetches with new mbid → `updateGraphData` runs with new graph → D3 updates. This is the complete data flow.

### TopNav visual spec — Tailwind implementation

The TopNav must match the UX spec's `chrome` token: `rgba(28,24,20,0.92)` with `backdrop-blur` and `chrome-border` (White Rabbit at ~8% opacity).

No CSS custom properties for chrome token in globals.css — inline styles are used:

```tsx
// TopNav root element
<nav
  className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center gap-3 px-4"
  style={{
    backgroundColor: "rgba(28,24,20,0.92)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",  // Safari support
    borderBottom: "1px solid rgba(243,237,221,0.08)",
  }}
>
```

`h-12` = 48px (3rem at 16px base). `z-50` ensures it floats over the D3 SVG canvas.

### Filter toggle icon (inline SVG — no icon library)

Uses a simple 3-line funnel icon drawn inline. No external icon library imports.

### ResizeObserver polyfill — test setup

cmdk v1 uses `ResizeObserver` internally; JSDOM does not provide it. Added stub to `src/test/setup.ts`:

```typescript
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

This is a permanent addition to setup.ts as it benefits all future component tests that use Radix primitives.

### @testing-library/jest-dom — NOT installed

This project does NOT use `@testing-library/jest-dom`. All assertions use vitest's built-in matchers:
- `expect(el).not.toBeNull()` — element is in DOM
- `expect(el).toBeNull()` — element not present
- `expect(screen.queryByText("x")).toBeNull()` — text not visible

### Not in scope for this story

- Filter panel toggle functionality (Story 1.13)
- Filter dot indicator on the toggle button (Story 1.13)
- `src/app/artist/[slug]/page.tsx` (Story 1.12)
- Landing page `page.tsx` replacement with static data (Story 1.12)

## Dev Agent Record

### Debug Log

1. **`toBeInTheDocument` not available**: `@testing-library/jest-dom` is not installed. Changed all `toBeInTheDocument()` calls to `not.toBeNull()` / `toBeNull()` matching existing test patterns.
2. **`ResizeObserver is not defined`**: cmdk v1 uses `ResizeObserver` internally. Added global stub to `src/test/setup.ts`. This is the canonical fix for all Radix-based component tests.
3. **cmdk onSelect via `role="option"`**: Test 5.6 uses `screen.queryAllByRole("option")` to find the result item, with fallback to clicking the text element directly. Both approaches work; cmdk renders `Command.Item` as `role="option"`.

### Completion Notes

**Task 1** — `SearchResultItem.tsx` created. Pure presentational component. `getDetail()` helper returns first genre → era → null, never showing empty string. Named export only.

**Task 2** — `ArtistSearchInput.tsx` created. `shouldFilter={false}` on Command root. Escape handler manually clears query. `Command.List` conditionally rendered when `query.trim().length > 0`. Empty state guarded by `!isPending`. ARIA live region placed outside `Command` to avoid duplication with cmdk's own announcements. Named export only. `"use client"` directive added.

**Task 3** — `TopNav.tsx` created. Fixed to viewport via `position: fixed`. Chrome token applied via inline style. Filter toggle in inactive state with TODO comment for Story 1.13. `aria-label="Top navigation"` on nav element. Named export only. `"use client"` directive added.

**Task 4** — `page.tsx` updated. Added `focalArtistId` selector from Zustand. `activeMbid = focalArtistId ?? MILES_DAVIS_MBID` drives `useArtistGraph`. Added `handleArtistSelect` callback. `TopNav` rendered above `GraphCanvas` in Fragment. Loading and error states each include `TopNav` so the search bar is always accessible. `handlePivot` unchanged.

**Task 5** — `ArtistSearchInput.test.tsx` created. 5 tests, all passing. Module-level mock of `useArtistSearch` (no TanStack Query provider needed). Fixed assertion style to use `not.toBeNull()`. Tests 5.2–5.6 all green.

**Task 6** — `TopNav.test.tsx` created. 4 smoke tests, all passing. `ArtistSearchInput` mocked via `vi.mock` to avoid cmdk complexity. Tests 6.2–6.5 all green.

**Final validation**: 150/150 tests pass (was 141). 9 new tests added. 0 regressions.

## File List

- NEW: `src/components/search/SearchResultItem.tsx`
- NEW: `src/components/search/ArtistSearchInput.tsx`
- NEW: `src/components/search/ArtistSearchInput.test.tsx`
- NEW: `src/components/nav/TopNav.tsx`
- NEW: `src/components/nav/TopNav.test.tsx`
- MODIFIED: `src/app/page.tsx`
- MODIFIED: `src/test/setup.ts` (ResizeObserver polyfill for Radix/cmdk tests)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-27 | 1.0 | Story created — all artifacts loaded, ready for dev | Claude |
| 2026-05-27 | 1.1 | Implementation complete — 6 tasks done, 150/150 tests pass, status → review | Claude |
