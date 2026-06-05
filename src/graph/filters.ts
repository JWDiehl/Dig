/**
 * filters.ts — D3 filter state applicator for the Dig graph canvas.
 *
 * Implements era and genre dimming via D3 selection opacity.
 * Nodes outside the active filter set are dimmed to NODE_OPACITY_DIMMED (12%),
 * never hidden. The dimming is applied imperatively by D3 — zero React re-renders.
 *
 * Architecture:
 *   Filter changes flow: Zustand → <GraphCanvas> prop → applyFilters() (here).
 *   They NEVER trigger a React re-render of the graph SVG.
 *
 * Also exports GENRE_FAMILIES and getGenreFamily for FilterPanel chip derivation.
 */

import * as d3 from "d3";
import type { GraphNode } from "@/graph/types";
import { NODE_OPACITY_DIMMED } from "@/graph/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Active filter state passed from GraphCanvas props. */
export interface FilterState {
  eras: string[];
  genres: string[];
}

// ─── Genre family mapping ─────────────────────────────────────────────────────

/**
 * Maps genre family keys (stored in Zustand filterGenres) to user-visible labels.
 * Keys match the D3 color families in nodes.ts — same classification logic.
 * Used by FilterPanel to render genre chip options.
 */
export const GENRE_FAMILIES: Record<string, string> = {
  "jazz":       "Jazz · Blues · Soul",
  "rock":       "Rock · Punk · Metal",
  "electronic": "Electronic · Ambient",
  "hip-hop":    "Hip-Hop · R&B",
  "classical":  "Classical · Other",
};

/**
 * Map a genre tags array to its genre family key.
 * Uses the same priority-ordered regex logic as genreColor() in nodes.ts.
 * Returns null for empty arrays (no data → not filtered out).
 */
export function getGenreFamily(genres: string[]): string | null {
  if (genres.length === 0) return null;
  const g = genres.map((s) => s.toLowerCase());
  if (g.some((s) => /hip.hop|hip hop|rap/.test(s))) return "hip-hop";
  if (g.some((s) => /r&b|rnb|rhythm.and.blues/.test(s))) return "hip-hop";
  if (g.some((s) => /jazz|blues|soul/.test(s))) return "jazz";
  if (g.some((s) => /rock|punk|funk|metal|grunge|indie/.test(s))) return "rock";
  if (g.some((s) => /electronic|ambient|experimental|synth|techno|house|edm/.test(s))) return "electronic";
  if (g.some((s) => /folk|world|reggae|afrobeats|country|bluegrass/.test(s))) return "jazz";
  return "classical";
}

// ─── applyFilters ─────────────────────────────────────────────────────────────

/**
 * Apply era and genre filters to the rendered graph nodes.
 *
 * Uses d3.selectAll("g.node") to access all rendered nodes in the live SVG.
 * This is correct for Dig since there is exactly one graph SVG at a time.
 *
 * Rules:
 * - No active filters → all nodes at full opacity
 * - Focal artist → always full opacity (never dimmed)
 * - Node with null era → visible when era filter is active (no data = not excluded)
 * - Node with empty genres → visible when genre filter is active (no data = not excluded)
 * - Era + Genre: AND logic across dimensions, OR logic within each dimension
 */
export function applyFilters({ eras, genres }: FilterState): void {
  const noFilters = eras.length === 0 && genres.length === 0;

  d3.selectAll<SVGGElement, GraphNode>("g.node").attr("opacity", (d) => {
    // No active filters or focal node → always visible
    if (noFilters || d.direction === "focal") return 1;

    // Era check: no era data → always passes; else must match an active era
    const eraOk = eras.length === 0 || d.era === null || eras.includes(d.era);

    // Genre check: no genre data → always passes; else family must match an active genre
    const family = getGenreFamily(d.genres);
    const genreOk = genres.length === 0 || family === null || genres.includes(family);

    return eraOk && genreOk ? 1 : NODE_OPACITY_DIMMED;
  });
}
