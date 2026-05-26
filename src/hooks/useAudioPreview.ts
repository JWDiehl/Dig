/**
 * useAudioPreview — TanStack Query v5 hook for fetching Spotify preview URLs.
 *
 * Fetches from GET /api/preview/[mbid] and returns the previewUrl (or null).
 * Query does not execute when mbid is null or undefined (enabled: !!mbid).
 *
 * Note: The /api/preview/[mbid] route is implemented in Story 2.2.
 * This hook is created here because it belongs to the same data-fetching
 * layer and follows the same pattern as the other hooks.
 *
 * Usage:
 *   const { data, isPending } = useAudioPreview(mbid)
 *   const previewUrl = data?.data.previewUrl ?? null
 *   // previewUrl: string | null — null means no preview available
 */

import { useQuery } from "@tanstack/react-query";

// ─── Response type ────────────────────────────────────────────────────────────

interface PreviewApiResponse {
  data: { previewUrl: string | null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudioPreview(mbid: string | null | undefined) {
  return useQuery<PreviewApiResponse>({
    queryKey: ["preview", mbid],
    queryFn: async () => {
      const res = await fetch(`/api/preview/${mbid}`);
      if (!res.ok) {
        throw new Error(`Preview fetch failed: ${res.status}`);
      }
      return res.json() as Promise<PreviewApiResponse>;
    },
    enabled: !!mbid,
  });
}
