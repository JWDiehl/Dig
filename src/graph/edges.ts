/**
 * edges.ts — D3 edge rendering for the Dig graph canvas.
 *
 * Renders influence edges as SVG <line> elements.
 * All edges use Tusk color (#94A3B8) at EDGE_OPACITY_DEFAULT (13%) opacity.
 * The `confidence` field is preserved for future visual differentiation.
 *
 * Exports:
 *   renderEdges(container, links)      — D3 join; returns edge selection
 *   updateEdgePositions(edgeLines)     — called each simulation tick
 */

import * as d3 from "d3";
import type { GraphNode, GraphLink } from "@/graph/types";
import { EDGE_OPACITY_DEFAULT } from "@/graph/constants";

// ─── Selection type alias ─────────────────────────────────────────────────────

type EdgeContainer = d3.Selection<SVGGElement, unknown, null, undefined>;
type EdgeSel = d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown>;

// ─── Tusk color (edge default) ────────────────────────────────────────────────

const TUSK = "#94A3B8";

// ─── renderEdges ──────────────────────────────────────────────────────────────

/**
 * D3 general join for edge lines.
 * Appends/updates/removes <line class="edge"> elements in the edges container.
 *
 * Edges are rendered in the <g class="edges"> group which sits below the nodes
 * group — nodes always appear on top.
 */
export function renderEdges(container: EdgeContainer, links: GraphLink[]): EdgeSel {
  const sel = (container as unknown as d3.Selection<SVGGElement, unknown, null, undefined>)
    .selectAll<SVGLineElement, GraphLink>("line.edge")
    .data(links, (d) => {
      const src = typeof d.source === "object" ? (d.source as GraphNode).mbid : String(d.source);
      const tgt = typeof d.target === "object" ? (d.target as GraphNode).mbid : String(d.target);
      return `${src}→${tgt}`;
    });

  // EXIT — remove stale edges
  sel.exit().remove();

  // ENTER — create new edge lines
  const entered = sel
    .enter()
    .append<SVGLineElement>("line")
    .attr("class", "edge")
    .attr("stroke", TUSK)
    .attr("stroke-opacity", EDGE_OPACITY_DEFAULT)
    .attr("stroke-width", 1)
    .attr("pointer-events", "none");

  return entered.merge(sel as unknown as typeof entered);
}

// ─── updateEdgePositions ──────────────────────────────────────────────────────

/**
 * Called on each simulation tick. Updates line coordinates from D3 node positions.
 * D3 resolves source/target strings to GraphNode objects during simulation setup,
 * so we cast and read .x/.y from the resolved node objects.
 */
export function updateEdgePositions(edgeLines: EdgeSel): void {
  edgeLines
    .attr("x1", (d) => {
      const src = d.source as GraphNode;
      return src.x ?? 0;
    })
    .attr("y1", (d) => {
      const src = d.source as GraphNode;
      return src.y ?? 0;
    })
    .attr("x2", (d) => {
      const tgt = d.target as GraphNode;
      return tgt.x ?? 0;
    })
    .attr("y2", (d) => {
      const tgt = d.target as GraphNode;
      return tgt.y ?? 0;
    });
}
