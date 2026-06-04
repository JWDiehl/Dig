# Story 2.3: On-Demand Hop Expansion

## Status: review

## Story

**As a** music lover,
**I want** to expand any leaf node to reveal one additional hop of influence relationships,
**So that** I can go deeper on a specific branch without loading the entire graph at once.

---

## Acceptance Criteria

**AC1 — Expand affordance on leaf nodes**
Given a leaf node (non-focal, not yet expanded) is hovered
When the cursor enters the node bounds
Then an expand affordance (dashed outer ring) appears on the node perimeter
And the affordance is visible only on leaf nodes — not on nodes that have already been expanded

**AC2 — Expand request fires on affordance click**
Given I click the expand affordance ring
When the request fires
Then `GET /api/graph/[mbid]/expand` is called for that node's MBID only
And new nodes drift in from the expanded node's current position (not teleport from edges)
And existing nodes reposition via force simulation to accommodate new nodes

**AC3 — DataThinBadge when expansion is empty**
Given expansion finds no additional data for a node
When the API returns empty artists/edges
Then the amber data-thin dot appears on that node (same visual as isDataThin=true nodes)
And the node itself remains in the graph (not removed)
And the expand affordance ring is removed (marking the node as fully explored)

**AC4 — Per-node expansion only**
Given I expand node A and then node B
When I inspect the graph
Then expanding node A did not expand any other leaf nodes — expansion is strictly per-node

**AC5 — Expand route**
Given `GET /api/graph/[mbid]/expand` is called with a valid MBID
Then it returns `{ artists: Artist[], edges: InfluenceEdge[] }` for the +1 hop
And `export const revalidate = 3600`
And if the artist is not found or all sources fail, returns `{ artists: [], edges: [] }` (no error shape)

---

## Tasks / Subtasks

- [x] **Task 1 — Create expand API route**
  - [ ] Create directory `src/app/api/graph/[mbid]/expand/` and `route.ts`
  - [ ] `export const revalidate = 3600`
  - [ ] `GET` handler: await params, call `buildGraph(mbid, 1)`, return `NextResponse.json({ artists: data.artists, edges: data.edges })`
  - [ ] Wrap in try/catch: `ArtistNotFoundError` or `DataSourceError` → `NextResponse.json({ artists: [], edges: [] })` (never return an `{ error }` shape)
  - [ ] Next.js 16 params: `{ params }: { params: Promise<{ mbid: string }> }` — must `await params`

- [x] **Task 2 — Create `src/graph/expand.ts`**
  - [ ] Export `fetchExpandData(mbid: string): Promise<{ artists: Artist[], edges: InfluenceEdge[] }>`
  - [ ] Calls `fetch(/api/graph/${mbid}/expand)`, parses JSON, returns `{ artists, edges }`
  - [ ] On any fetch error: return `{ artists: [], edges: [] }` (never throw — graph is enhancement)
  - [ ] Import types from `@/lib/data/types`

- [x] **Task 3 — Add expand state + `expandGraphNode` to `simulation.ts`**
  - [ ] Add module-level: `let expandedMbids: Set<string> = new Set()`
  - [ ] Add module-level: `let currentGraphData: GraphData | null = null`
  - [ ] In `updateGraphData`: set `currentGraphData = graphData` and `expandedMbids = new Set()` (reset on pivot)
  - [ ] In `cleanupGraph`: set `currentGraphData = null` and `expandedMbids = new Set()`
  - [ ] Add module-level `let onExpandFn: (mbid: string) => void = () => {}`
  - [ ] Add `function wrappedExpand(mbid: string): void` that calls `void expandGraphNode(mbid)`
  - [ ] Export `async function expandGraphNode(mbid: string): Promise<void>`:
    - Guard: if `!sim || !zoomGroupSel || !currentGraphData` return
    - Guard: if `expandedMbids.has(mbid)` return (already expanded)
    - Mark as expanded immediately: `expandedMbids.add(mbid)` (prevents double-expansion)
    - Remove expand ring from node: `nodeGroupSel?.filter(d => d.mbid === mbid).select(".expand-ring").remove()`
    - Call `fetchExpandData(mbid)` from expand.ts
    - If empty result: add data-thin dot to expanded node (see Dev Notes), return
    - Filter new artists to avoid duplicates with existing: compare against `currentGraphData.artists` by mbid
    - Build `newGraphNodes: GraphNode[]` from new artists, inheriting `direction` from the expanded node's direction
    - Set initial position of each new node to the expanded node's current `x,y` (so they drift OUT from it)
    - Merge into `currentGraphData`: spread artists + newArtists, edges + newEdges
    - Update simulation: `sim.nodes([...sim.nodes(), ...newGraphNodes])`
    - Update force links: re-run `buildLinks(currentGraphData.edges)` and `(sim.force("link") as d3.ForceLink<...>).links(allLinks)`
    - Re-render via D3 join: `edgeLineSel = renderEdges(edgesContainer, allLinks)` and `nodeGroupSel = renderNodes(nodesContainer, sim.nodes(), cachedHop1Mbids, wrappedPivot, wrappedHover, wrappedExpand)`
    - Restart simulation: `sim.alpha(0.3).restart()`
    - `prefersReducedMotion()` branch: `sim.stop()` then `ticked()`
  - [ ] Pass `wrappedExpand` as 6th arg to `renderNodes()` in both `initializeGraph` and `updateGraphData`

- [x] **Task 4 — Update `nodes.ts` to add expand affordance**
  - [ ] Add `onExpand: (mbid: string) => void` as 6th parameter to `renderNodes()`
  - [ ] Add layer 6 to node anatomy — expand ring: `<circle class="expand-ring">` with `r = nodeRadius + 10`, dashed stroke, initially hidden (`opacity: 0`)
    - Only on non-focal nodes: use `.filter(d => d.direction !== "focal")` before appending
    - Stroke: `rgba(255,255,255,0.35)`, `stroke-dasharray: "4 3"`, `stroke-width: 1.5`, `fill: none`
    - `pointer-events: all` so it captures clicks independently of the main circle
    - Click handler: `on("click", (event, d) => { event.stopPropagation(); onExpand(d.mbid); })`
    - `pointer-events: none` on hover — wait, actually `all` so it IS clickable
  - [ ] Update `mouseenter` handler: show expand ring for non-focal, non-expanded nodes:
    ```typescript
    if (d.direction !== "focal" && !expandedMbids.has(d.mbid)) {
      d3.select(this).select(".expand-ring").attr("opacity", 1);
    }
    ```
    But `expandedMbids` is in simulation.ts — we need to pass it to nodes.ts or use a different approach (see Dev Notes)
  - [ ] Update `mouseleave` handler: hide expand ring `d3.select(this).select(".expand-ring").attr("opacity", 0)`
  - [ ] Update doc comment on `renderNodes` to include the new `onExpand` param

- [x] **Task 5 — Thread expand through `simulation.ts` renderNodes calls**
  - [ ] Both `initializeGraph` and `updateGraphData` must pass `wrappedExpand` as 6th arg
  - [ ] `initializeGraph` currently passes `wrappedPivot, wrappedHover` — add `wrappedExpand`
  - [ ] `updateGraphData` currently passes `wrappedPivot, wrappedHover` — add `wrappedExpand`

- [x] **Task 6 — Handle expanded state visibility in nodes.ts**
  - [ ] The expand ring should NOT appear for already-expanded nodes
  - [ ] Approach: pass `getExpandedMbids: () => Set<string>` as 7th param to `renderNodes`, or pass the Set directly as 7th param
  - [ ] In `mouseenter`, check `!expandedMbids.has(d.mbid)` before showing ring
  - [ ] When `expandGraphNode` marks a node as expanded, immediately hide its ring: `nodeGroupSel?.filter(d => d.mbid === expandedMbid).select(".expand-ring").attr("opacity", 0).attr("pointer-events", "none")`

- [x] **Task 7 — DataThinBadge helper in simulation.ts**
  - [ ] Add private function `addDataThinDot(mbid: string)` in simulation.ts:
    ```typescript
    function addDataThinDot(mbid: string): void {
      if (!nodeGroupSel) return;
      nodeGroupSel.filter(d => d.mbid === mbid).each(function(d) {
        const sel = d3.select(this);
        if (!sel.select(".data-thin-dot").empty()) return; // already has dot
        const isHop1 = cachedHop1Mbids.has(d.mbid);
        const r = d.direction === "focal" ? NODE_RADIUS_FOCAL : isHop1 ? NODE_RADIUS_HOP1 : NODE_RADIUS_HOP2;
        sel.append("circle")
          .attr("class", "data-thin-dot")
          .attr("r", 3)
          .attr("fill", "#F0B429")
          .attr("cy", -r)
          .attr("pointer-events", "none");
      });
    }
    ```
  - [ ] Call `addDataThinDot(mbid)` in `expandGraphNode` when empty result is returned

- [x] **Task 8 — Write tests**
  - [ ] Create `src/graph/expand.test.ts`:
    - Mock `fetch` (vi.stubGlobal)
    - Test: `fetchExpandData` returns artists/edges on OK response
    - Test: `fetchExpandData` returns empty on non-OK response
    - Test: `fetchExpandData` returns empty on fetch error (graceful degradation)
  - [ ] Run `npm run test:run` — all 171 existing + new tests pass

---

## Dev Notes

### Architecture: Expansion is Entirely D3-Side

**Key decision:** React never knows about expansions. `currentGraphData` is maintained in simulation.ts module state. When the user pivots (which calls `updateGraphData(newGraphData)` via GraphCanvas Effect 2), the simulation resets to the new focal artist's clean graph and `expandedMbids` is cleared.

**This is correct behavior:** Pivoting loads a fresh graph. Expansions within a session persist until pivot. React's prop-based graphData is only used for initial load and pivot resets — not for expansion tracking.

**GraphCanvas does NOT need new props for this story.** The expand affordance is a D3-internal behavior passed entirely through the `renderNodes` callback chain.

### Expand Ring Design

```
Node anatomy layers (updated):
  1. Glow halo     — <circle class="glow-halo"> filter=glow, opacity 0.26
  2. Main circle   — <circle class="main-circle"> genre fill
  3. Hover ring    — <circle class="hover-ring"> stroke +3px, opacity 0→1 on hover
  4. Data-thin dot — <circle class="data-thin-dot"> amber, top perimeter (conditional)
  5. Label text    — <text class="node-label">
  6. Expand ring   — <circle class="expand-ring"> dashed stroke +10px, opacity 0→1 on hover (non-focal, non-expanded only)
```

The expand ring is OUTSIDE the hover ring (+10px vs +3px), so:
- `r = nodeRadius(direction, isHop1) + 10`
- Click event on expand ring → `stopPropagation()` + `onExpand(mbid)` (does NOT pivot)
- Click event on main circle/hover ring → passes through to group → pivot
- `stroke-dasharray: "4 3"` gives the dashed affordance signal
- Color: `rgba(255,255,255,0.35)` — subtle but visible on hover

### Handling `expandedMbids` in nodes.ts

**Problem:** `expandedMbids` lives in simulation.ts but `mouseenter` handlers are set up in nodes.ts. We need nodes.ts to check if a node has been expanded before showing the affordance.

**Solution:** Pass `expandedMbids: Set<string>` as a 7th parameter to `renderNodes()`. simulation.ts passes `expandedMbids` (the module-level set) by reference. Since it's a reference to the same Set object that `expandGraphNode` mutates, the `mouseenter` handler will always see the current state.

```typescript
export function renderNodes(
  container: NodeContainer,
  nodes: GraphNode[],
  hop1Mbids: Set<string>,
  onPivot: (mbid: string) => void,
  onHover: (mbid: string | null) => void,
  onExpand: (mbid: string) => void,
  expandedMbids: Set<string>,        // ← NEW 7th param
): NodeSel
```

In `mouseenter`:
```typescript
.on("mouseenter", function (_event, d) {
  d3.select(this).select(".hover-ring").attr("opacity", 1);
  // Expand ring: only non-focal, non-expanded
  if (d.direction !== "focal" && !expandedMbids.has(d.mbid)) {
    d3.select(this).select(".expand-ring").attr("opacity", 1);
  }
  // Hover detail dwell timer...
})
```

In `mouseleave`:
```typescript
.on("mouseleave", function () {
  d3.select(this).select(".hover-ring").attr("opacity", 0);
  d3.select(this).select(".expand-ring").attr("opacity", 0);
  // clear hover timer...
})
```

### New Node Positioning on Expand

New nodes start at the expanded node's current position so they DRIFT outward from it during simulation:

```typescript
const expandedNodeInSim = sim.nodes().find(n => n.mbid === mbid);
const startX = expandedNodeInSim?.x ?? 0;
const startY = expandedNodeInSim?.y ?? 0;

const newGraphNodes = newArtistsFiltered.map(a => ({
  mbid: a.mbid,
  name: a.name,
  genres: a.genres,
  direction: expandedNodeDirection, // same direction as expanded node
  isDataThin: a.isDataThin,
  opacity: 1,
  x: startX + (Math.random() - 0.5) * 20, // tiny jitter to avoid stack
  y: startY + (Math.random() - 0.5) * 20,
}));
```

**Reduced motion:** No drift. Call `sim.stop()` then position new nodes at a spread-out location, then `ticked()`.

### Getting Expanded Node Direction

When merging new nodes, they inherit the direction of the expanded node:

```typescript
const expandedNodeInSim = sim.nodes().find(n => n.mbid === mbid);
const expandedNodeDirection = expandedNodeInSim?.direction ?? "upstream";
```

### buildLinks with Merged Data

After merging `currentGraphData.edges` with new edges, rebuild all links. The new edges come from the API and use string MBID references — same format as original edges. The existing `buildLinks()` function handles this:

```typescript
const allEdges = [...currentGraphData.edges, ...newEdges];
const allLinks = buildLinks(allEdges);
(sim.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(allLinks);
```

**Important:** After `sim.nodes(allNodes)`, the simulation resolves string source/target IDs in links to GraphNode object references via the `.id(d => d.mbid)` accessor. This works correctly for both existing and new nodes as long as the new nodes are in `allNodes` before the links are set.

### edgesContainer and nodesContainer in expandGraphNode

These need to be accessed from module-level state. Since `zoomGroupSel` is already module-level:

```typescript
const edgesContainer = zoomGroupSel!.select<SVGGElement>("g.edges");
const nodesContainer = zoomGroupSel!.select<SVGGElement>("g.nodes");
```

### Expand Ring Click Isolation

```typescript
entered
  .filter(d => d.direction !== "focal")
  .append("circle")
  .attr("class", "expand-ring")
  .attr("r", (d) => {
    const isHop1 = hop1Mbids.has(d.mbid);
    return nodeRadius(d.direction, isHop1) + 10;
  })
  .attr("fill", "none")
  .attr("stroke", "rgba(255,255,255,0.35)")
  .attr("stroke-width", 1.5)
  .attr("stroke-dasharray", "4 3")
  .attr("opacity", 0)
  .attr("pointer-events", "all")  // makes the ring clickable
  .attr("cursor", "pointer")
  .on("click", (event, d) => {
    event.stopPropagation(); // prevent pivot on parent group
    if (!expandedMbids.has(d.mbid)) onExpand(d.mbid);
  });
```

Note: `entered.filter(...)` returns a filtered selection. Only non-focal nodes get the expand ring. The `.attr("pointer-events", "all")` makes the ring's stroke area clickable even with `fill: none`.

### API Route — using buildGraph(mbid, 1)

The expand route reuses the existing `buildGraph` function with `depth=1`. This returns the expanded artist as `focalArtist` plus its direct connections. The client receives `artists` and `edges` and merges them.

```typescript
// src/app/api/graph/[mbid]/expand/route.ts
import { buildGraph } from "@/lib/data/graph-builder";
import { ArtistNotFoundError } from "@/lib/errors";

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  const { mbid } = await params;
  try {
    const data = await buildGraph(mbid, 1);
    return NextResponse.json({ artists: data.artists, edges: data.edges });
  } catch {
    // ArtistNotFoundError, DataSourceError, or any failure → empty expansion
    return NextResponse.json({ artists: [], edges: [] });
  }
}
```

### File Changes Summary

| File | Action | What changes |
|------|--------|-------------|
| `src/app/api/graph/[mbid]/expand/route.ts` | NEW | Expand API route, revalidate=3600 |
| `src/graph/expand.ts` | NEW | `fetchExpandData(mbid)` — fetch layer only |
| `src/graph/nodes.ts` | UPDATE | Add expand ring (layer 6), add `onExpand` + `expandedMbids` params |
| `src/graph/simulation.ts` | UPDATE | Add `expandedMbids`, `currentGraphData`, `expandGraphNode`, `wrappedExpand`, `addDataThinDot` |
| `src/graph/expand.test.ts` | NEW | Tests for fetchExpandData |

**GraphCanvas.tsx does NOT change** — expansion is entirely D3-internal.
**page.tsx and ArtistGraphView.tsx do NOT change** — GraphCanvas interface is unchanged.

### What NOT to Do

- **Do NOT** add an `onExpand` prop to GraphCanvas — expansion is D3-internal, React never sees it
- **Do NOT** update React's graphData state on expansion — D3's `currentGraphData` is the live truth during a session
- **Do NOT** throw errors from `fetchExpandData` — return empty arrays on any failure
- **Do NOT** pivot when the expand ring is clicked — `stopPropagation()` prevents the group click
- **Do NOT** try to expand already-expanded nodes — the `expandedMbids` guard prevents double-expansion
- **Do NOT** use `Math.random()` for jitter — wait, actually we CAN use Math.random() here since it's in D3 runtime code (not a workflow script). D3 uses it for jitter.
- **Do NOT** render `expand-ring` on the focal node — filtered by `d.direction !== "focal"`
- **Do NOT** add revalidate other than 3600 to the expand route

### Test Pattern Reminder

```typescript
// Correct:
const el = screen.queryByText("something");
expect(el).not.toBeNull();

// Wrong (jest-dom not installed):
expect(el).toBeInTheDocument();
```

Fetch mock pattern (inline per test, same as Story 2.2 pattern):
```typescript
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ artists: [...], edges: [...] }),
});
vi.stubGlobal("fetch", mockFetch);
```

---

## Dev Agent Record

### Implementation Plan
expand.ts handles network fetch only. simulation.ts owns all D3 state: expandedMbids Set + currentGraphData cache. expandGraphNode() fetches, deduplicates, merges data, updates sim.nodes() then forceLink.links() in correct order, re-renders via D3 join (existing → UPDATE stays, new → ENTER drifts from expanded node position). nodes.ts renderNodes signature extended to 7 params: +onExpand +expandedMbids. Expand ring is layer 6 in node anatomy, dashed, stopPropagation so pivot doesn't fire on ring click.

### Debug Log
No issues. TypeScript passed clean on first attempt. 176/176 tests pass.

### Completion Notes
- NEW: src/app/api/graph/[mbid]/expand/route.ts — revalidate=3600, calls buildGraph(mbid,1)
- NEW: src/graph/expand.ts — fetchExpandData(), returns empty on any failure
- NEW: src/graph/expand.test.ts — 5 tests covering OK/non-OK/error/URL/missing-fields
- UPDATED: src/graph/nodes.ts — layer 6 expand ring, onExpand + expandedMbids params, mouseenter/leave show/hide ring
- UPDATED: src/graph/simulation.ts — expandedMbids, currentGraphData, wrappedExpand, expandGraphNode(), addDataThinDot(), reset on updateGraphData/cleanupGraph, all renderNodes calls updated
- GraphCanvas.tsx, page.tsx, ArtistGraphView.tsx unchanged — expansion is D3-internal

---

## File List

- `src/app/api/graph/[mbid]/expand/route.ts` — NEW: expand API route
- `src/graph/expand.ts` — NEW: fetchExpandData fetch helper
- `src/graph/expand.test.ts` — NEW: 5 tests
- `src/graph/nodes.ts` — UPDATED: expand ring layer, onExpand + expandedMbids params
- `src/graph/simulation.ts` — UPDATED: expansion state, expandGraphNode, addDataThinDot

---

## Change Log

- Story 2.3 implemented: on-demand hop expansion — 2026-05-28
