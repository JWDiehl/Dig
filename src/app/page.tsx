"use client";

/**
 * TEMPORARY TEST PAGE — Story 1.9 smoke test.
 *
 * Renders the Miles Davis influence graph to verify <GraphCanvas> works
 * end-to-end before stories 1.10–1.12 build on top of it.
 *
 * Replace with the real landing page in Story 1.12.
 */

import { useArtistGraph } from "@/hooks/useArtistGraph";
import { GraphCanvas } from "@/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/graph/GraphErrorBoundary";
import type { GraphData } from "@/lib/data/types";

const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

function countByDirection(graphData: GraphData, dir: "upstream" | "downstream") {
  return graphData.edges.filter((e) => e.direction === dir).length;
}

function GraphView() {
  const { data, isPending, error } = useArtistGraph(MILES_DAVIS_MBID);
  const graphData = data?.data ?? null;

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
      onPivot={(mbid) => console.log("pivot →", mbid)}
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
