# Story 2.4: Era & Genre Filters

## Status: review

## Story

**As a** music lover,
**I want** to filter the influence graph by era and genre,
**So that** I can narrow to the connections most relevant to the time period or style I'm exploring.

---

## Acceptance Criteria

**AC1 — FilterPanel slides down from TopNav**
Given I click the FilterToggle icon in the TopNav
When the toggle activates
Then `<FilterPanel>` slides down from under the nav via CSS `max-height` transition
And Era chips appear on the left, Genre chips on the right, "Clear All" far right

**AC2 — Era chip activates and triggers D3 dimming**
Given I click an Era chip for "1960s"
When the chip activates
Then it displays the full epoch label "1960s — British Invasion / Motown" (from `ERA_EPOCH_LABELS`)
And it has `role="checkbox"` with `aria-checked="true"` in selected state
And Zustand `setFilters` is called immediately (no Apply button)
And D3 `applyFilters()` dims out-of-era nodes to `NODE_OPACITY_DIMMED` (12%) — nodes are NOT removed

**AC3 — D3 filter is imperative (zero React re-renders)**
Given `src/graph/filters.ts` applies filters imperatively
When `applyFilters({ eras, genres })` is called
Then D3 selection updates node opacity — zero React re-renders of the graph occur
And nodes without era/genre data remain visible (not dimmed) when filters are active

**AC4 — Genre chips use OR logic**
Given Genre chips for "Rock" and "Electronic" are both active
When filters apply
Then nodes matching Rock OR Electronic remain at full opacity (OR logic within genre)

**AC5 — Clear All resets everything**
Given I click "Clear All"
When the action fires
Then all chips deactivate, Zustand filters reset, all nodes return to full opacity immediately

**AC6 — FilterToggle amber dot when filters active**
Given filters are active and I collapse the FilterPanel
When the panel slides back up
Then the FilterToggle shows an amber dot (shape change — appears/disappears, not color-only)
And accompanied by `aria-label="Filters active"`
And node dimming persists on the canvas (filters stay active while panel is collapsed)

---

## Tasks / Subtasks

- [x] **Task 1 — Add `era` field to `GraphNode` type**
  - [ ] In `src/graph/types.ts`, add `era: string | null` to the `GraphNode` interface
  - [ ] In `src/graph/simulation.ts`, update `buildNodes()` to populate `era: artist.era` from the `Artist` object

- [x] **Task 2 — Implement `applyFilters()` in `src/graph/filters.ts`**
  - [ ] Replace no-op stub with real implementation
  - [ ] Import `d3`, `NODE_OPACITY_DIMMED` from constants, `GraphNode` from types
  - [ ] Use `d3.selectAll<SVGGElement, GraphNode>("g.node")` to access all rendered nodes
  - [ ] Logic: if no filters active → set all opacity to 1; else evaluate per-node:
    - Era match: `eras.length === 0` OR `node.era === null` OR `eras.includes(node.era)` → not dimmed by era
    - Genre match: `genres.length === 0` OR `node.genres.length === 0` OR `node.genres` matches any active genre family → not dimmed by genre
    - Genre family matching: reuse the same family keys ("jazz", "rock", "electronic", "hip-hop", "classical") and test against node.genres using the same regex logic as `genreColor` in nodes.ts
    - Dim if BOTH era AND genre checks fail (AND logic between era+genre, OR logic within each)
    - `node.direction === "focal"` → always full opacity (never dim the focal artist)
  - [ ] Export `GENRE_FAMILIES` constant mapping family key → display label (used by FilterPanel to build chips)

- [ ] **Task 3 — Create `FilterChip` component**
  - [ ] Create `src/components/filters/FilterChip.tsx`
  - [ ] Props: `label: string`, `isActive: boolean`, `onToggle: () => void`
  - [ ] `role="checkbox"`, `aria-checked={isActive}`, `type="button"`
  - [ ] Active style: amber `#F0B429` text + amber border; inactive: muted `#555555` text + `rgba(255,255,255,0.1)` border
  - [ ] Hover: `rgba(255,255,255,0.08)` background
  - [ ] Named export

- [ ] **Task 4 — Create `FilterPanel` component**
  - [ ] Create `src/components/filters/FilterPanel.tsx`
  - [ ] Props: `graphData: GraphData | null`, `filterEras: string[]`, `filterGenres: string[]`, `onFiltersChange: (eras: string[], genres: string[]) => void`, `isOpen: boolean`
  - [ ] Derive available eras from `graphData.artists`: collect unique non-null `artist.era` values that exist as keys in `ERA_EPOCH_LABELS`; sort chronologically
  - [ ] Derive available genre families from `graphData.artists`: for each artist, determine genre family key from genres array; collect unique families present
  - [ ] `"use client"` directive
  - [ ] Fixed position: `fixed top-12 left-0 right-0 z-40`
  - [ ] Slide animation: CSS `max-height` transition (`max-height: 0` closed, `max-height: 56px` open), `overflow: hidden`, `transition: max-height 200ms ease-in-out`
  - [ ] Background: `rgba(10,10,10,0.96)`, `backdrop-filter: blur(12px)`, border-bottom `rgba(255,255,255,0.06)`
  - [ ] Layout: `flex items-center gap-2 px-4`, era chips left section, genre chips right section, "Clear All" far right
  - [ ] Era chip toggle: `setFilters(toggle(filterEras, era), filterGenres)` via `onFiltersChange`
  - [ ] Genre chip toggle: `setFilters(filterEras, toggle(filterGenres, genre))` via `onFiltersChange`
  - [ ] "Clear All" button: `onFiltersChange([], [])`, only rendered when any filter is active
  - [ ] Named export

- [ ] **Task 5 — Create `FilterToggle` component**
  - [ ] Create `src/components/filters/FilterToggle.tsx`
  - [ ] Props: `isOpen: boolean`, `isActive: boolean`, `onToggle: () => void`
  - [ ] Renders the existing funnel SVG icon (copy from TopNav current implementation)
  - [ ] When `isActive`: render small amber dot `#F0B429` (4px circle) absolutely positioned top-right of button; `aria-label="Filters active"` on the dot
  - [ ] Button `aria-label`: `isOpen ? "Close filters" : (isActive ? "Filters active — toggle" : "Toggle filters")`
  - [ ] Named export

- [ ] **Task 6 — Update `TopNav` to wire FilterToggle**
  - [ ] Add props: `onFilterToggle: () => void`, `isFilterPanelOpen: boolean`, `isFilterActive: boolean`
  - [ ] Replace the existing inline filter button with `<FilterToggle isOpen={isFilterPanelOpen} isActive={isFilterActive} onToggle={onFilterToggle} />`
  - [ ] Import `FilterToggle` from `@/components/filters/FilterToggle`
  - [ ] Update `TopNavProps` interface with the three new props
  - [ ] Update `TopNav.test.tsx` if it tests the filter button (add mock for new props)

- [ ] **Task 7 — Wire filters into `page.tsx`**
  - [ ] Read `filterEras` and `filterGenres` from Zustand (selector pattern)
  - [ ] Read `setFilters` from Zustand
  - [ ] Add local state: `const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)`
  - [ ] Derive `isFilterActive = filterEras.length > 0 || filterGenres.length > 0`
  - [ ] Pass `onFilterToggle={() => setIsFilterPanelOpen(p => !p)}`, `isFilterPanelOpen`, `isFilterActive` to `<TopNav>`
  - [ ] Replace hardcoded `filterEras={[]}` and `filterGenres={[]}` in `<GraphCanvas>` with Zustand values
  - [ ] Render `<FilterPanel>` between `<TopNav>` and `<GraphCanvas>`:
    ```tsx
    <FilterPanel
      graphData={graphData}
      filterEras={filterEras}
      filterGenres={filterGenres}
      onFiltersChange={setFilters}
      isOpen={isFilterPanelOpen}
    />
    ```

- [ ] **Task 8 — Wire filters into `ArtistGraphView.tsx`**
  - [ ] Same filter wiring as Task 7 — read from Zustand, local `isFilterPanelOpen` state
  - [ ] Pass to TopNav and FilterPanel
  - [ ] Replace hardcoded empty filter arrays in GraphCanvas

- [ ] **Task 9 — Write tests**
  - [ ] Create `src/components/filters/FilterPanel.test.tsx`:
    - Render with graphData fixture with various eras and genres
    - Test: chips render for available eras
    - Test: clicking a chip calls `onFiltersChange` with correct value
    - Test: "Clear All" appears when filters active, calls `onFiltersChange([], [])`
    - Test: era chip has `role="checkbox"` and correct `aria-checked`
    - Use `expect(el).not.toBeNull()` pattern (no jest-dom)
  - [ ] Run `npm run test:run` — all 176 existing + new tests pass

---

## Dev Notes

### Critical: GraphNode Needs `era` Field

`applyFilters` uses `d3.selectAll("g.node")` and accesses the D3-bound datum. The datum type is `GraphNode`. Currently `GraphNode` does NOT have `era`. Two files need a change:

**`src/graph/types.ts`** — add one line:
```typescript
export interface GraphNode extends SimulationNodeDatum {
  mbid: string;
  name: string;
  genres: string[];
  era: string | null;      // ← ADD THIS
  direction: "focal" | "upstream" | "downstream";
  isDataThin: boolean;
  opacity: number;
}
```

**`src/graph/simulation.ts`** — `buildNodes()` maps `Artist → GraphNode`. Add `era: artist.era` to the returned object:
```typescript
return {
  mbid: artist.mbid,
  name: artist.name,
  genres: artist.genres,
  era: artist.era,          // ← ADD THIS
  direction,
  isDataThin: artist.isDataThin,
  opacity: 1,
};
```

### `applyFilters` Implementation

```typescript
import * as d3 from "d3";
import type { GraphNode } from "@/graph/types";
import { NODE_OPACITY_DIMMED } from "@/graph/constants";

// Genre family keys → label (also used by FilterPanel to build chip options)
export const GENRE_FAMILIES: Record<string, string> = {
  "jazz":        "Jazz · Blues · Soul",
  "rock":        "Rock · Punk · Metal",
  "electronic":  "Electronic · Ambient",
  "hip-hop":     "Hip-Hop · R&B",
  "classical":   "Classical · Other",
};

function getGenreFamily(genres: string[]): string | null {
  if (genres.length === 0) return null;
  const g = genres.map(s => s.toLowerCase());
  if (g.some(s => /hip.hop|hip hop|rap/.test(s))) return "hip-hop";
  if (g.some(s => /r&b|rnb|rhythm.and.blues/.test(s))) return "hip-hop";
  if (g.some(s => /jazz|blues|soul/.test(s))) return "jazz";
  if (g.some(s => /rock|punk|funk|metal|grunge|indie/.test(s))) return "rock";
  if (g.some(s => /electronic|ambient|experimental|synth|techno|house|edm/.test(s))) return "electronic";
  if (g.some(s => /folk|world|reggae|afrobeats|country|bluegrass/.test(s))) return "jazz";
  return "classical";
}

export function applyFilters({ eras, genres }: FilterState): void {
  const noFilters = eras.length === 0 && genres.length === 0;

  d3.selectAll<SVGGElement, GraphNode>("g.node").attr("opacity", (_event, d) => {
    if (noFilters || d.direction === "focal") return 1;

    // Era: no data → always visible; else must match
    const eraOk = eras.length === 0 || d.era === null || eras.includes(d.era);
    // Genre: no data → always visible; else family must match at least one active filter
    const family = getGenreFamily(d.genres);
    const genreOk = genres.length === 0 || family === null || genres.includes(family);

    return eraOk && genreOk ? 1 : NODE_OPACITY_DIMMED;
  });
}
```

**Note on d3.selectAll:** This selects from the entire DOM. Since there's only one graph SVG at a time (the canvas is full-screen), this correctly targets the rendered nodes. No need to pass a selection reference.

**Note on callback signature:** D3 v7's `.attr()` with a function takes `(datum, index, groups)` — NOT an event. The second parameter `d` in `(_event, d)` would actually be the index. Use `(d)` as the first parameter:
```typescript
d3.selectAll<SVGGElement, GraphNode>("g.node").attr("opacity", (d) => {
  // d is the GraphNode datum
});
```

### Era Derivation for FilterPanel

```typescript
// From graphData.artists:
const availableEras = Object.keys(ERA_EPOCH_LABELS).filter(era =>
  graphData.artists.some(a => a.era === era)
);
// No need to sort — ERA_EPOCH_LABELS is already in chronological order
// (Object.keys preserves insertion order in V8 for non-integer keys)
```

### Genre Family Derivation for FilterPanel

```typescript
// Map each artist to its genre family, collect unique families
const availableFamilies = new Set<string>();
graphData.artists.forEach(a => {
  const family = getGenreFamily(a.genres); // use same logic as filters.ts
  if (family) availableFamilies.add(family);
});
// availableFamilies is the set of chips to show
```

Since `getGenreFamily` logic is needed by both `FilterPanel` and `filters.ts`, export it from `filters.ts` (it's already there as `applyFilters` uses it internally). FilterPanel can import it from `@/graph/filters`.

### FilterPanel Positioning and TopNav Interaction

```
z-index stack:
  SVG canvas:    z-0
  Vignette:      z-10
  GenreLegend:   z-20
  NodeDetailPanel: z-30
  FilterPanel:   z-40  ← slides down from top-12
  TopNav:        z-50  ← always on top
```

FilterPanel is `fixed top-12` (starts at the bottom edge of the 48px nav). When open, it reveals itself via `max-height` transition. The filter strip is ~48px tall (single row of chips with padding).

```tsx
<div
  className="fixed top-12 left-0 right-0 z-40 overflow-hidden"
  style={{
    maxHeight: isOpen ? "56px" : "0",
    transition: "max-height 200ms ease-in-out",
    backgroundColor: "rgba(10,10,10,0.96)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
  }}
>
  {/* chips */}
</div>
```

### TopNav Props Update

TopNav currently renders the filter button inline. Replace it with `<FilterToggle>`:

```typescript
export interface TopNavProps {
  onArtistSelect: (artist: Artist) => void;
  onFilterToggle: () => void;       // NEW
  isFilterPanelOpen: boolean;       // NEW
  isFilterActive: boolean;          // NEW
}
```

All existing callers (page.tsx, ArtistGraphView.tsx, not-found pages) need to be updated. The not-found pages don't have filter context — pass no-op values:
```tsx
// In not-found.tsx files:
<TopNav
  onArtistSelect={handleArtistSelect}
  onFilterToggle={() => {}}
  isFilterPanelOpen={false}
  isFilterActive={false}
/>
```

### Zustand Wiring (page.tsx + ArtistGraphView.tsx)

Currently hardcoded:
```tsx
<GraphCanvas filterEras={[]} filterGenres={[]} .../>
```

Replace with:
```tsx
const filterEras = useDigStore((state) => state.filterEras);
const filterGenres = useDigStore((state) => state.filterGenres);
const setFilters = useDigStore((state) => state.setFilters);
// ...
<GraphCanvas filterEras={filterEras} filterGenres={filterGenres} .../>
```

The `setFilters(eras, genres)` action is already in Zustand — no store changes needed.

### Filter Toggle Logic

```typescript
// Helper for toggling a value in an array
function toggleFilter(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

// Era chip click:
onFiltersChange(toggleFilter(filterEras, era), filterGenres)

// Genre chip click:
onFiltersChange(filterEras, toggleFilter(filterGenres, genre))

// Clear All:
onFiltersChange([], [])
```

### FilterChip Color Palette (deep-space)

Active (selected): `color: #F0B429`, `border: 1px solid #F0B429`, `backgroundColor: rgba(240,180,41,0.08)`
Inactive: `color: #555555`, `border: 1px solid rgba(255,255,255,0.1)`, `backgroundColor: transparent`
Hover: `backgroundColor: rgba(255,255,255,0.06)`

### FilterToggle Amber Dot (AC6 — shape change, not color-only)

The dot must be a shape change (appears/disappears) — not just color — for color-blindness compliance:
```tsx
{isActive && (
  <span
    className="absolute top-0 right-0 w-[5px] h-[5px] rounded-full bg-[#F0B429]"
    aria-label="Filters active"
  />
)}
```
The button's container needs `relative` positioning for the absolute dot.

### What NOT to Do

- **Do NOT** use `useDigStore()` to read filters inside `FilterPanel` or `FilterChip` — accept them as props (parent owns filter state)
- **Do NOT** call `applyFilters` in FilterPanel or FilterChip — it fires via GraphCanvas Effect 3 automatically when Zustand updates
- **Do NOT** hide nodes (display:none or visibility:hidden) — always use opacity dimming to NODE_OPACITY_DIMMED (12%)
- **Do NOT** dim the focal artist node — focal always stays at full opacity
- **Do NOT** dim nodes with null era when era filter is active — absent data = visible
- **Do NOT** dim nodes with empty genres when genre filter is active — absent data = visible
- **Do NOT** add `era` to the URL for v1 — filter state is session-only per architecture
- **Do NOT** forget to update the not-found pages when adding TopNav props — they'll get TypeScript errors

### Test Pattern (project standard)

```typescript
// ✅ Correct:
const chip = screen.queryByRole("checkbox", { name: /1960s/i });
expect(chip).not.toBeNull();
expect(chip?.getAttribute("aria-checked")).toBe("false");

// ❌ Wrong (@testing-library/jest-dom not installed):
expect(chip).toBeInTheDocument();
```

---

## Dev Agent Record

### Implementation Plan
_To be populated during implementation_

### Debug Log
_To be populated if issues arise_

### Completion Notes
_To be populated on completion_

---

## File List

_To be populated during implementation_

---

## Change Log

_To be populated during implementation_
