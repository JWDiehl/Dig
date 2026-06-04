/**
 * useAudioPreview — TanStack Query v5 hook for fetching a Spotify preview URL.
 *
 * Fires GET /api/preview/[mbid]?name={artistName} when both mbid and artistName
 * are non-empty (e.g., when NodeDetailPanel opens on hover).
 *
 * staleTime: 0   — preview URLs are ephemeral; always refetch on mount.
 * retry: false   — audio is enhancement; one attempt is enough.
 *
 * Returns { previewUrl: string | null, isPending: boolean }.
 * On any fetch failure, previewUrl is null (graceful degradation, no throw).
 *
 * Story 2.2 wires this into NodeDetailPanel → AudioPreviewControl.
 */

import { useQuery } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewData {
  previewUrl: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudioPreview(mbid: string, artistName: string) {
  const enabled = !!mbid && !!artistName;

  const { data, isPending } = useQuery<PreviewData>({
    queryKey: ["preview", mbid],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/preview/${mbid}?name=${encodeURIComponent(artistName)}`,
        );
        if (!res.ok) return { previewUrl: null };
        const json = (await res.json()) as { data: PreviewData };
        return json.data;
      } catch {
        return { previewUrl: null }; // never throw — audio is enhancement
      }
    },
    enabled,
    staleTime: 0,
    retry: false,
  });

  return {
    previewUrl: data?.previewUrl ?? null,
    isPending: enabled && isPending,
  };
}
