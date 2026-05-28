"use client";

/**
 * ArtistGraphView — client component for the /artist/[slug] route (Story 1.12).
 *
 * Receives a resolved MBID from the Server Component (page.tsx).
 *
 * Responsibilities:
 *   - Sync Zustand focalArtistId to the current mbid on mount/change
 *   - Fetch the influence graph via useArtistGraph
 *   - Render TopNav + GraphCanvas (same structure as the landing page)
 *   - Handle search selection and node pivot via router.push (client navigation)
 *
 * Navigation note: both handleArtistSelect and handlePivot use router.push()
 * rather than window.history.pushState(). This triggers the Server Component
 * for the new route, which calls resolveSlug again with the new slug.
 * setFocalArtist is NOT called in these handlers — the newly mounted
 * ArtistGraphView will call it via useEffect when it mounts.
 */

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { useDigStore } from "@/store";
import { GenreLegend } from "@/components/graph/GenreLegend";
import type { Artist, GraphData } from "@/lib/data/types";

function countByDirection(graphData: GraphData, dir: "upstream" | "downstream") {
  return graphData.edges.filter((e) => e.direction === dir).length;
}

interface ArtistGraphViewProps {
  /** Resolved MusicBrainz MBID from the Server Component. Always a non-null string. */
  mbid: string;
}

export function ArtistGraphView({ mbid }: ArtistGraphViewProps) {
  const router = useRouter();
  const setFocalArtist = useDigStore((state) => state.setFocalArtist);
  const { data, isPending, error } = useArtistGraph(mbid);
  const graphData = data?.data ?? null;

  // Sync Zustand so any hooks reading focalArtistId see the current artist
  useEffect(() => {
    setFocalArtist(mbid);
  }, [mbid, setFocalArtist]);

  // Search selection: navigate to the selected artist's route.
  // The destination ArtistGraphView will call setFocalArtist via useEffect.
  const handleArtistSelect = useCallback(
    (artist: Artist) => {
      router.push(`/artist/${artist.slug}`);
    },
    [router],
  );

  // Node pivot: derive slug from current graphData, then navigate.
  // Same ownership rule: do NOT call setFocalArtist here.
  const handlePivot = useCallback(
    (pivotMbid: string) => {
      const artist = graphData?.artists.find((a) => a.mbid === pivotMbid);
      if (artist?.slug) {
        router.push(`/artist/${artist.slug}`);
      }
    },
    [graphData, router],
  );

  if (isPending) {
    return (
      <>
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full items-center justify-center text-[#555555]">
          Loading…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full items-center justify-center text-[#555555]">
          Error: {error.message}
        </div>
      </>
    );
  }

  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex h-full items-center justify-center text-[#555555]">
          Graph engine error — check the console.
        </div>
      }
    >
      <TopNav onArtistSelect={handleArtistSelect} />
      <GraphCanvas
        graphData={graphData}
        filterEras={[]}
        filterGenres={[]}
        onPivot={handlePivot}
        focalArtistName={graphData?.focalArtist.name ?? ""}
        upstreamCount={graphData ? countByDirection(graphData, "upstream") : 0}
        downstreamCount={graphData ? countByDirection(graphData, "downstream") : 0}
      />
      <GenreLegend />
    </GraphErrorBoundary>
  );
}
