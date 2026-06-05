"use client";

/**
 * Landing page — Story 1.12 / Story 2.4 (filters) / Story 3.2 (mobile two-tap).
 *
 * Mobile two-tap model: D3 click fires onPivot for both desktop clicks and mobile
 * taps. handlePivot intercepts: first mobile tap shows MobileBottomSheet; second
 * tap on same node commits the actual pivot. Desktop: immediate pivot as before.
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
import { MobileBottomSheet } from "@/components/graph/MobileBottomSheet";
import { isMobileViewport } from "@/lib/motion";
import { expandGraphNode } from "@/graph/simulation";
import type { Artist, GraphData } from "@/lib/data/types";

const beatlesData = beatlesDataRaw as GraphData;
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
  const [tappedMbid, setTappedMbid] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const isFilterActive = filterEras.length > 0 || filterGenres.length > 0;

  const { data, isPending, error } = useArtistGraph(focalArtistId);
  const graphData: GraphData | null = focalArtistId ? (data?.data ?? null) : beatlesData;

  const hoveredArtist = graphData?.artists.find((a) => a.mbid === hoveredMbid) ?? null;
  const tappedArtist = graphData?.artists.find((a) => a.mbid === tappedMbid) ?? null;

  const handleHover = useCallback((mbid: string | null) => setHoveredMbid(mbid), []);

  useEffect(() => {
    window.history.replaceState({ focalMbid: BEATLES_MBID }, "");
  }, []);

  // Shared pivot logic — used by both desktop click and mobile second-tap
  const doPivot = useCallback(
    (mbid: string) => {
      setHoveredMbid(null);
      setTappedMbid(null);
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

  const handleArtistSelect = useCallback(
    (artist: Artist) => {
      setHoveredMbid(null);
      setTappedMbid(null);
      setFocalArtist(artist.mbid);
      window.history.pushState(
        { focalMbid: artist.mbid },
        "",
        artist.slug ? `/artist/${artist.slug}` : "",
      );
    },
    [setFocalArtist],
  );

  // D3 fires onPivot for both desktop clicks and mobile taps.
  // Mobile: intercept for two-tap model. Desktop: immediate pivot.
  const handlePivot = useCallback(
    (mbid: string) => {
      if (isMobileViewport()) {
        if (tappedMbid === mbid) {
          doPivot(mbid); // second tap → commit
        } else {
          setHoveredMbid(null);
          setTappedMbid(mbid); // first tap → open sheet
        }
        return;
      }
      doPivot(mbid);
    },
    [tappedMbid, doPivot],
  );

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
          <span className="text-[13px] text-[#555555]">Could not load artist graph.</span>
          <span className="text-[11px] tracking-[0.08em] text-[#333333]">{error.message}</span>
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
      {!focalArtistId && !isFilterPanelOpen && (
        <p className="fixed top-12 left-0 right-0 text-center text-[10px] tracking-[0.28em] uppercase text-[#2A2A2A] pointer-events-none z-30 select-none pt-[6px]">
          Follow the thread
        </p>
      )}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(10,10,10,0.65) 100%)" }}
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
      {/* Desktop hover panel */}
      {hoveredArtist && (
        <NodeDetailPanel artist={hoveredArtist} onClose={() => setHoveredMbid(null)} />
      )}
      {/* Mobile bottom sheet + dismiss overlay */}
      {tappedArtist && (
        <>
          <div className="fixed inset-0 z-[25]" onClick={() => setTappedMbid(null)} />
          <MobileBottomSheet
            artist={tappedArtist}
            onPivot={() => doPivot(tappedArtist.mbid)}
            onClose={() => setTappedMbid(null)}
            onExpand={(mbid) => void expandGraphNode(mbid)}
          />
        </>
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
