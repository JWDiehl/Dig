/**
 * useArtistGraph — TanStack Query v5 hook for fetching influence graph data.
 *
 * Fetches from GET /api/graph/[mbid] and returns the full GraphData response.
 * Query does not execute when mbid is null or undefined (enabled: !!mbid).
 *
 * Usage:
 *   const { data, isPending, error } = useArtistGraph(focalArtistId)
 *   //                 ↑ isPending — NEVER isLoading (TanStack Query v5)
 *   const graphData = data?.data
 *   const warnings = data?.warnings ?? []
 */

import { useQuery } from "@tanstack/react-query";
import type { GraphData } from "@/lib/data/types";

// ─── Response type ────────────────────────────────────────────────────────────

interface GraphApiResponse {
  data: GraphData;
  warnings?: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useArtistGraph(mbid: string | null | undefined) {
  return useQuery<GraphApiResponse>({
    queryKey: ["graph", mbid],
    queryFn: async () => {
      const res = await fetch(`/api/graph/${mbid}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ??
            `Graph fetch failed: ${res.status}`,
        );
      }
      return res.json() as Promise<GraphApiResponse>;
    },
    enabled: !!mbid,
  });
}
