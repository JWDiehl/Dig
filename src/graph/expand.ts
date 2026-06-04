/**
 * expand.ts — network fetch layer for on-demand hop expansion (Story 2.3).
 *
 * Fetches the +1 hop influence data for a given artist MBID from
 * GET /api/graph/[mbid]/expand and returns the raw artists and edges.
 *
 * This module is purely a fetch helper. All D3 simulation updates
 * (node merging, simulation restart, DataThinBadge) are handled by
 * simulation.ts which calls expandGraphNode().
 *
 * All failures return empty arrays — expansion is an enhancement, never
 * a hard dependency. The caller treats empty arrays as "no new data."
 */

import type { Artist, InfluenceEdge } from "@/lib/data/types";

export interface ExpandData {
  artists: Artist[];
  edges: InfluenceEdge[];
}

/**
 * Fetch the +1 hop influence connections for the given MBID.
 * Returns empty arrays on any network failure or non-OK response.
 */
export async function fetchExpandData(mbid: string): Promise<ExpandData> {
  try {
    const res = await fetch(`/api/graph/${mbid}/expand`);
    if (!res.ok) return { artists: [], edges: [] };
    const json = (await res.json()) as ExpandData;
    return {
      artists: json.artists ?? [],
      edges: json.edges ?? [],
    };
  } catch {
    return { artists: [], edges: [] };
  }
}
