"use client";

/**
 * Landing page — Story 1.12 / Story 2.4 (filters wired).
 *
 * On initial load (focalArtistId === null):
 *   - Shows the Beatles graph from static public/data/beatles.json
 *   - No API call, no loading state — renders immediately
 *   - Displays "Follow the thread." subtitle beneath the search bar
 *
 * After search or pivot (focalArtistId set):
 *   - Switches to live data via useArtistGraph
 *   - Subtitle disappears; normal loading/error states apply
 */

import { useCallback, useEffect, useState } from "react";
import beatlesDataRaw from "@/../public/data/beatles.json";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { useDigStore } from "@/store";
import { GenreLegend } from "@/components/graph/GenreLegend";
import { NodeDetailPanel } from "@/components/graph/NodeDetailPanel";
import type { Artist, GraphData } from "@/lib/data/types";

// Static landing data — imported at build time, no API call
const beatlesData = beatlesDataRaw as GraphData;

// MBID kept for initial history.replaceState call; no longer used as API argument
const BEATLES_MBID = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";

function countByDirection(graphData: GraphData, dir: "upstream" | "downstream") {
  return graphData.edges.filter((e) => e.direction === dir).length;
}

function GraphView() {
  const setFocalArtist = useDigStore((state) => state.setFocalArtist);
  const focalArtistId = useDigStore((state) => state.focalArtistId);
  const filterEras = useDigStore((state) => state.filterEras);
  const filterGenres = useDigStore((state) => state.filterGenres);
  const setFilters = useDigStore((state) => state.setFilters);

  const [hoveredMbid, setHoveredMbid] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const isFilterActive = filterEras.length > 0 || filterGenres.length > 0;

  // Query is disabled when focalArtistId is null (enabled: !!mbid in the hook).
  // On landing, no API call fires — beatlesData serves as the graph immediately.
  const { data, isPending, error } = useArtistGraph(focalArtistId);

  // Static on landing; live data after any pivot or search
  const graphData: GraphData | null = focalArtistId
    ? (data?.data ?? null)
    : beatlesData;

  const hoveredArtist = graphData?.artists.find((a) => a.mbid === hoveredMbid) ?? null;

  const handleHover = useCallback((mbid: string | null) => setHoveredMbid(mbid), []);

  // Replace the initial history entry so the Back button works from the first pivot
  useEffect(() => {
    window.history.replaceState({ focalMbid: BEATLES_MBID }, "");
  }, []);

  // Search selection handler — called by TopNav when user picks a result.
  const handleArtistSelect = useCallback(
    (artist: Artist) => {
      setHoveredMbid(null);
      setFocalArtist(artist.mbid);
      window.history.pushState(
        { focalMbid: artist.mbid },
        "",
        artist.slug ? `/artist/${artist.slug}` : "",
      );
    },
    [setFocalArtist],
  );

  // Pivot handler — fired by D3 node click via GraphCanvas.onPivot.
  const handlePivot = useCallback(
    (mbid: string) => {
      setHoveredMbid(null);
      setFocalArtist(mbid);
      const artist = graphData?.artists.find((a) => a.mbid === mbid);
      window.history.pushState(
        { focalMbid: mbid },
        "",
        artist?.slug ? `/artist/${artist.slug}` : "",
      );
    },
    [graphData, setFocalArtist],
  );

  // Loading/error states only apply when a live query is in flight (post-pivot/search)
  if (focalArtistId && isPending) {
    return (
      <>
        <TopNav
          onArtistSelect={handleArtistSelect}
          onFilterToggle={() => setIsFilterPanelOpen((p) => !p)}
          isFilterPanelOpen={isFilterPanelOpen}
          isFilterActive={isFilterActive}
        />
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[#F1F1F1] animate-pulse select-none">
            DIG
          </span>
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#333333] select-none">
            Building graph…
          </span>
        </div>
      </>
    );
  }

  if (focalArtistId && error) {
    return (
      <>
        <TopNav
          onArtistSelect={handleArtistSelect}
          onFilterToggle={() => setIsFilterPanelOpen((p) => !p)}
          isFilterPanelOpen={isFilterPanelOpen}
          isFilterActive={isFilterActive}
        />
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <span className="text-[13px] text-[#555555]">
            Could not load artist graph.
          </span>
          <span className="text-[11px] tracking-[0.08em] text-[#333333]">
            {error.message}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav
        onArtistSelect={handleArtistSelect}
        onFilterToggle={() => setIsFilterPanelOpen((p) => !p)}
        isFilterPanelOpen={isFilterPanelOpen}
        isFilterActive={isFilterActive}
      />
      <FilterPanel
        graphData={graphData}
        filterEras={filterEras}
        filterGenres={filterGenres}
        onFiltersChange={setFilters}
        isOpen={isFilterPanelOpen}
      />
      {/* "Follow the thread." subtitle — landing page only, shown below filter panel */}
      {!focalArtistId && !isFilterPanelOpen && (
        <p className="fixed top-12 left-0 right-0 text-center text-[10px] tracking-[0.28em] uppercase text-[#2A2A2A] pointer-events-none z-30 select-none pt-[6px]">
          Follow the thread
        </p>
      )}
      {/* Vignette — subtle radial darkening draws focus toward the center of the graph */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(10,10,10,0.65) 100%)",
        }}
        aria-hidden="true"
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
    </>
  );
}

export default function Home() {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex h-full items-center justify-center text-[#555555]">
          Graph engine error — check the console.
        </div>
      }
    >
      <GraphView />
    </GraphErrorBoundary>
  );
}
