# Story 3.1: Three-Tier Responsive Layout

## Status: ready-for-dev

## Story

**As a** music lover on any device,
**I want** chrome elements to adapt cleanly to my screen size,
**So that** the graph canvas is never obscured and the interface is always appropriately sized.

---

## Acceptance Criteria

**AC1 — Mobile node sizing (< 768px)**
Given I view the app at 375px (mobile)
When the graph renders
Then graph nodes render at 80% of their desktop size (20% smaller, reduces collision density)
And the TopNav search bar is full-width, fixed at top (already true — no layout changes needed)
And the filter toggle appears as an icon button (already true)

**AC2 — Tablet layout (768–1023px)**
Given I view the app at 768px (tablet `md:` breakpoint)
When I interact with the layout
Then the desktop layout applies (FilterPanel available, NodeDetailPanel position)
And hover states are suppressed — NodeDetailPanel does NOT open on hover at this breakpoint
And touch inputs are treated as clicks (Radix primitives handle this transparently)

**AC3 — Desktop full hover model (1024px+)**
Given I view the app at 1024px+ (desktop `lg:` breakpoint)
When I interact
Then the full hover model works: NodeDetailPanel opens on hover dwell

**AC4 — Resize recenters simulation**
Given I resize the browser from wide to 375px
When the resize event fires
Then no layout breaks at any intermediate width
And the D3 simulation recenters on the focal artist after resize (already implemented in resize handler)

**AC5 — touch-action on canvas**
Given `touch-action: none` is applied to the canvas SVG
When a user swipe-drags on the canvas
Then the page does not scroll — only the graph pans
And TopNav and FilterPanel retain `touch-action: auto` (vertical scroll preserved)

---

## Tasks / Subtasks

- [ ] **Task 1 — Add viewport utilities to `src/lib/motion.ts`**
  - [ ] Add `export function isMobileViewport(): boolean` — returns `window.innerWidth < 768`; returns `false` in SSR
  - [ ] Add `export function isDesktopHoverEnabled(): boolean` — returns `window.innerWidth >= 1024`; returns `true` in SSR (desktop-first fallback)
  - [ ] Both follow the same SSR-safe `typeof window === "undefined"` guard pattern as `prefersReducedMotion()`

- [ ] **Task 2 — Add mobile node radius constants to `src/graph/constants.ts`**
  - [ ] Add `NODE_RADIUS_FOCAL_MOBILE = 19` (24 × 0.8, rounded)
  - [ ] Add `NODE_RADIUS_HOP1_MOBILE = 13` (16 × 0.8, rounded)
  - [ ] Add `NODE_RADIUS_HOP2_MOBILE = 9` (11 × 0.8, rounded)
  - [ ] Add JSDoc noting these are the mobile-viewport equivalents (< 768px)

- [ ] **Task 3 — Make `nodeRadius()` viewport-aware in `src/graph/nodes.ts`**
  - [ ] Import `isMobileViewport` from `@/lib/motion`
  - [ ] Import the three mobile radius constants from `@/graph/constants`
  - [ ] Update `nodeRadius()` to return mobile constants when `isMobileViewport()` is true:
    ```typescript
    export function nodeRadius(direction, isHop1): number {
      const mobile = isMobileViewport();
      if (direction === "focal") return mobile ? NODE_RADIUS_FOCAL_MOBILE : NODE_RADIUS_FOCAL;
      if (isHop1) return mobile ? NODE_RADIUS_HOP1_MOBILE : NODE_RADIUS_HOP1;
      return mobile ? NODE_RADIUS_HOP2_MOBILE : NODE_RADIUS_HOP2;
    }
    ```
  - [ ] No other changes to nodes.ts — `nodeRadius()` is already called throughout the anatomy; the updated function propagates automatically to all call sites (glow halo, main circle, hover ring, label offset, expand ring, data-thin dot position)

- [ ] **Task 4 — Suppress hover on non-desktop in `src/graph/nodes.ts`**
  - [ ] Import `isDesktopHoverEnabled` from `@/lib/motion`
  - [ ] In the `mouseenter` handler, wrap the `HOVER_DETAIL_DELAY_MS` timer start with `if (isDesktopHoverEnabled())`:
    ```typescript
    .on("mouseenter", function (_event, d) {
      group.select(".hover-ring").attr("opacity", 1);
      if (d.direction !== "focal" && isDesktopHoverEnabled()) {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => { onHover(d.mbid); }, HOVER_DETAIL_DELAY_MS);
        if (!expandedMbids.has(d.mbid)) {
          group.select(".expand-ring").attr("opacity", 1);
        }
      }
    })
    ```
  - [ ] Hover ring still shows on all viewports (visual feedback for touch users)
  - [ ] Only the dwell timer and onHover callback are suppressed on tablet/mobile
  - [ ] Expand ring also only shown when hover enabled (desktop)

- [ ] **Task 5 — Update collision radii in `src/graph/simulation.ts`**
  - [ ] Import `isMobileViewport` from `@/lib/motion`
  - [ ] Import mobile radius constants from `@/graph/constants`
  - [ ] In `initializeGraph()`, compute `const mobile = isMobileViewport()` before force setup
  - [ ] Update `forceCollide` to use mobile radii when on mobile:
    ```typescript
    d3.forceCollide<GraphNode>((d) => {
      const isHop1 = cachedHop1Mbids.has(d.mbid);
      const focalR = mobile ? NODE_RADIUS_FOCAL_MOBILE : NODE_RADIUS_FOCAL;
      const hop1R = mobile ? NODE_RADIUS_HOP1_MOBILE : NODE_RADIUS_HOP1;
      const hop2R = mobile ? NODE_RADIUS_HOP2_MOBILE : NODE_RADIUS_HOP2;
      if (d.direction === "focal") return focalR + 25;
      if (isHop1) return hop1R + 25;
      return hop2R + 25;
    })
    ```
  - [ ] Also update `updateGraphData()` — it rebuilds the simulation forces via `sim.nodes(nodes)` but does not reset `forceCollide`. Add the same `mobile` check before the collision force is recalculated in `updateGraphData`.
  - [ ] Note: the resize handler calls `sim.alpha(0.1).restart()` but does not rebuild forces. After a mobile→desktop resize, the collision radii remain as-set at initialization. This is acceptable for v1 — full force rebuild on resize is a v2 enhancement. Document this in code.

- [ ] **Task 6 — Add `touch-action: none` to SVG in `src/graph/GraphCanvas.tsx`**
  - [ ] Add `style={{ touchAction: "none" }}` to the `<svg>` element
  - [ ] This prevents the browser intercepting touch swipes as page scroll, passing them to D3's zoom/pan behavior instead
  - [ ] Keep all existing className and other attributes unchanged

- [ ] **Task 7 — Write tests**
  - [ ] Create `src/lib/motion.test.ts` (or add to existing if it exists):
    - Test: `isMobileViewport()` returns false in SSR (mock `window` as undefined via vi.stubGlobal)
    - Test: `isDesktopHoverEnabled()` returns true in SSR
    - Test: `isMobileViewport()` returns correct values based on mocked `window.innerWidth`
  - [ ] Run `npm run test:run` — all existing + new tests pass

---

## Dev Notes

### What's ALREADY DONE — Do NOT re-implement

**AC4 (resize handler):** `simulation.ts` already has a resize handler that calls `sim.alpha(0.1).restart()` and `handleResize(svgSel, zoomGroupSel, newWidth, newHeight)`. The simulation recenters on resize. No changes needed.

**AC5 partial — TopNav and FilterPanel:** Both are `position: fixed` elements outside the SVG. They do not inherit `touch-action: none` from the SVG because they're siblings, not children. Adding `touch-action: none` to only the SVG is sufficient — TopNav and FilterPanel naturally retain `touch-action: auto` (browser default). No changes needed to those files.

**Filter toggle as icon on mobile:** The `FilterToggle` is already just an icon button — no layout-level changes needed for mobile.

**touch-action on TopNav/FilterPanel:** Not needed — these elements are `position: fixed` siblings of the SVG, not descendants. Browser default `touch-action: auto` applies.

### Viewport Utility Pattern

Follow the existing `prefersReducedMotion()` pattern exactly:

```typescript
// src/lib/motion.ts — ADD THESE:

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false; // SSR-safe
  return window.innerWidth < 768;
}

export function isDesktopHoverEnabled(): boolean {
  if (typeof window === "undefined") return true; // SSR default: desktop-first
  return window.innerWidth >= 1024;
}
```

SSR note: `isMobileViewport()` returns `false` (desktop default) in SSR. `isDesktopHoverEnabled()` returns `true` (hover enabled) in SSR. Both are correct — the D3 engine only runs in the browser.

### nodeRadius() — Why This Works Without Additional Changes

The `nodeRadius()` function is called at these places in nodes.ts:
- Glow halo `r` calculation
- Main circle `r` calculation
- Hover ring `r` calculation
- Label `dy` offset
- Expand ring `r` calculation
- Data-thin dot `cy` position

All use `nodeRadius()`. Updating the single function propagates to all anatomy layers automatically. ✓

The `addDataThinDot()` helper in `simulation.ts` also uses the `NODE_RADIUS_*` constants directly (not via `nodeRadius()`). Update that helper too:
```typescript
function addDataThinDot(mbid: string): void {
  if (!nodeGroupSel) return;
  nodeGroupSel.filter(d => d.mbid === mbid).each(function(d) {
    const sel = d3.select(this);
    if (!sel.select(".data-thin-dot").empty()) return;
    const isHop1 = cachedHop1Mbids.has(d.mbid);
    const mobile = isMobileViewport(); // ← ADD
    let r: number;
    if (d.direction === "focal") r = mobile ? NODE_RADIUS_FOCAL_MOBILE : NODE_RADIUS_FOCAL;
    else if (isHop1) r = mobile ? NODE_RADIUS_HOP1_MOBILE : NODE_RADIUS_HOP1;
    else r = mobile ? NODE_RADIUS_HOP2_MOBILE : NODE_RADIUS_HOP2;
    // ...
  });
}
```

### Hover Suppression — Scope

This story suppresses **NodeDetailPanel hover** on tablet/mobile. It does NOT:
- Remove the hover ring (still shows on all viewports — visual feedback)
- Remove the expand ring hover (suppressed too, since it's inside the same `isDesktopHoverEnabled()` guard)
- Implement the two-tap model (that's Story 3.2)

On tablet (768–1023px): tap a node → hover ring appears → no panel opens. This is intentional — the two-tap model in Story 3.2 will handle touch interaction on mobile.

### updateGraphData and Collision Radii

`updateGraphData()` in simulation.ts calls:
```typescript
sim.nodes(nodes);
(sim.force("link") as d3.ForceLink<...>).links(links);
sim.alpha(0.3).restart();
```

It does NOT reset `forceCollide`. The collision radii stay at whatever was set in `initializeGraph()`. Since `initializeGraph()` checks `isMobileViewport()` at mount time, the collision radii are correct for the initial viewport. If the user resizes from desktop to mobile AFTER mount, collision radii stay at desktop size — this is acceptable for v1.

For `updateGraphData()`, we should also rebuild collision force with the current viewport:
```typescript
export function updateGraphData(graphData: GraphData | null): void {
  if (!sim || !svgSel) return;
  if (!graphData) return;
  // ... existing code ...
  const mobile = isMobileViewport(); // ← ADD
  // Rebuild collision with potentially-updated viewport
  sim.force("collision", d3.forceCollide<GraphNode>((d) => {
    const isHop1 = cachedHop1Mbids.has(d.mbid);
    if (d.direction === "focal") return (mobile ? NODE_RADIUS_FOCAL_MOBILE : NODE_RADIUS_FOCAL) + 25;
    if (isHop1) return (mobile ? NODE_RADIUS_HOP1_MOBILE : NODE_RADIUS_HOP1) + 25;
    return (mobile ? NODE_RADIUS_HOP2_MOBILE : NODE_RADIUS_HOP2) + 25;
  }));
  // ... existing restart ...
}
```

### assignInstantPositions (prefersReducedMotion path)

The `assignInstantPositions()` helper in simulation.ts spreads nodes at fixed positions. No mobile-specific changes needed here — the positions use width/height fractions, not pixel values. ✓

### File Changes Summary

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/motion.ts` | UPDATE | Add `isMobileViewport()` and `isDesktopHoverEnabled()` |
| `src/graph/constants.ts` | UPDATE | Add `NODE_RADIUS_FOCAL_MOBILE`, `NODE_RADIUS_HOP1_MOBILE`, `NODE_RADIUS_HOP2_MOBILE` |
| `src/graph/nodes.ts` | UPDATE | `nodeRadius()` viewport-aware; hover/expand ring gated by `isDesktopHoverEnabled()` |
| `src/graph/simulation.ts` | UPDATE | `forceCollide` uses mobile radii; `updateGraphData()` rebuilds collision; `addDataThinDot()` mobile-aware |
| `src/graph/GraphCanvas.tsx` | UPDATE | Add `style={{ touchAction: "none" }}` to `<svg>` |
| `src/lib/motion.test.ts` | NEW | Tests for new utility functions |

**GraphCanvas.tsx, TopNav.tsx, FilterPanel.tsx, page.tsx, ArtistGraphView.tsx: NO other changes needed** — the existing layout already works correctly across breakpoints.

### What NOT To Do

- **Do NOT implement the two-tap model** — that's Story 3.2
- **Do NOT hide the filter panel** on mobile — it's toggled via icon, accessible on all viewports
- **Do NOT add `touch-action: none` to TopNav or FilterPanel** — only the SVG needs it; fixed elements outside SVG don't inherit it
- **Do NOT rebuild the entire simulation on resize** — the resize handler already handles recentering; full rebuild on every resize would be expensive
- **Do NOT use inline `window.innerWidth` checks** in D3 files — always go through the utility function
- **Do NOT remove the hover ring** on tablet/mobile — it provides visual touch feedback

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
