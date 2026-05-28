"use client";

/**
 * Landing page — Story 1.12.
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

import { useCallback, useEffect } from "react";
import beatlesDataRaw from "@/../public/data/beatles.json";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { useDigStore } from "@/store";
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

  // Query is disabled when focalArtistId is null (enabled: !!mbid in the hook).
  // On landing, no API call fires — milesData serves as the graph immediately.
  const { data, isPending, error } = useArtistGraph(focalArtistId);

  // Static on landing; live data after any pivot or search
  const graphData: GraphData | null = focalArtistId
    ? (data?.data ?? null)
    : beatlesData;

  // Replace the initial history entry so the Back button works from the first pivot
  useEffect(() => {
    window.history.replaceState({ focalMbid: BEATLES_MBID }, "");
  }, []);

  // Search selection handler — called by TopNav when user picks a result.
  // pushState keeps the URL in sync; landing page stays on / until first selection.
  const handleArtistSelect = useCallback(
    (artist: Artist) => {
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
  // Artist slug comes from current graphData (not from search result).
  const handlePivot = useCallback(
    (mbid: string) => {
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
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[#F3EDDD] animate-pulse select-none">
            DIG
          </span>
          <span className="text-[11px] tracking-[0.2em] uppercase text-[#4A4640] select-none">
            Building graph…
          </span>
        </div>
      </>
    );
  }

  if (focalArtistId && error) {
    return (
      <>
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <span className="text-[13px] text-[#A09880]">
            Could not load artist graph.
          </span>
          <span className="text-[11px] tracking-[0.08em] text-[#4A4640]">
            {error.message}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav onArtistSelect={handleArtistSelect} />
      {/* "Follow the thread." subtitle — landing page only */}
      {!focalArtistId && (
        <p className="fixed top-12 left-0 right-0 text-center text-[10px] tracking-[0.28em] uppercase text-[#4A4640] pointer-events-none z-40 select-none pt-[6px]">
          Follow the thread
        </p>
      )}
      {/* Vignette — subtle radial darkening draws focus toward the center of the graph */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(26,24,20,0.55) 100%)",
        }}
        aria-hidden="true"
      />
      <GraphCanvas
        graphData={graphData}
        filterEras={[]}
        filterGenres={[]}
        onPivot={handlePivot}
        focalArtistName={graphData?.focalArtist.name ?? ""}
        upstreamCount={graphData ? countByDirection(graphData, "upstream") : 0}
        downstreamCount={graphData ? countByDirection(graphData, "downstream") : 0}
      />
    </>
  );
}

export default function Home() {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex h-full items-center justify-center text-[#A09880]">
          Graph engine error — check the console.
        </div>
      }
    >
      <GraphView />
    </GraphErrorBoundary>
  );
}
