"use client";

/**
 * GraphCanvas — React SVG mount point for the D3 graph engine.
 *
 * React renders ONLY the <svg> element. D3 owns everything inside it.
 * After initializeGraph() fires, React never writes to SVG children again.
 *
 * Three useEffect hooks (architecture-mandated pattern):
 *   1. Init  []             → initializeGraph() once on mount; cleanupGraph on unmount
 *   2. Data  [graphData]    → updateGraphData() when focal artist changes
 *   3. Filter [filterEras, filterGenres] → applyFilters() with no React re-render
 *
 * 'use client' is required: D3 uses window, document, and SVG APIs unavailable in Node.js.
 */

import { useRef, useEffect } from "react";
import type { GraphData } from "@/lib/data/types";
import { initializeGraph, updateGraphData, cleanupGraph } from "./simulation";
import { applyFilters } from "./filters";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GraphCanvasProps {
  /** Full influence graph for the focal artist. null while data is loading. */
  graphData: GraphData | null;

  /** Active era filter values from Zustand store (e.g. ['1960s', '1970s']). */
  filterEras: string[];

  /** Active genre filter values from Zustand store (e.g. ['rock', 'jazz']). */
  filterGenres: string[];

  /**
   * Called when the user clicks a non-focal node.
   * Story 1.10 implements the full pivot animation; this fires the store update.
   */
  onPivot: (mbid: string) => void;

  /**
   * Called when a non-focal node is hovered (after HOVER_DETAIL_DELAY_MS dwell)
   * or keyboard-activated (Enter/Space). Null signals hover end.
   * Optional — defaults to no-op so existing callers need no change.
   */
  onHover?: (mbid: string | null) => void;

  /** Display name of the focal artist — used in the SVG aria-label. */
  focalArtistName: string;

  /** Count of upstream influence nodes — used in the SVG aria-label. */
  upstreamCount: number;

  /** Count of downstream influenced nodes — used in the SVG aria-label. */
  downstreamCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GraphCanvas({
  graphData,
  filterEras,
  filterGenres,
  onPivot,
  onHover,
  focalArtistName,
  upstreamCount,
  downstreamCount,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Effect 1: Init — D3 takes ownership of the SVG element ───────────────
  useEffect(() => {
    if (!svgRef.current) return;
    initializeGraph(svgRef.current, graphData, onPivot, onHover ?? (() => {}));
    return () => cleanupGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: D3 owns SVG lifecycle after mount

  // ── Effect 2: Data — propagate new focal artist to D3 ────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    updateGraphData(graphData);
  }, [graphData]);

  // ── Effect 3: Filters — D3 dims nodes, zero React re-render ──────────────
  useEffect(() => {
    applyFilters({ eras: filterEras, genres: filterGenres });
  }, [filterEras, filterGenres]);

  // ── Effect 4: Back button — popstate restores previous focal artist ───────
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const mbid = (e.state as { focalMbid?: string } | null)?.focalMbid;
      if (mbid) onPivot(mbid);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onPivot]);

  // ── Aria label ────────────────────────────────────────────────────────────
  const ariaLabel = focalArtistName
    ? `Influence graph centered on ${focalArtistName}. ${upstreamCount} influences, ${downstreamCount} influenced artists.`
    : "Influence graph loading.";

  return (
    <svg
      ref={svgRef}
      className="w-screen h-screen"
      role="img"
      aria-label={ariaLabel}
      style={{ touchAction: "none" }}
    />
  );
}
