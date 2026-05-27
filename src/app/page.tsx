"use client";

/**
 * TEMPORARY TEST PAGE — Story 1.9 smoke test, updated through Story 1.11.
 *
 * Renders the influence graph with TopNav search bar.
 * Focal artist is driven by Zustand focalArtistId; falls back to Miles Davis
 * on initial load (before any search or pivot).
 *
 * Replace with the real landing page in Story 1.12.
 */

import { useCallback, useEffect } from "react";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { TopNav } from "@/components/nav/TopNav";
import { useDigStore } from "@/store";
import type { Artist, GraphData } from "@/lib/data/types";

const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

function countByDirection(graphData: GraphData, dir: "upstream" | "downstream") {
  return graphData.edges.filter((e) => e.direction === dir).length;
}

function GraphView() {
  const setFocalArtist = useDigStore((state) => state.setFocalArtist);
  const focalArtistId = useDigStore((state) => state.focalArtistId);

  // Use store focalArtistId when set; fall back to Miles Davis on initial load.
  const activeMbid = focalArtistId ?? MILES_DAVIS_MBID;
  const { data, isPending, error } = useArtistGraph(activeMbid);
  const graphData = data?.data ?? null;

  // Replace the initial history entry so the Back button works from the first pivot
  useEffect(() => {
    window.history.replaceState({ focalMbid: MILES_DAVIS_MBID }, "");
  }, []);

  // Search selection handler — called by TopNav when user picks a result.
  // Zustand update → useArtistGraph refetches → D3 updates automatically.
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
  // Separate from handleArtistSelect: artist slug must come from current graphData.
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

  if (isPending) {
    return (
      <>
        <TopNav onArtistSelect={handleArtistSelect} />
        <div className="flex h-full items-center justify-center text-[#A09880]">
          Loading…
        </div>
      </>
    );
  }

  if (error) {
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
