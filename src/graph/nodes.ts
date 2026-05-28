/**
 * nodes.ts — D3 node rendering for the Dig graph canvas.
 *
 * Exports:
 *   genreColor(genres)            — maps genre tags → hex color
 *   nodeRadius(direction, isHop1) — returns correct radius constant
 *   renderNodes(container, nodes, hop1Mbids, onPivot) — D3 join, full anatomy
 *   updateNodePositions(sel)      — called each simulation tick
 *
 * Node anatomy (layers, inside-out per UX-DR6):
 *   1. Glow halo    — <circle> with filter="url(#glow)", low opacity
 *   2. Main circle  — <circle> with genre/focal fill, hop-level opacity
 *   3. Hover ring   — <circle> stroke only, visible on mouseenter
 *   4. Data-thin dot — <circle r="3"> amber, top perimeter (isDataThin only)
 *   5. Label text   — <text> below circle, Geist-weight by hop level
 *
 * RULE: All radius/opacity constants come from @/graph/constants — never hardcoded.
 */

import * as d3 from "d3";
import type { GraphNode } from "@/graph/types";
import { prefersReducedMotion } from "@/lib/motion";
import {
  NODE_RADIUS_FOCAL,
  NODE_RADIUS_HOP1,
  NODE_RADIUS_HOP2,
  PIVOT_DURATION_MS,
} from "@/graph/constants";

// ─── Selection type aliases ───────────────────────────────────────────────────

type NodeContainer = d3.Selection<SVGGElement, unknown, null, undefined>;
type NodeSel = d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;

// ─── Genre color mapping ──────────────────────────────────────────────────────

/** Colour palette (from tailwind.config.ts and UX spec). */
const HONEY_BEE = "#F0B429";    // Jazz / blues / soul / folk / world / reggae
const KILLER_QUEEN = "#FF4F1F"; // Rock / punk / funk / metal
const PURPLE_HAZE = "#A855F7";  // Electronic / ambient / experimental / synth
const MR_BLUE_SKY = "#22D3EE";  // Hip-hop / R&B / rap
const TUSK = "#94A3B8";         // Classical / uncategorized fallback
const WHITE_RABBIT = "#F1F1F1"; // Focal artist — always overrides genre

/**
 * Map an artist's genre array to the appropriate genre-family hex colour.
 * Uses a priority-ordered regex check against lowercase genre strings.
 * Falls back to TUSK (warm gray) for unknown/uncategorized genres.
 */
export function genreColor(genres: string[]): string {
  if (genres.length === 0) return TUSK;

  const g = genres.map((s) => s.toLowerCase());

  // Hip-hop / R&B checked before jazz to avoid "r&b" matching jazz pattern
  if (g.some((s) => /hip.hop|hip hop|rap/.test(s))) return MR_BLUE_SKY;
  if (g.some((s) => /r&b|rnb|rhythm.and.blues/.test(s))) return MR_BLUE_SKY;
  if (g.some((s) => /jazz|blues|soul/.test(s))) return HONEY_BEE;
  if (g.some((s) => /rock|punk|funk|metal|grunge|indie/.test(s))) return KILLER_QUEEN;
  if (g.some((s) => /electronic|ambient|experimental|synth|techno|house|edm/.test(s)))
    return PURPLE_HAZE;
  if (g.some((s) => /folk|world|reggae|afrobeats|country|bluegrass/.test(s)))
    return HONEY_BEE;

  return TUSK;
}

// ─── Node radius ──────────────────────────────────────────────────────────────

/**
 * Return the correct node radius constant based on direction and hop level.
 *   focal  → NODE_RADIUS_FOCAL (24)
 *   hop-1  → NODE_RADIUS_HOP1 (16)
 *   hop-2+ → NODE_RADIUS_HOP2 (11)
 */
export function nodeRadius(
  direction: "focal" | "upstream" | "downstream",
  isHop1: boolean,
): number {
  if (direction === "focal") return NODE_RADIUS_FOCAL;
  return isHop1 ? NODE_RADIUS_HOP1 : NODE_RADIUS_HOP2;
}

// ─── Fill opacity by hop level ────────────────────────────────────────────────

function fillOpacity(direction: "focal" | "upstream" | "downstream", isHop1: boolean): number {
  if (direction === "focal") return 1;
  return isHop1 ? 0.72 : 0.5;
}

// ─── renderNodes ─────────────────────────────────────────────────────────────

/**
 * D3 general join for node groups.
 * Appends/updates/removes <g class="node"> elements inside the nodes container.
 *
 * Each group:
 *   - role="button" + aria-label for accessibility
 *   - click → onPivot(mbid)
 *   - mouseenter/mouseleave → hover ring visibility
 */
export function renderNodes(
  container: NodeContainer,
  nodes: GraphNode[],
  hop1Mbids: Set<string>,
  onPivot: (mbid: string) => void,
): NodeSel {
  const sel = (container as unknown as d3.Selection<SVGGElement, unknown, null, undefined>)
    .selectAll<SVGGElement, GraphNode>("g.node")
    .data(nodes, (d) => d.mbid);

  // EXIT — fade out and remove departed nodes
  if (prefersReducedMotion()) {
    sel.exit().remove();
  } else {
    sel
      .exit()
      .transition()
      .duration(PIVOT_DURATION_MS)
      .attr("opacity", 0)
      .remove();
  }

  // ENTER — create new node groups at opacity 0; faded in below
  const entered = sel
    .enter()
    .append<SVGGElement>("g")
    .attr("class", "node")
    .attr("role", "button")
    .attr("aria-label", (d) => `${d.name}, ${d.direction} influence`)
    .attr("opacity", 0) // Start invisible; fade-in transition applied after anatomy
    .style("cursor", (d) => (d.direction === "focal" ? "default" : "pointer"))
    .on("click", (_event, d) => {
      if (d.direction === "focal") return; // Focal node is not clickable
      onPivot(d.mbid);
    })
    .on("mouseenter", function () {
      d3.select<SVGGElement, GraphNode>(this).select<SVGCircleElement>(".hover-ring").attr("opacity", 1);
    })
    .on("mouseleave", function () {
      d3.select<SVGGElement, GraphNode>(this).select<SVGCircleElement>(".hover-ring").attr("opacity", 0);
    });

  // 1. Glow halo
  entered
    .append<SVGCircleElement>("circle")
    .attr("class", "glow-halo")
    .attr("r", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return nodeRadius(d.direction, isHop1) + 8;
    })
    .attr("fill", (d) =>
      d.direction === "focal" ? WHITE_RABBIT : genreColor(d.genres),
    )
    .attr("fill-opacity", 0.26)
    .attr("filter", "url(#glow)")
    .attr("pointer-events", "none");

  // 2. Main circle
  entered
    .append<SVGCircleElement>("circle")
    .attr("class", "main-circle")
    .attr("r", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return nodeRadius(d.direction, isHop1);
    })
    .attr("fill", (d) =>
      d.direction === "focal" ? WHITE_RABBIT : genreColor(d.genres),
    )
    .attr("fill-opacity", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return fillOpacity(d.direction, isHop1);
    })
    .attr("stroke", "none");

  // 3. Hover ring (initially hidden)
  entered
    .append<SVGCircleElement>("circle")
    .attr("class", "hover-ring")
    .attr("r", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return nodeRadius(d.direction, isHop1) + 3;
    })
    .attr("fill", "none")
    .attr("stroke", (d) =>
      d.direction === "focal" ? WHITE_RABBIT : genreColor(d.genres),
    )
    .attr("stroke-width", 1.5)
    .attr("opacity", 0)
    .attr("pointer-events", "none");

  // 4. Data-thin dot (only for isDataThin === true)
  entered
    .filter((d) => d.isDataThin)
    .append<SVGCircleElement>("circle")
    .attr("class", "data-thin-dot")
    .attr("r", 3)
    .attr("fill", "#F0B429")
    .attr("cy", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return -(nodeRadius(d.direction, isHop1)); // top of perimeter
    })
    .attr("pointer-events", "none");

  // 5. Label text
  entered
    .append<SVGTextElement>("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "auto")
    .attr("dy", (d) => {
      const isHop1 = hop1Mbids.has(d.mbid);
      return nodeRadius(d.direction, isHop1) + 22;
    })
    .attr("fill", WHITE_RABBIT)
    .attr("font-size", (d) => (d.direction === "focal" ? "15px" : "13px"))
    .attr("font-weight", (d) => (d.direction === "focal" ? "600" : "500"))
    .attr("pointer-events", "none")
    .text((d) => d.name);

  // Fade in newly entered node groups
  if (prefersReducedMotion()) {
    entered.attr("opacity", 1);
  } else {
    entered.transition().duration(PIVOT_DURATION_MS).attr("opacity", 1);
  }

  // MERGE — apply to both entered and updated groups
  const merged = entered.merge(sel as unknown as typeof entered);
  return merged;
}

// ─── updateNodePositions ──────────────────────────────────────────────────────

/**
 * Called on each simulation tick. Translates node groups to their current x/y.
 * D3 mutates node.x and node.y in place during the simulation.
 */
export function updateNodePositions(nodeGroups: NodeSel): void {
  nodeGroups.attr(
    "transform",
    (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
  );
}
