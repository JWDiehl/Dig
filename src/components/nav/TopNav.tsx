"use client";

/**
 * TopNav — 48px frosted-glass navigation bar.
 *
 * Always visible, fixed to the top of the viewport, floats over the D3 canvas.
 * Contains: DIG wordmark, ArtistSearchInput (fills width), FilterToggle (right-aligned).
 *
 * Visual spec:
 *   Background: rgba(10,10,10,0.94) — `chrome` design token
 *   Border: rgba(255,255,255,0.08) — subtle white border
 *   Blur:   12px backdrop-filter
 *   Height: 48px (h-12)
 *   z-index: 50 — floats over D3 SVG canvas
 *
 * Filter props are optional — callers that don't manage filter state
 * (e.g. not-found pages) can omit them safely.
 */

import { ArtistSearchInput } from "@/components/search/ArtistSearchInput";
import { FilterToggle } from "@/components/filters/FilterToggle";
import type { Artist } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TopNavProps {
  /** Called when the user selects an artist from the search dropdown. */
  onArtistSelect: (artist: Artist) => void;
  /** Called when the filter panel toggle is clicked. Defaults to no-op. */
  onFilterToggle?: () => void;
  /** Whether the filter panel is currently open. Defaults to false. */
  isFilterPanelOpen?: boolean;
  /** Whether any filters are currently active. Defaults to false. */
  isFilterActive?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopNav({
  onArtistSelect,
  onFilterToggle = () => {},
  isFilterPanelOpen = false,
  isFilterActive = false,
}: TopNavProps) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center gap-3 px-4"
      style={{
        backgroundColor: "rgba(10,10,10,0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Top navigation"
    >
      {/* Wordmark — links back to the landing page */}
      <a
        href="/"
        aria-label="Dig — home"
        className="flex-shrink-0 text-[13px] font-semibold tracking-[0.22em] text-[#F1F1F1] hover:text-[#F0B429] transition-colors duration-200 select-none"
      >
        DIG
      </a>

      {/* Divider */}
      <div
        className="flex-shrink-0 w-px h-4 self-center"
        style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
        aria-hidden="true"
      />

      {/* Search input — flex-1 so it fills the remaining width */}
      <ArtistSearchInput
        onSelect={onArtistSelect}
        className="flex-1 min-w-0"
      />

      {/* Filter toggle — wired in Story 2.4 */}
      <FilterToggle
        isOpen={isFilterPanelOpen}
        isActive={isFilterActive}
        onToggle={onFilterToggle}
      />
    </nav>
  );
}
