/**
 * filters.ts — D3 filter state applicator for the Dig graph canvas.
 *
 * STUB — full implementation in Story 2.4.
 *
 * Story 2.4 will implement era and genre dimming via D3 selection opacity.
 * Nodes outside the active filter set are dimmed to NODE_OPACITY_DIMMED (12%),
 * never hidden. The dimming is applied imperatively by D3 — zero React re-renders.
 *
 * Architecture note:
 *   Filter changes flow: Zustand → <GraphCanvas> prop → applyFilters() (here).
 *   They NEVER trigger a React re-render of the graph SVG.
 */

/** Active filter state passed from GraphCanvas props. */
export interface FilterState {
  eras: string[];
  genres: string[];
}

/**
 * Apply era and genre filters to the rendered graph nodes.
 *
 * No-op stub for Story 1.9. Story 2.4 implements the full D3 selection dimming.
 */
export function applyFilters(filterState: FilterState): void {
  void filterState; // No-op stub — implemented in Story 2.4
}
