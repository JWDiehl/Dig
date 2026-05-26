/**
 * D3 simulation type extensions for the Dig graph engine.
 *
 * These types extend D3's simulation datum interfaces so TypeScript
 * can type D3 selections and forces correctly throughout the graph engine.
 *
 * Import path: "@/graph/types"
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";

/**
 * A node in the D3 force simulation.
 *
 * Extends `SimulationNodeDatum` so D3's force simulation can mutate
 * `x`, `y`, `vx`, `vy` directly during each tick. React never reads
 * these mutable coordinates — D3 owns the SVG DOM after mount.
 *
 * `direction` categorises the node's position in the graph:
 * - `'focal'`      → the central artist (always one per graph)
 * - `'upstream'`   → influences the focal artist (rendered left)
 * - `'downstream'` → influenced by the focal artist (rendered right)
 *
 * `opacity` is mutated directly by D3's `applyFilters()` function
 * when era/genre filters are active. Default: 1. Dimmed: NODE_OPACITY_DIMMED.
 */
export interface GraphNode extends SimulationNodeDatum {
  /** MusicBrainz canonical identifier. */
  mbid: string;

  /** Display name for the node label. */
  name: string;

  /** Genre tags — used to determine genre-family color and filter matching. */
  genres: string[];

  /** Node's role in the graph layout. */
  direction: "focal" | "upstream" | "downstream";

  /** True when fewer than DATA_THIN_THRESHOLD relationships exist for this artist. */
  isDataThin: boolean;

  /**
   * Current rendering opacity (0–1).
   * Mutated imperatively by D3 `applyFilters()` — never stored in React state.
   */
  opacity: number;
}

/**
 * An edge (link) in the D3 force simulation.
 *
 * Extends `SimulationLinkDatum<GraphNode>` so D3 can resolve `source`
 * and `target` to `GraphNode` references during simulation setup.
 *
 * `confidence` is used by `edges.ts` to vary visual weight if needed
 * (currently all edges render at EDGE_OPACITY_DEFAULT; confidence is
 * available for future visual differentiation).
 */
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  /** Data-source quality of this influence relationship. */
  confidence: "high" | "medium" | "low";
}