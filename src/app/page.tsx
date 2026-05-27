"use client";

/**
 * Landing page — Story 1.12.
 *
 * On initial load (focalArtistId === null):
 *   - Shows the Miles Davis graph from static public/data/miles-davis.json
 *   - No API call, no loading state — renders immediately
 *   - Displays "Follow the thread." subtitle beneath the search bar
 *
 * After search or pivot (focalArtistId set):
 *   - Switches to live data via useArtistGraph
 *   - Subtitle disappears; normal loading/error states apply
 */

import { useCallback, useEffect } from "react";
import milesDataRaw from "@/../public/data/miles-davis.json";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { useDigStore } from "@/store";
import type { Artist, GraphData } from "@/lib/data/types";

// Static landing data — imported at build time, no API call
const milesData = milesDataRaw as GraphData;

// MBID kept for initial history.replaceState call; no longer used as API argument
const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

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
    : milesData;

  // Replace the initial history entry so the Back button works from the first pivot
  useEffect(() => {
    window.history.replaceState({ focalMbid: MILES_DAVIS_MBID }, "");
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
        <div className="flex h-full items-center justify-center text-[#A09880]">
          Loading…
        </div>
      </>
    );
  }

  if (focalArtistId && error) {
    return (
      <>
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full items-center justify-center text-[#A09880]">
          Error: {error.message}
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav onArtistSelect={handleArtistSelect} />
      {/* "Follow the thread." subtitle — landing page only */}
      {!focalArtistId && (
        <p className="fixed top-12 left-0 right-0 text-center text-[13px] text-[#A09880] pointer-events-none z-40 select-none">
          Follow the thread.
        </p>
      )}
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
