"use client";

/**
 * TEMPORARY TEST PAGE — Story 1.9 smoke test, updated in Story 1.10.
 *
 * Renders the Miles Davis influence graph to verify <GraphCanvas> works
 * end-to-end. Adds proper pivot handling (Zustand + pushState) and initial
 * replaceState so the Back button works from the very first pivot.
 *
 * Replace with the real landing page in Story 1.12.
 */

import { useCallback, useEffect } from "react";
import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import { useDigStore } from "@/store";
import type { GraphData } from "@/lib/data/types";

const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

function countByDirection(graphData: GraphData, dir: "upstream" | "downstream") {
  return graphData.edges.filter((e) => e.direction === dir).length;
}

function GraphView() {
  const setFocalArtist = useDigStore((state) => state.setFocalArtist);
  const { data, isPending, error } = useArtistGraph(MILES_DAVIS_MBID);
  const graphData = data?.data ?? null;

  // Replace the initial history entry so the Back button works from the first pivot
  useEffect(() => {
    window.history.replaceState({ focalMbid: MILES_DAVIS_MBID }, "");
  }, []);

  const handlePivot = useCallback(
    (mbid: string) => {
      // Update Zustand store → triggers TanStack Query refetch via useArtistGraph
      setFocalArtist(mbid);
      // Push to browser history so Back button restores the previous focal artist
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
      <div className="flex h-full items-center justify-center text-text-secondary">
        Loading Miles Davis…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        Error: {error.message}
      </div>
    );
  }

  return (
    <GraphCanvas
      graphData={graphData}
      filterEras={[]}
      filterGenres={[]}
      onPivot={handlePivot}
      focalArtistName={graphData?.focalArtist.name ?? ""}
      upstreamCount={graphData ? countByDirection(graphData, "upstream") : 0}
      downstreamCount={graphData ? countByDirection(graphData, "downstream") : 0}
    />
  );
}

export default function Home() {
  return (
    <GraphErrorBoundary
      fallback={
        <div className="flex h-full items-center justify-center text-text-secondary">
          Graph engine error — check the console.
        </div>
      }
    >
      <GraphView />
    </GraphErrorBoundary>
  );
}
