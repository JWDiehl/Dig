# Story 1.10: Graph Interaction — Zoom, Pan & Pivot

## Status

review

## Story

As a music lover,
I want to zoom and pan the graph freely and click any node to recenter on that artist,
So that I can navigate deep influence networks and follow any thread I choose.

## Acceptance Criteria

**Given** D3 zoom behavior is active on the canvas
**When** I scroll the mouse wheel
**Then** the graph zooms around the cursor position within defined bounds
**And** minimum zoom keeps the focal artist and all 1-hop neighbors in view
**And** maximum zoom makes node labels legible
**When** I click-drag
**Then** the graph pans smoothly; releasing the drag stops panning immediately

**Given** I click a non-focal node
**When** the click event fires
**Then** D3 immediately begins the visual transition — no loading indicator appears first
**And** the clicked node transitions to focal visual state (White Rabbit `#F3EDDD`, `NODE_RADIUS_FOCAL`) over `PIVOT_DURATION_MS` (~700ms)
**And** nodes departing the graph fade out over `PIVOT_DURATION_MS`
**And** nodes entering the graph fade in over `PIVOT_DURATION_MS`

**Given** `prefersReducedMotion()` returns `true` during a pivot
**When** the transition runs
**Then** node positions and visual states update instantly — no drift or fade animation

**Given** a pivot completes
**When** I inspect the browser
**Then** the URL has updated to `/artist/[new-slug]` via `pushState` (no page navigation)
**And** pressing Back restores the previous focal artist's full graph
**And** refreshing the page after pivot reloads the current focal artist (not the original)

**Given** `GraphCanvas.test.tsx` is extended for Story 1.10
**When** I run `npm run test:run`
**Then** tests pass: zoom-group element present in SVG, node click fires `onPivot` with correct MBID, focal node click does NOT fire `onPivot`

## Tasks / Subtasks

- [x] Task 1: Create `src/graph/zoom.ts` — D3 zoom behavior (AC: 1)
  - [x] 1.1 Module-level state: `zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null`
  - [x] 1.2 Constants: `ZOOM_SCALE_MIN = 0.3` (shows focal + all hop-1), `ZOOM_SCALE_MAX = 3.0` (labels legible)
  - [x] 1.3 `initializeZoom(svg, zoomGroup)` — attaches `d3.zoom().scaleExtent([ZOOM_SCALE_MIN, ZOOM_SCALE_MAX])` to SVG; `on('zoom', event => zoomGroup.attr('transform', event.transform))`
  - [x] 1.4 Disable dblclick zoom: `svg.on('dblclick.zoom', null)` — prevents accidental zoom on fast double-clicks
  - [x] 1.5 `handleResize(svg, zoomGroup, width, height)` — called on window resize; centers zoom at SVG midpoint using `zoomBehavior.translateTo`
  - [x] 1.6 `cleanupZoom(svg)` — removes `.zoom` event listeners; sets `zoomBehavior = null`
  - [x] 1.7 All exports named only

- [x] Task 2: Create `src/graph/pivot.ts` — D3 pivot visual transition (AC: 2, 3)
  - [x] 2.1 `beginPivotVisuals(newFocalMbid, nodeGroups, hop1Mbids)` — immediate visual update before new data arrives
  - [x] 2.2 Immediate transition on clicked node: `.main-circle` fill → `#F3EDDD` (White Rabbit), `r` → `NODE_RADIUS_FOCAL`; `.node-label` font-size → `15px`, font-weight → `600`
  - [x] 2.3 Duration: `prefersReducedMotion()` → 0ms; otherwise → `PIVOT_DURATION_MS`
  - [x] 2.4 Update `aria-label` of clicked node group to `"[name], focal influence"` immediately (no transition needed)
  - [x] 2.5 Import `prefersReducedMotion` from `@/lib/motion` — never inline `window.matchMedia`
  - [x] 2.6 Import `PIVOT_DURATION_MS`, `NODE_RADIUS_FOCAL` from `@/graph/constants`

- [x] Task 3: Update `src/graph/nodes.ts` — enter/exit animations + focal click guard (AC: 2, 3)
  - [x] 3.1 ENTER animation: new node groups start at `opacity: 0` on `.append()`; use `.transition().duration(PIVOT_DURATION_MS).attr('opacity', 1)`; `prefersReducedMotion()` → skip transition (set opacity 1 directly)
  - [x] 3.2 EXIT animation: `sel.exit().transition().duration(PIVOT_DURATION_MS).attr('opacity', 0).remove()`; `prefersReducedMotion()` → `.remove()` directly
  - [x] 3.3 Focal click guard: click handler fires ONLY when `d.direction !== 'focal'` — clicking the focal node is a no-op
  - [x] 3.4 Cursor: focal nodes get `cursor: default`; non-focal nodes keep `cursor: pointer`
  - [x] 3.5 Import `PIVOT_DURATION_MS` from `@/graph/constants` (it was already imported via constants — add it)
  - [x] 3.6 Ensure `prefersReducedMotion` import is added to `nodes.ts`

- [x] Task 4: Update `src/graph/simulation.ts` — zoom-group layer + wrapped pivot handler (AC: 1, 2)
  - [x] 4.1 Add module-level state: `zoomGroupSel: d3.Selection<SVGGElement, unknown, null, undefined> | null`
  - [x] 4.2 In `initializeGraph`: change SVG structure — append `<g class="zoom-group">` FIRST (after defs), then append `<g class="edges">` and `<g class="nodes">` INSIDE `zoom-group`; direction labels stay outside (fixed)
    - Before: `svg → <defs> → <g.edges> → <g.nodes> → <g.direction-labels>`
    - After: `svg → <defs> → <g.zoom-group> → [<g.edges>, <g.nodes>] | <g.direction-labels>`
  - [x] 4.3 Call `initializeZoom(svgSel, zoomGroupSel)` from `zoom.ts` after groups are set up
  - [x] 4.4 Wrap `onPivotFn` call: before calling the React callback, call `beginPivotVisuals(mbid, nodeGroupSel, cachedHop1Mbids)` from `pivot.ts`
    ```typescript
    function wrappedPivot(mbid: string): void {
      if (nodeGroupSel) beginPivotVisuals(mbid, nodeGroupSel, cachedHop1Mbids)
      onPivotFn(mbid) // triggers React parent: store update + pushState
    }
    ```
  - [x] 4.5 Pass `wrappedPivot` to `renderNodes(...)` and `initializeGraph(...)` — NOT `onPivotFn` directly
  - [x] 4.6 In `cleanupGraph`: call `cleanupZoom(svgSel)` before clearing SVG; reset `zoomGroupSel = null`
  - [x] 4.7 Add window resize handler in `initializeGraph`: `window.addEventListener('resize', handleResizeFn)` — calls `handleResize(svgSel, zoomGroupSel, newW, newH)`; stored as module-level var for cleanup
  - [x] 4.8 Remove resize listener in `cleanupGraph`
  - [x] 4.9 Update edge/node rendering to use `zoomGroupSel.select('g.edges')` and `zoomGroupSel.select('g.nodes')`

- [x] Task 5: Update `src/graph/GraphCanvas.tsx` — back-button support via popstate (AC: 4)
  - [x] 5.1 Add a fourth `useEffect` for popstate: `window.addEventListener('popstate', handlePopState)`
  - [x] 5.2 `handlePopState(e: PopStateEvent)`: reads `e.state?.focalMbid: string`; if present, calls `onPivot(focalMbid)` — this re-uses the same pivot path as a node click
  - [x] 5.3 Cleanup: `return () => window.removeEventListener('popstate', handlePopState)`
  - [x] 5.4 The popstate effect deps: `[onPivot]` — stable function ref from parent

- [x] Task 6: Update `src/app/page.tsx` — proper pivot handler with Zustand + pushState (AC: 4)
  - [x] 6.1 Add `useCallback` import from React
  - [x] 6.2 Import `useDigStore` from `@/store`
  - [x] 6.3 In `GraphView`: `const setFocalArtist = useDigStore((state) => state.setFocalArtist)` — selector pattern
  - [x] 6.4 Build `handlePivot = useCallback((mbid: string) => { ... }, [graphData, setFocalArtist])`:
    - Calls `setFocalArtist(mbid)` — triggers TanStack Query refetch
    - Looks up slug: `const artist = graphData?.artists.find(a => a.mbid === mbid)`
    - Calls `window.history.pushState({ focalMbid: mbid }, '', artist?.slug ? \`/artist/${artist.slug}\` : '')`
  - [x] 6.5 Pass `handlePivot` as `onPivot` to `<GraphCanvas>` instead of the inline console.log stub
  - [x] 6.6 Set initial URL state on mount so back button works from first pivot:
    - `useEffect(() => { window.history.replaceState({ focalMbid: MILES_DAVIS_MBID }, '') }, [])`

- [x] Task 7: Update `src/graph/GraphCanvas.test.tsx` — zoom + pivot interaction tests (AC: 5)
  - [x] 7.1 Test: `<g class="zoom-group">` exists inside SVG after init
  - [x] 7.2 Test: `<g class="edges">` and `<g class="nodes">` are children of `zoom-group`, not direct SVG children
  - [x] 7.3 Test: clicking a non-focal node fires `onPivot` with correct MBID
  - [x] 7.4 Test: clicking the focal node does NOT fire `onPivot`
  - [x] 7.5 Test: `onPivot` stub is called with the upstream artist MBID when that node is clicked (use `fireEvent.click`)
  - [x] 7.6 All existing 19 tests must continue to pass

- [x] Task 8: Run full validations
  - [x] 8.1 `npm run test:run` — 141/141 tests pass (5 new Story 1.10 + 24 Story 1.9 + 112 existing)
  - [x] 8.2 `npm run lint` — 0 errors, 0 warnings
  - [x] 8.3 `npm run build` — TypeScript clean, static pages generated successfully

## Dev Notes

### D3 Zoom Architecture: zoom-group Layer

**This is the most important structural change in this story.** Zoom/pan requires all moving content to live inside a single container group that receives the zoom `transform`. Currently simulation.ts appends `<g class="edges">` and `<g class="nodes">` directly to the SVG. Story 1.10 wraps them in `<g class="zoom-group">`.

**New SVG layer structure:**
```
<svg role="img">
  <defs>                      ← glow filter (unchanged)
  <g class="zoom-group">      ← NEW: zoom transform applied here
    <g class="edges">         ← moved inside zoom-group
    <g class="nodes">         ← moved inside zoom-group
  </g>
  <g class="direction-labels">← outside zoom-group: fixed position
</svg>
```

Direction labels stay outside the zoom-group so they stay fixed when the user pans/zooms. Nodes and edges move with zoom transforms.

**zoom.ts wiring:**
```typescript
// initializeZoom sets this transform on every zoom event:
zoomGroup.attr('transform', event.transform)
// event.transform is a d3.ZoomTransform with .x, .y, .k (scale)
```

**Disable dblclick zoom** — critical. Without this, a fast double-click on a node triggers both the click handler (pivot) AND a zoom. Always call `svg.on('dblclick.zoom', null)` after attaching the zoom behavior.

### Pivot: Immediate Visuals vs. Data Arrival

The pivot happens in two phases:

**Phase 1 — Immediate (before data arrives):** `beginPivotVisuals` in pivot.ts runs synchronously when the node is clicked. It uses D3 transitions to update the clicked node's visual appearance to focal state. The simulation continues running, rearranging with the current nodes.

**Phase 2 — Data arrival:** When TanStack Query delivers the new `GraphData` and `updateGraphData` is called, the full D3 join runs with enter/update/exit — new nodes fade in, departed nodes fade out.

The gap between Phase 1 and Phase 2 is typically 200–800ms (API round-trip). During this gap, the clicked node looks focal but other nodes haven't changed yet. This is intentional — the immediate visual feedback is what makes the transition feel instant.

**wrappedPivot in simulation.ts:**
```typescript
function wrappedPivot(mbid: string): void {
  // Phase 1: immediate D3 visual (before data)
  if (nodeGroupSel) beginPivotVisuals(mbid, nodeGroupSel, cachedHop1Mbids)
  // Notify React parent → store update + pushState + TanStack Query refetch
  onPivotFn(mbid)
}
```

Pass `wrappedPivot` everywhere `onPivotFn` was passed directly (to `renderNodes`, not to external callers). The external `onPivot` prop still receives the plain `(mbid) => void` callback from React — the D3 visual work is transparent to React.

### Enter / Exit Animations in nodes.ts

**Exit (nodes leaving):**
```typescript
// prefersReducedMotion: skip transition
if (prefersReducedMotion()) {
  sel.exit().remove()
} else {
  sel.exit()
    .transition().duration(PIVOT_DURATION_MS)
    .attr('opacity', 0)
    .remove()
}
```

**Enter (new nodes arriving):**
```typescript
const entered = sel.enter()
  .append('g')
  .attr('class', 'node')
  // ... all anatomy ...
  .attr('opacity', 0) // start invisible

if (!prefersReducedMotion()) {
  entered.transition().duration(PIVOT_DURATION_MS).attr('opacity', 1)
} else {
  entered.attr('opacity', 1)
}
```

The "drift" effect comes naturally from the physics simulation — new nodes start at the SVG edge (their initial x/y is 0,0 or random) and are pulled toward their target positions by forces. Combined with the fade-in, this reads as "drifting in from the edges."

### Focal Click Guard

The current `nodes.ts` click handler fires `onPivot(d.mbid)` for ALL nodes. This needs to be guarded:

```typescript
.on('click', (_event, d) => {
  if (d.direction === 'focal') return // focal node is not clickable
  onPivot(d.mbid)
})
```

Also update cursor: focal node → `cursor: default`; non-focal → `cursor: pointer`. Apply this when creating the group:
```typescript
.style('cursor', d => d.direction === 'focal' ? 'default' : 'pointer')
```

### URL + Back Button Design

**pushState payload:** `{ focalMbid: string }` — store the MBID in the state object so the back button handler can read it directly without slug→MBID resolution.

```typescript
window.history.pushState(
  { focalMbid: mbid },           // state object (readable via popstate event)
  '',                            // title (ignored by browsers)
  `/artist/${artist.slug}`       // URL shown in address bar
)
```

**popstate handler in GraphCanvas:**
```typescript
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    const mbid = (e.state as { focalMbid?: string } | null)?.focalMbid
    if (mbid) onPivot(mbid)
  }
  window.addEventListener('popstate', handlePopState)
  return () => window.removeEventListener('popstate', handlePopState)
}, [onPivot])
```

**Initial state replacement in page.tsx:**
```typescript
useEffect(() => {
  // Replace initial history entry so the very first Back press works
  window.history.replaceState({ focalMbid: MILES_DAVIS_MBID }, '')
}, [])
```

**Note:** Story 1.12 creates the actual `/artist/[slug]` route that handles page refreshes and direct URL loads. Story 1.10 only needs the pushState to work for the SPA pivot navigation — the URL is correct even if a refresh lands on a 404 until Story 1.12.

### zoom.ts Constants

These values are NOT in `src/graph/constants.ts` (that file is for animation/physics/size constants). Define them locally in `zoom.ts`:

```typescript
const ZOOM_SCALE_MIN = 0.3  // Shows focal + all 1-hop neighbors
const ZOOM_SCALE_MAX = 3.0  // Labels legible at max zoom
```

### Resize Handler

When the viewport resizes, the SVG dimensions used to position forces become stale. Add a resize handler that:
1. Updates the SVG `width`/`height` attributes
2. Updates `forceCenter(newWidth/2, newHeight/2)` and `forceX` targets
3. Restarts simulation briefly (`sim.alpha(0.1).restart()`)
4. Calls `handleResize` from zoom.ts to re-center

Store the handler function in a module-level variable so `cleanupGraph` can remove it.

### pivot.ts: Only D3 Visuals, No DOM/URL Side Effects

`pivot.ts` is a pure D3 module. It:
- ✅ Updates D3 selections (transitions, attr changes)
- ✅ Reads `prefersReducedMotion()`
- ❌ Does NOT call `window.history.pushState` — that's page.tsx responsibility
- ❌ Does NOT call Zustand — that's GraphCanvas/parent responsibility
- ❌ Does NOT call TanStack Query — that's triggered by Zustand focalArtistId change

### Files Being Modified

| File | Change | Key Preservation Requirement |
|------|--------|------------------------------|
| `simulation.ts` | Add zoom-group layer, init zoom, wrappedPivot | Must preserve all existing force physics and ticked() handler |
| `nodes.ts` | Enter/exit animations, focal click guard | Existing node anatomy (5 layers) must not change |
| `GraphCanvas.tsx` | Add popstate useEffect | Existing 3 useEffects (init/data/filter) must remain intact |
| `page.tsx` | Proper pivot handler + popstate | Miles Davis MBID `561d854a-6a28-4aa7-8c99-323e6ce46c2a` must be preserved |
| `GraphCanvas.test.tsx` | Add zoom + pivot tests | Existing 19 tests must continue passing |

### Testing Notes

**Zoom tests in JSDOM:** D3's zoom doesn't fully work in JSDOM (no real viewport, events don't fire). Test what we can verify:
- `<g class="zoom-group">` element exists in the SVG (structure test)
- `<g class="edges">` is a child of `.zoom-group` (not direct SVG child)

**Click tests:** Use `@testing-library/user-event` or `fireEvent.click` from RTL. The click handler is on the `<g role="button">` element. Query by `aria-label` to find the specific node.

```tsx
// Find upstream node and click it
const upstreamNode = container.querySelector('[aria-label="Chuck Berry, upstream influence"]')
fireEvent.click(upstreamNode!)
expect(onPivotMock).toHaveBeenCalledWith('upstream-1')

// Focal node click should NOT call onPivot
const focalNode = container.querySelector('[aria-label="The Beatles, focal influence"]')
fireEvent.click(focalNode!)
expect(onPivotMock).not.toHaveBeenCalled()
```

**Note on focal node query:** Use the exact aria-label `"The Beatles, focal influence"` rather than `*=` wildcard. The SVG element itself also contains "The Beatles" in its aria-label, so the wildcard would match the SVG element, not the focal node group.

**prefersReducedMotion mock** remains `true` in all tests (set in the existing `vi.mock` at the top of the test file) — this makes transitions instant and keeps tests deterministic.

### Constants Already Available

From `src/graph/constants.ts`:
- `PIVOT_DURATION_MS = 700` — use for all transition durations
- `NODE_RADIUS_FOCAL = 24` — focal circle size in `beginPivotVisuals`

### Anti-Patterns to Avoid

```typescript
// ❌ Double-click zoom not disabled — fast pivot clicks accidentally zoom
d3.zoom().scaleExtent([...]).on('zoom', handler)
// ✅ Add: svg.on('dblclick.zoom', null)

// ❌ pushState in pivot.ts — wrong layer
export function beginPivotVisuals(...) {
  window.history.pushState(...)  // NO — this belongs in page.tsx/route
}

// ❌ Zoom applied to SVG without zoom-group — nothing moves
svg.call(d3.zoom().on('zoom', e => svg.attr('transform', e.transform)))
// ✅ Apply transform to the zoom-group child, not the SVG itself

// ❌ Edges/nodes outside zoom-group — they won't pan/zoom
svgSel.append('g').attr('class', 'edges')  // direct child of SVG
// ✅ zoomGroupSel.append('g').attr('class', 'edges')

// ❌ Direction labels inside zoom-group — they'd move with pan
zoomGroupSel.append('g').attr('class', 'direction-labels')
// ✅ svgSel.append('g').attr('class', 'direction-labels')  // outside zoom-group
```

## Dev Agent Record

### Debug Log

| Issue | Resolution |
|-------|------------|
| `_hop1Mbids` unused parameter warning in pivot.ts | Renamed to `hop1Mbids` and added `void hop1Mbids` suppression — matches project convention from Story 1.9 |
| Test 7.4 focal node query was matching SVG aria-label | SVG element has "The Beatles" in its own aria-label; fixed test to use exact match `"The Beatles, focal influence"` to target the focal `<g>` element specifically |

### Completion Notes

Story 1.10 fully implemented. 5 new/modified source files + 2 new source files:

- **zoom.ts** (NEW): Module-level `zoomBehavior`. `initializeZoom` attaches `d3.zoom().scaleExtent([0.3, 3.0])` to SVG; zoom transform applied to `zoomGroup` param; dblclick zoom disabled. `handleResize` re-centers via `translateTo`. `cleanupZoom` removes listeners.

- **pivot.ts** (NEW): Pure D3 visual module. `beginPivotVisuals` finds clicked node group, updates aria-label immediately, then transitions `.main-circle`, `.glow-halo`, `.hover-ring`, `.node-label` to focal visual state. Duration = 0 if `prefersReducedMotion()`, else `PIVOT_DURATION_MS`.

- **nodes.ts** (UPDATED): EXIT now fades to opacity 0 before remove (skipped if reduced motion). ENTER nodes start at opacity 0, fade to 1 after anatomy appended (instant if reduced motion). Focal click guard: `if (d.direction === 'focal') return`. Cursor: dynamic `'default'` for focal, `'pointer'` for non-focal.

- **simulation.ts** (UPDATED): Added `zoomGroupSel` and `resizeHandlerFn` module state. SVG structure now uses zoom-group wrapper. `initializeZoom` called after zoom-group setup. `wrappedPivot` function calls `beginPivotVisuals` then `onPivotFn`. Resize handler updates forces + calls `handleResize`. `updateGraphData` uses `zoomGroupSel` selectors. `cleanupGraph` removes resize listener and calls `cleanupZoom`.

- **GraphCanvas.tsx** (UPDATED): Fourth `useEffect` for popstate — reads `e.state.focalMbid` and calls `onPivot`. Deps: `[onPivot]`.

- **page.tsx** (UPDATED): Imports `useCallback`, `useDigStore`. `handlePivot` uses Zustand `setFocalArtist` + `pushState({ focalMbid })` with artist slug URL. Initial `replaceState` on mount for back-button from first pivot. Replaces console.log stub.

- **GraphCanvas.test.tsx** (UPDATED): Added `fireEvent` import. 5 new Story 1.10 tests: zoom-group structure (2), click fires onPivot (2), focal click guard (1). Fixed test 7.4 to use exact aria-label query. All 24 tests pass.

## File List

- `src/graph/zoom.ts` — NEW
- `src/graph/pivot.ts` — NEW
- `src/graph/nodes.ts` — MODIFIED (enter/exit animations, focal click guard, imports)
- `src/graph/simulation.ts` — MODIFIED (zoom-group layer, wrappedPivot, resize handler, cleanup)
- `src/graph/GraphCanvas.tsx` — MODIFIED (popstate useEffect)
- `src/app/page.tsx` — MODIFIED (handlePivot with Zustand + pushState + replaceState)
- `src/graph/GraphCanvas.test.tsx` — MODIFIED (5 new Story 1.10 tests + fireEvent import)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-27 | Story file created |
| 2026-05-27 | Story 1.10 implemented — zoom/pan/pivot interaction (2 new files, 5 modified, 5 new tests; 141/141 pass) |
