/**
 * useArtistSearch — TanStack Query v5 hook for debounced artist search.
 *
 * Debounces the raw input query by SEARCH_DEBOUNCE_MS (300ms) before firing.
 * Empty/whitespace-only queries do not trigger a fetch (enabled: !!trimmed).
 *
 * The debounce approach: maintain a second state value (debouncedQuery) that
 * lags the raw input. The queryKey uses the debounced value so TanStack Query
 * only fires after the user pauses typing.
 *
 * Usage:
 *   const { data, isPending } = useArtistSearch(inputValue)
 *   const artists = data?.data ?? []
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SEARCH_DEBOUNCE_MS } from "@/graph/constants";
import type { Artist } from "@/lib/data/types";

// ─── Response type ────────────────────────────────────────────────────────────

interface SearchApiResponse {
  data: Artist[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useArtistSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery<SearchApiResponse>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `Search failed: ${res.status}`,
        );
      }
      return res.json() as Promise<SearchApiResponse>;
    },
    enabled: !!debouncedQuery.trim(),
  });
}
