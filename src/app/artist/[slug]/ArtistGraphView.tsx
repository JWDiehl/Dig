"use client";

/**
 * ArtistGraphView — client component for the /artist/[slug] route (Story 1.12 / 2.4).
 *
 * Receives a resolved MBID from the Server Component (page.tsx).
 *
 * Responsibilities:
 *   - Sync Zustand focalArtistId to the current mbid on mount/change
 *   - Fetch the influence graph via useArtistGraph
 *   - Render TopNav + FilterPanel + GraphCanvas
 *   - Handle search selection and node pivot via router.push (client navigation)
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { useDigStore } from "@/store";
import { GenreLegend } from "@/components/graph/GenreLegend";
import { NodeDetailPanel } from "@/components/graph/NodeDetailPanel";
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
  const filterEras = useDigStore((state) => state.filterEras);
  const filterGenres = useDigStore((state) => state.filterGenres);
  const setFilters = useDigStore((state) => state.setFilters);

  const { data, isPending, error } = useArtistGraph(mbid);
  const graphData = data?.data ?? null;

  const [hoveredMbid, setHoveredMbid] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const isFilterActive = filterEras.length > 0 || filterGenres.length > 0;

  const hoveredArtist = graphData?.artists.find((a) => a.mbid === hoveredMbid) ?? null;
  const handleHover = useCallback((id: string | null) => setHoveredMbid(id), []);

  // Sync Zustand so any hooks reading focalArtistId see the current artist
  useEffect(() => {
    setFocalArtist(mbid);
  }, [mbid, setFocalArtist]);

  const handleArtistSelect = useCallback(
    (artist: Artist) => {
      setHoveredMbid(null);
      router.push(`/artist/${artist.slug}`);
    },
    [router],
  );

  const handlePivot = useCallback(
    (pivotMbid: string) => {
      setHoveredMbid(null);
      const artist = graphData?.artists.find((a) => a.mbid === pivotMbid);
      if (artist?.slug) {
        router.push(`/artist/${artist.slug}`);
      }
    },
    [graphData, router],
  );

  const navProps = {
    onArtistSelect: handleArtistSelect,
    onFilterToggle: () => setIsFilterPanelOpen((p) => !p),
    isFilterPanelOpen,
    isFilterActive,
  };

  if (isPending) {
    return (
      <>
        <TopNav {...navProps} />
        <div className="flex h-full items-center justify-center text-[#555555]">
          Loading…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopNav {...navProps} />
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
      <TopNav {...navProps} />
      <FilterPanel
        graphData={graphData}
        filterEras={filterEras}
        filterGenres={filterGenres}
        onFiltersChange={setFilters}
        isOpen={isFilterPanelOpen}
      />
      <GraphCanvas
        graphData={graphData}
        filterEras={filterEras}
        filterGenres={filterGenres}
        onPivot={handlePivot}
        onHover={handleHover}
        focalArtistName={graphData?.focalArtist.name ?? ""}
        upstreamCount={graphData ? countByDirection(graphData, "upstream") : 0}
        downstreamCount={graphData ? countByDirection(graphData, "downstream") : 0}
      />
      <GenreLegend />
      {hoveredArtist && (
        <NodeDetailPanel
          artist={hoveredArtist}
          onClose={() => setHoveredMbid(null)}
        />
      )}
    </GraphErrorBoundary>
  );
}
