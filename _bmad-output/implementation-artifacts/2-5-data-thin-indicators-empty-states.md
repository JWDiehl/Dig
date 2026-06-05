# Story 2.5: Data-Thin Indicators & Empty States

## Status: ready-for-dev

## Story

**As a** music lover,
**I want** honest, calm signals when influence data is sparse or unavailable,
**So that** I understand the picture without feeling like something is broken.

---

## Acceptance Criteria

**AC1 — Node-level amber dot (ALREADY DONE — no implementation needed)**
Given an artist node has `isDataThin === true`
When I view it in the graph
Then a small amber dot appears on the node perimeter — visual only, no text at the node level
→ **This is fully implemented in nodes.ts. Do NOT modify nodes.ts for this AC.**

**AC2 — Graph-level data-thin notice**
Given a graph-level data-thin state (focal artist `isDataThin === true`)
When the graph finishes loading and settles (~700ms after data arrives)
Then a `<DataThinBadge variant="graph-notice">` renders: "Limited data for this artist — showing what we have"
And it has `role="status"` and `aria-live="polite"`
And it uses `text-dim` color (`#333333`), 14px/400 weight

**AC3 — EmptyState for no-influence-data**
When `/artist/[slug]` loads for an artist with zero influence relationships (`graphData.edges.length === 0`)
Then `<EmptyState variant="no-influence-data">` shows: "We don't have influence data for this artist yet."
And the focal artist node still renders in the graph (graph is not hidden)
And the EmptyState is overlaid below the graph, non-obstructing

**AC4 — EmptyState for artist-not-found (wire into not-found pages)**
When an unknown slug is loaded
Then `<EmptyState variant="artist-not-found">` activates: "We couldn't find that artist. Try searching above."
→ This replaces the inline `<p>` in `/artist/[slug]/not-found.tsx`

**AC5 — GraphErrorState replaces inline error divs**
Given `<GraphErrorBoundary>` wraps `<GraphCanvas>`
When the D3 engine throws an unhandled exception
Then `<GraphErrorState>` renders: "Having trouble reaching our data sources — try refreshing"
And the error is caught — no full-page crash
And NONE of the empty state or error variants use the words "unavailable", "failed", or "error" in user-facing copy

**AC6 — API error state in ArtistGraphView uses friendly copy**
Given the graph API returns an error
When the error state renders
Then copy does NOT say "Error: {error.message}" — replace with friendly message that doesn't use forbidden words

---

## Tasks / Subtasks

- [ ] **Task 1 — Create `GraphErrorState` component**
  - [ ] Create `src/components/empty-states/GraphErrorState.tsx`
  - [ ] Named export `GraphErrorState`
  - [ ] `"use client"` directive
  - [ ] Renders full-screen centered message: "Having trouble reaching our data sources — try refreshing"
  - [ ] Includes a "Refresh" button that calls `window.location.reload()` or links to `/`
  - [ ] Style: `text-[14px] text-[#333333]` for message, subtle button below
  - [ ] No forbidden words: "unavailable", "failed", "error"

- [ ] **Task 2 — Create `EmptyState` component**
  - [ ] Create `src/components/empty-states/EmptyState.tsx`
  - [ ] Named export `EmptyState`
  - [ ] Props: `variant: "no-search-results" | "artist-not-found" | "no-influence-data"`, `query?: string` (for no-search-results variant)
  - [ ] All variants use `text-[14px] text-[#333333]` (text-dim), 400 weight, centered
  - [ ] `no-search-results`: "No artists found for '{query}'" — `query` prop interpolated
  - [ ] `artist-not-found`: "We couldn't find that artist. Try searching above."
  - [ ] `no-influence-data`: "We don't have influence data for this artist yet."
  - [ ] None use "unavailable", "failed", or "error"
  - [ ] No variant interrupts the graph area — rendered as overlay, not replacing graph

- [ ] **Task 3 — Create `DataThinBadge` component**
  - [ ] Create `src/components/empty-states/DataThinBadge.tsx`
  - [ ] Named export `DataThinBadge`
  - [ ] Props: `variant: "graph-notice" | "no-downstream"`
  - [ ] `"use client"` directive
  - [ ] `graph-notice` variant: "Limited data for this artist — showing what we have"
  - [ ] `no-downstream` variant: "Downstream connections for this artist are sparse — expected for contemporary artists"
  - [ ] `role="status"` and `aria-live="polite"` on the root element
  - [ ] Style: `text-[14px] text-[#333333]` (text-dim), 400 weight
  - [ ] Position: fixed bottom-center, `z-20`, non-obstructing overlay
  - [ ] Animate in: fade in after mount (same `requestAnimationFrame` pattern as NodeDetailPanel)

- [ ] **Task 4 — Wire DataThinBadge into `page.tsx`**
  - [ ] Import `DataThinBadge` from `@/components/empty-states/DataThinBadge`
  - [ ] Add local state: `const [showDataThinBadge, setShowDataThinBadge] = useState(false)`
  - [ ] Add effect: when `graphData?.focalArtist.isDataThin` becomes true, start a timer of `PIVOT_DURATION_MS + 100` ms; on expiry set `showDataThinBadge(true)`. When it becomes false, immediately reset to false.
  - [ ] Import `PIVOT_DURATION_MS` from `@/graph/constants`
  - [ ] Determine `noDownstream`: `graphData !== null && graphData.edges.filter(e => e.direction === "downstream").length === 0 && graphData.edges.length > 0`
  - [ ] In the success return: render `{showDataThinBadge && <DataThinBadge variant={noDownstream ? "no-downstream" : "graph-notice"} />}`
  - [ ] Also add `no-influence-data` empty state: if `graphData !== null && graphData.edges.length === 0`, render `<EmptyState variant="no-influence-data" />` overlaid at bottom-center

- [ ] **Task 5 — Wire DataThinBadge and EmptyState into `ArtistGraphView.tsx`**
  - [ ] Same DataThinBadge logic as Task 4
  - [ ] Same no-influence-data EmptyState as Task 4
  - [ ] Replace `GraphErrorBoundary` fallback inline div with `<GraphErrorState />`
  - [ ] Replace the API error state inline div ("Error: {error.message}") with friendly copy: "We had trouble loading this artist's connections — try refreshing." (no forbidden words)

- [ ] **Task 6 — Wire EmptyState into `not-found.tsx` pages**
  - [ ] `src/app/artist/[slug]/not-found.tsx`: replace the inline `<p>` text with `<EmptyState variant="artist-not-found" />`
  - [ ] `src/app/not-found.tsx`: update inline text — keep as-is or use EmptyState with appropriate copy

- [ ] **Task 7 — Replace `GraphErrorBoundary` fallback in `page.tsx`**
  - [ ] Import `GraphErrorState` from `@/components/empty-states/GraphErrorState`
  - [ ] Replace inline fallback div in `<GraphErrorBoundary fallback={...}>` with `<GraphErrorState />`

- [ ] **Task 8 — Write tests**
  - [ ] Create `src/components/empty-states/EmptyState.test.tsx`:
    - Test: no-influence-data variant renders correct copy
    - Test: artist-not-found variant renders correct copy
    - Test: no forbidden words present in any rendered output
    - Use `expect(el).not.toBeNull()` pattern
  - [ ] Create `src/components/empty-states/DataThinBadge.test.tsx`:
    - Test: graph-notice variant renders correct copy
    - Test: has `role="status"` attribute
    - Test: has `aria-live="polite"` attribute
  - [ ] Run `npm run test:run` — all 183 existing + new tests pass

---

## Dev Notes

### AC1 Is Already Done — Do NOT Touch nodes.ts

The amber data-thin dot on node perimeter is fully implemented in `src/graph/nodes.ts` layer 4:
```typescript
entered.filter((d) => d.isDataThin)
  .append("circle")
  .attr("class", "data-thin-dot")
  .attr("r", 3)
  .attr("fill", "#F0B429")
  ...
```
The D3 expand path also adds this dot via `addDataThinDot()` in simulation.ts. **Do NOT re-implement or modify this.** Story 2.5's node-level AC is already satisfied.

### DataThinBadge Timing — Show After Graph Settles

The badge must appear "after the graph transition settles" per spec. Use a delayed effect keyed to the focal artist's MBID (so it resets on pivot):

```typescript
const [showDataThinBadge, setShowDataThinBadge] = useState(false);

useEffect(() => {
  setShowDataThinBadge(false); // reset immediately on artist change
  if (!graphData?.focalArtist.isDataThin) return;
  const timer = setTimeout(
    () => setShowDataThinBadge(true),
    PIVOT_DURATION_MS + 100,
  );
  return () => clearTimeout(timer);
}, [graphData?.focalArtist.mbid, graphData?.focalArtist.isDataThin]);
```

Key: `PIVOT_DURATION_MS` (700ms) is already in `@/graph/constants`. Import it.

### DataThinBadge: Which Variant?

Priority:
1. If `graphData.edges.length > 0` AND `countByDirection(graphData, "downstream") === 0` → use `"no-downstream"` variant ("Downstream connections for this artist are sparse...")
2. Otherwise if `focalArtist.isDataThin` → use `"graph-notice"` variant ("Limited data for this artist...")

The no-downstream variant is for contemporary artists who influence others but are not yet widely credited as influences themselves. It's more informative than the generic sparse-data message.

### DataThinBadge Positioning

```
Position: fixed bottom-10 left-0 right-0 z-20 text-center pointer-events-none
```

This sits above the vignette (z-10) but below NodeDetailPanel (z-30) and nav (z-50). Using `pointer-events-none` keeps it purely informational — no interaction needed.

### EmptyState — No-Influence-Data Detection

```typescript
const hasNoInfluenceData = graphData !== null && graphData.edges.length === 0;
```

Render below the canvas (same z-level as DataThinBadge, bottom-center). The focal artist node STILL renders in the graph. The EmptyState is additive information, not a replacement for the graph.

This state is rare but real — some very new artists loaded by expanding from another artist's graph may have no recorded connections.

### EmptyState — No-Search-Results

The `no-search-results` variant exists in the component for completeness per the AC ("EmptyState is implemented with 3 variants"). However, ArtistSearchInput.tsx already handles this inline with the correct text. **Do NOT modify ArtistSearchInput.tsx** for this story — the AC is already satisfied. The `EmptyState` component just needs to support the variant.

### GraphErrorState — Forbidden Words

Must NOT use: "unavailable", "failed", or "error" anywhere in user-facing copy.

Safe copy:
- GraphErrorState: "Having trouble reaching our data sources — try refreshing"
- ArtistGraphView API error: "We had trouble loading this artist's connections — try refreshing."
- EmptyState no-influence-data: "We don't have influence data for this artist yet."
- EmptyState artist-not-found: "We couldn't find that artist. Try searching above."

Current `ArtistGraphView.tsx` has `"Error: {error.message}"` — this MUST be replaced.

### File Locations (Architecture Compliance)

Architecture specifies `src/components/empty-states/` for these files:
```
src/components/empty-states/
  EmptyState.tsx
  DataThinBadge.tsx
  GraphErrorState.tsx
  EmptyState.test.tsx     ← NEW test file
  DataThinBadge.test.tsx  ← NEW test file
```

### What NOT To Do

- **Do NOT touch `src/graph/nodes.ts`** — AC1 (node dot) is already done
- **Do NOT use "error", "failed", or "unavailable"** in any user-facing copy
- **Do NOT hide the graph** when no-influence-data — focal artist node still shows
- **Do NOT add a new Zustand state** for badge visibility — local useState is correct
- **Do NOT make DataThinBadge interactive** — `pointer-events-none`, it's informational
- **Do NOT use `aria-live="assertive"`** — must be `"polite"` (non-disruptive)

### Test Pattern Reminder

```typescript
// ✅
const el = screen.queryByText(/limited data/i);
expect(el).not.toBeNull();

// ✅ attribute check
const badge = screen.queryByRole("status");
expect(badge?.getAttribute("aria-live")).toBe("polite");

// ❌ jest-dom not installed
expect(el).toBeInTheDocument();
```

### Current Inline Error States to Replace

**`page.tsx` GraphErrorBoundary fallback** (currently inline):
```tsx
<GraphErrorBoundary fallback={
  <div className="flex h-full items-center justify-center text-[#555555]">
    Graph engine error — check the console.
  </div>
}>
```
Replace with: `<GraphErrorBoundary fallback={<GraphErrorState />}>`

**`ArtistGraphView.tsx` API error state** (currently):
```tsx
<div className="flex h-full items-center justify-center text-[#555555]">
  Error: {error.message}
</div>
```
Replace with friendly copy. Note: `error.message` may contain "error" as a substring — **do not render it**. The forbidden words rule applies to copy we control.

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
