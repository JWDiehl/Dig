# Story 2.1: Node Hover & Artist Detail Panel (Desktop)

## Status: review

## Story

**As a** music lover on desktop,
**I want** to hover any node to reveal the artist's name, genre, and era in a side panel,
**So that** I can preview an artist's context before deciding whether to pivot to them.

---

## Acceptance Criteria

**AC1 — Panel opens on hover dwell (≥200ms)**
Given a non-focal node is hovered for ≥200ms
When the cursor enters the node bounds
Then `<NodeDetailPanel>` opens on the right side of the canvas (280px wide, frosted glass, `surface-elevated` token)
And the panel shows: artist name (detail-title: 16px/600/text-primary), genre tags (detail-body: 13px/text-secondary), era/active years (detail-body)
And the panel does not obscure the focal artist node at canvas center
And an `<AudioPreviewControl>` slot is reserved (renders empty — Story 2.2 fills it)

**AC2 — Panel closes on cursor leave**
Given the cursor leaves the node
Then `<NodeDetailPanel>` closes

**AC3 — Keyboard accessibility**
Given a keyboard user focuses a non-focal node (Tab) and presses Enter or Space
When the action fires
Then the detail panel opens with `role="dialog"` and `aria-label="[Artist name] details"`
And pressing Escape closes the panel

**AC4 — Focal node is excluded**
Given the focal artist node is hovered
Then no detail panel opens (focal node is not an exploration target)

**AC5 — Tests pass**
Given `NodeDetailPanel.test.tsx` is implemented
When `npm run test:run` executes
Then tests cover: correct artist data renders, closes on cursor leave (via onClose), Escape key closes

---

## Tasks / Subtasks

- [x] **Task 1 — Add HOVER_DETAIL_DELAY_MS constant**
  - [x] Add `export const HOVER_DETAIL_DELAY_MS = 200` to `src/graph/constants.ts`
  - [x] Add JSDoc comment explaining it is the dwell delay before NodeDetailPanel opens (distinct from HOVER_DWELL_MS which is for audio in Story 2.2)

- [x] **Task 2 — Update nodes.ts for hover callbacks and keyboard support**
  - [x] Import `HOVER_DETAIL_DELAY_MS` from constants
  - [x] Add module-level `let hoverTimer: ReturnType<typeof setTimeout> | null = null`
  - [x] Add `onHover: (mbid: string | null) => void` as 5th parameter to `renderNodes()`
  - [x] On `mouseenter`: start `HOVER_DETAIL_DELAY_MS` timeout; on expiry call `onHover(d.mbid)` for non-focal nodes only; always show hover ring immediately
  - [x] On `mouseleave`: clear pending timer; call `onHover(null)` immediately; hide hover ring
  - [x] Add `attr("tabindex", (d) => d.direction === "focal" ? null : "0")` to entered node groups
  - [x] Add `on("keydown", ...)` handler: Enter/Space fires `onHover(d.mbid)` immediately (no dwell for keyboard); focal node excluded

- [x] **Task 3 — Update simulation.ts to accept and thread onHover**
  - [x] Add module-level `let onHoverFn: (mbid: string | null) => void = () => {}`
  - [x] Add `onHover: (mbid: string | null) => void` as 4th param to `initializeGraph()`
  - [x] Set `onHoverFn = onHover` in `initializeGraph()`
  - [x] Add `function wrappedHover(mbid: string | null): void { onHoverFn(mbid); }`
  - [x] Pass `wrappedHover` as 5th arg to `renderNodes()` in both `initializeGraph()` and `updateGraphData()`
  - [x] Clear hover on pivot: call `onHoverFn(null)` inside `wrappedPivot()` before calling `onPivotFn(mbid)`

- [x] **Task 4 — Update GraphCanvas.tsx to add onHover prop**
  - [x] Add `onHover?: (mbid: string | null) => void` to `GraphCanvasProps` interface (optional, defaults to no-op)
  - [x] Pass `onHover ?? (() => {})` to `initializeGraph()` in Effect 1

- [x] **Task 5 — Create NodeDetailPanel component**
  - [x] Create `src/components/graph/NodeDetailPanel.tsx`
  - [x] Props: `artist: Artist`, `onClose: () => void`
  - [x] Fixed position: `right-4 top-[60px]` (below nav), width 280px, `z-30`
  - [x] Background: `rgba(16,16,16,0.98)` with `backdrop-filter: blur(12px)` and `border: 1px solid rgba(255,255,255,0.08)` — matches surface-elevated token
  - [x] `role="dialog"` and `aria-label` with artist name
  - [x] Escape key handler via `useEffect` → calls `onClose()`
  - [x] Artist name: 16px / font-weight 600 / `#F1F1F1`
  - [x] Genre tags: 13px / `#666666` — join array with " · " separator; omit if empty
  - [x] Era: 13px / `#666666`; omit if null
  - [x] Audio slot comment placeholder
  - [x] Smooth enter animation: `requestAnimationFrame` + CSS `transition-all duration-150`
  - [x] Named export, "use client" directive

- [x] **Task 6 — Wire NodeDetailPanel into page.tsx (landing)**
  - [x] `hoveredMbid` local state, `hoveredArtist` derived from graphData
  - [x] `handleHover` stable callback via useCallback
  - [x] Clear hover in `handlePivot` and `handleArtistSelect`
  - [x] `onHover={handleHover}` on GraphCanvas, NodeDetailPanel rendered conditionally

- [x] **Task 7 — Wire NodeDetailPanel into ArtistGraphView.tsx**
  - [x] Same pattern as Task 6 — fully wired

- [x] **Task 8 — Write NodeDetailPanel tests**
  - [x] `src/components/graph/NodeDetailPanel.test.tsx` — 7 tests
  - [x] 161/161 pass (7 new + 154 existing), zero regressions

---

## Dev Notes

### Critical Architecture: D3/React Boundary for Hover Events

**The core challenge:** D3 owns all SVG DOM including hover events on nodes. React cannot attach event listeners to D3-managed SVG elements. The bridge is a callback pattern — identical to how `onPivot` already works.

**The pattern (already proven for pivot):**
```
D3 mouseenter → hoverTimer starts → 200ms → wrappedHover(mbid) → onHoverFn(mbid) → React state update → NodeDetailPanel renders
D3 mouseleave → timer cleared → wrappedHover(null) → onHoverFn(null) → React state null → panel unmounts
```

**Do NOT** attempt to use Radix `<HoverCard.Trigger>` on SVG elements — Radix HoverCard is designed for React-rendered DOM triggers. Since D3 manages the SVG, we use a plain fixed `<div>` panel controlled by React state.

**Do NOT** store hoveredMbid in Zustand — it's ephemeral UI state local to the page/view. Local `useState` is correct.

### Module-Level Timer Pattern (nodes.ts)

A single module-level timer is sufficient since only one node can be hovered at a time:

```typescript
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

// In mouseenter:
if (hoverTimer) clearTimeout(hoverTimer);
if (d.direction !== "focal") {
  hoverTimer = setTimeout(() => { onHover(d.mbid); }, HOVER_DETAIL_DELAY_MS);
}

// In mouseleave:
if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
onHover(null);
```

Clear the timer immediately on mouseleave — do not wait for the timeout to fire before calling `onHover(null)`.

### simulation.ts: Clear Hover on Pivot

When a pivot fires, the graph re-renders and D3 fires mouseleave events naturally during the DOM join. But to be safe and ensure the panel closes immediately when a pivot starts, call `onHoverFn(null)` inside `wrappedPivot()`:

```typescript
function wrappedPivot(mbid: string): void {
  onHoverFn(null); // close detail panel immediately
  if (nodeGroupSel) beginPivotVisuals(mbid, nodeGroupSel, cachedHop1Mbids);
  onPivotFn(mbid);
}
```

### GraphCanvas: Optional onHover Prop

Make `onHover` optional to avoid requiring changes in test files that don't care about hover:

```typescript
export interface GraphCanvasProps {
  // ... existing props ...
  onHover?: (mbid: string | null) => void;
}
```

In Effect 1 (init), pass `props.onHover ?? (() => {})` to `initializeGraph`.

**Important:** Effect 1 has `[]` deps (intentionally empty — D3 owns lifecycle). The callback is stored in `onHoverFn` at module level, so stale closure is not a concern.

### NodeDetailPanel: Positioning & Z-index

```
z-index stack:
  SVG canvas:    z-0  (background)
  Vignette:      z-10 (page.tsx overlay)
  GenreLegend:   z-20 (bottom-left)
  NodeDetailPanel: z-30 (right side)
  TopNav:        z-50 (always on top)
```

Position: `fixed right-4 top-[60px]` — 4px from right edge, 60px from top (clears the 48px nav with 12px breathing room).

Width: `w-[280px]` — matches UX spec.

### NodeDetailPanel: Animation

Use CSS transitions, not Framer Motion (not installed). A clean pattern:

```tsx
// Use a key or conditional rendering with transition classes
// The panel is conditionally rendered (mounted/unmounted) based on hoveredArtist being non-null
// For enter animation: use a CSS class applied immediately + remove via useEffect after mount
```

Simplest approach: use `opacity-0 → opacity-100` + `translate-x-2 → translate-x-0` via Tailwind with `transition-all duration-150`. Apply the initial classes via a `useLayoutEffect` that sets a `mounted` state.

Or even simpler: wrap the panel in the parent with `transition-opacity` — but since we're mount/unmount (not show/hide), this won't animate.

**Recommended**: Use a small internal state `isVisible` that starts `false` and becomes `true` via `useEffect(() => setIsVisible(true), [])`. This gives a 1-frame delay that triggers the CSS transition:

```tsx
const [isVisible, setIsVisible] = useState(false);
useEffect(() => { setIsVisible(true); }, []);

<div
  className={`transition-all duration-150 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}
  ...
>
```

### Keyboard Support on D3 Nodes

Add these attributes to the ENTER selection in `nodes.ts`:

```typescript
.attr("tabindex", (d) => d.direction === "focal" ? null : "0")
.on("keydown", (_event, d) => {
  const e = _event as KeyboardEvent;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (d.direction !== "focal") onHover(d.mbid);
  }
})
```

Note: `tabindex="0"` makes nodes keyboard-focusable. `tabindex={null}` removes the attribute (D3 treats null as attribute removal).

### File Changes Summary

| File | Action | What changes |
|------|--------|-------------|
| `src/graph/constants.ts` | UPDATE | Add `HOVER_DETAIL_DELAY_MS = 200` |
| `src/graph/nodes.ts` | UPDATE | Add `onHover` param, dwell timer, tabindex, keydown handler |
| `src/graph/simulation.ts` | UPDATE | Add `onHoverFn`, `wrappedHover`, clear hover in pivot, thread through to `renderNodes` |
| `src/graph/GraphCanvas.tsx` | UPDATE | Add optional `onHover` prop, pass to `initializeGraph` |
| `src/components/graph/NodeDetailPanel.tsx` | NEW | Fixed panel, artist info, Escape handler, animation |
| `src/components/graph/NodeDetailPanel.test.tsx` | NEW | 6 smoke tests |
| `src/app/page.tsx` | UPDATE | hoveredMbid state, hoveredArtist derived, NodeDetailPanel rendered, onHover wired |
| `src/app/artist/[slug]/ArtistGraphView.tsx` | UPDATE | Same as page.tsx |

### What NOT to Do

- **Do NOT** use Radix HoverCard — it requires React-managed trigger elements; D3 owns the hover events
- **Do NOT** add `hoveredNodeId` to Zustand — ephemeral UI state, local useState is correct
- **Do NOT** pass Artist objects through D3 callbacks — pass MBID only, look up artist in graphData
- **Do NOT** show the panel for the focal artist node (check `d.direction !== "focal"`)
- **Do NOT** remove or replace the hover ring in nodes.ts — it stays, the panel is additive
- **Do NOT** add audio logic — Story 2.2 owns that; just add `{/* AudioPreviewControl — Story 2.2 */}` comment

### Established Code Patterns to Follow

**Named exports** (not default) for all components except Next.js route files:
```typescript
export function NodeDetailPanel(...) { ... }  // ✅
export default function NodeDetailPanel() {}  // ❌
```

**"use client" directive** required since NodeDetailPanel uses useState/useEffect.

**Color references** — use the new deep-space palette values, not the old warm ones:
- Text primary: `#F1F1F1` (not `#F3EDDD`)
- Text secondary: `#666666` (not `#A09880` or `#8a8470`)
- Panel bg: `rgba(16,16,16,0.98)` (surface-elevated token equivalent)
- Panel border: `rgba(255,255,255,0.08)`

**Test pattern** — project uses `expect(el).not.toBeNull()` not jest-dom matchers:
```typescript
const el = screen.queryByText("The Beatles");
expect(el).not.toBeNull();  // ✅
expect(el).toBeInTheDocument();  // ❌ @testing-library/jest-dom not installed
```

**CI skip** for live API tests: `describe.skipIf(!!process.env.CI)(...)` — not relevant here (all tests are unit/render tests with mocks).

### Previous Story Learnings (from 1.12)

- Tests mock `next/navigation` with `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))`
- `fireEvent.keyDown(document, { key: "Escape" })` pattern works for Escape key tests
- Always use `screen.queryByText()` + `.not.toBeNull()` — not `getByText` (throws on miss)
- Describe block pattern: `describe("NodeDetailPanel", () => { ... })`

---

## Dev Agent Record

### Implementation Plan
Callback-bridge pattern (matching onPivot) threads onHover from D3 nodes.ts → simulation.ts → GraphCanvas prop → React state. No Zustand, no Radix HoverCard (incompatible with D3-managed SVG events). Plain fixed-position div panel with CSS transition animation.

### Debug Log
No issues encountered. Build and all 161 tests passed on first run.

### Completion Notes
- Added `HOVER_DETAIL_DELAY_MS = 200` constant to constants.ts
- nodes.ts: module-level hoverTimer, onHover param, tabindex, keydown handler, dwell logic
- simulation.ts: onHoverFn module-level, wrappedHover, cleared on pivot, threaded to both renderNodes calls
- GraphCanvas.tsx: optional onHover prop, passed to initializeGraph with no-op default
- NodeDetailPanel.tsx: fixed right panel, frosted glass, role=dialog, Escape handler, rAF mount animation
- page.tsx + ArtistGraphView.tsx: hoveredMbid local state, hoveredArtist derived, clear on pivot/select
- 7 new tests in NodeDetailPanel.test.tsx; 161/161 pass

---

## File List

- `src/graph/constants.ts` — added HOVER_DETAIL_DELAY_MS
- `src/graph/nodes.ts` — onHover param, hoverTimer, tabindex, keydown handler
- `src/graph/simulation.ts` — onHoverFn, wrappedHover, clear on pivot, threaded through
- `src/graph/GraphCanvas.tsx` — optional onHover prop
- `src/components/graph/NodeDetailPanel.tsx` — NEW
- `src/components/graph/NodeDetailPanel.test.tsx` — NEW
- `src/app/page.tsx` — hoveredMbid state, NodeDetailPanel wired
- `src/app/artist/[slug]/ArtistGraphView.tsx` — hoveredMbid state, NodeDetailPanel wired

---

## Change Log

- Story 2.1 implemented: Node hover → NodeDetailPanel (desktop) — 2026-05-28
