/**
 * pivot.ts — D3 visual transitions for the Dig pivot interaction.
 *
 * THIS MODULE IS PURELY D3 VISUALS — no pushState, no Zustand, no TanStack Query.
 * All URL and store side-effects belong in the parent React component (page.tsx).
 *
 * Exports:
 *   beginPivotVisuals(newFocalMbid, nodeGroups, hop1Mbids)
 *
 * Pivot phases:
 *   Phase 1 (this module): Runs immediately on node click, before API data arrives.
 *     Transitions the clicked node to focal visual state (White Rabbit fill, focal radius).
 *   Phase 2 (updateGraphData): When TanStack Query delivers new GraphData, the full
 *     D3 join runs — new nodes fade in, departed nodes fade out, simulation restarts.
 *
 * The gap between Phase 1 and Phase 2 is typically 200–800ms (API round-trip). During
 * this gap the clicked node looks focal but surrounding nodes haven't changed. This
 * intentional immediate feedback is what makes the pivot feel instant.
 */

import * as d3 from "d3";
import type { GraphNode } from "@/graph/types";
import { prefersReducedMotion } from "@/lib/motion";
import { PIVOT_DURATION_MS, NODE_RADIUS_FOCAL } from "@/graph/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const WHITE_RABBIT = "#F1F1F1"; // Focal artist fill (must match nodes.ts)

// ─── Selection type alias ─────────────────────────────────────────────────────

type NodeSel = d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Immediately update the clicked node's visual state to focal appearance.
 *
 * Called by simulation.ts's wrappedPivot BEFORE the React parent is notified.
 * This gives instant visual feedback while the API fetch is in flight.
 *
 * Transitions:
 *   - duration = 0 if prefersReducedMotion() is true (instant)
 *   - duration = PIVOT_DURATION_MS (~700ms) otherwise
 *
 * @param newFocalMbid  MBID of the clicked (soon-to-be focal) node
 * @param nodeGroups    Current D3 selection of all node <g> elements
 * @param hop1Mbids    Hop-1 MBID set — reserved for future multi-hop transitions
 */
export function beginPivotVisuals(
  newFocalMbid: string,
  nodeGroups: NodeSel,
  hop1Mbids: Set<string>,
): void {
  void hop1Mbids; // Reserved for future multi-hop transition support (Story 2.x)

  const duration = prefersReducedMotion() ? 0 : PIVOT_DURATION_MS;

  const clickedGroup = nodeGroups.filter((d) => d.mbid === newFocalMbid);
  if (clickedGroup.empty()) return;

  // Update aria-label immediately — no transition needed for semantic change
  clickedGroup.each(function (d) {
    d3.select(this).attr("aria-label", `${d.name}, focal influence`);
  });

  // Transition main circle → focal fill, focal radius, full opacity
  clickedGroup
    .select<SVGCircleElement>(".main-circle")
    .transition()
    .duration(duration)
    .attr("fill", WHITE_RABBIT)
    .attr("r", NODE_RADIUS_FOCAL)
    .attr("fill-opacity", 1);

  // Transition glow halo → focal size
  clickedGroup
    .select<SVGCircleElement>(".glow-halo")
    .transition()
    .duration(duration)
    .attr("fill", WHITE_RABBIT)
    .attr("r", NODE_RADIUS_FOCAL + 8);

  // Transition hover ring → focal size
  clickedGroup
    .select<SVGCircleElement>(".hover-ring")
    .transition()
    .duration(duration)
    .attr("stroke", WHITE_RABBIT)
    .attr("r", NODE_RADIUS_FOCAL + 3);

  // Transition label → focal typography (larger, bolder)
  clickedGroup
    .select<SVGTextElement>(".node-label")
    .transition()
    .duration(duration)
    .attr("font-size", "15px")
    .attr("font-weight", "600")
    .attr("dy", NODE_RADIUS_FOCAL + 14);
}
