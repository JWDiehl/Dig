"use client";

/**
 * TopNav — 48px frosted-glass navigation bar.
 *
 * Always visible, fixed to the top of the viewport, floats over the D3 canvas.
 * Contains: ArtistSearchInput (fills available width) + FilterToggle (right-aligned).
 *
 * Visual spec:
 *   Background: rgba(10,10,10,0.94) — `chrome` design token
 *   Border: rgba(255,255,255,0.08) — subtle white border
 *   Blur:   12px backdrop-filter
 *   Height: 48px (h-12)
 *   z-index: 50 — floats over D3 SVG canvas
 *
 * FilterToggle is **inactive state only** in this story.
 * Story 1.13 wires up filter panel open/close and the active-dot indicator.
 */

import { ArtistSearchInput } from "@/components/search/ArtistSearchInput";
import type { Artist } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TopNavProps {
  /** Called when the user selects an artist from the search dropdown. */
  onArtistSelect: (artist: Artist) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopNav({ onArtistSelect }: TopNavProps) {
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

      {/* Search input — flex-1 so it fills the remaining width after the toggle */}
      <ArtistSearchInput
        onSelect={onArtistSelect}
        className="flex-1 min-w-0"
      />

      {/* Filter toggle — inactive state; Story 1.13 wires up the panel */}
      {/* TODO Story 1.13: wire up filter panel open/close and active-dot indicator */}
      <button
        aria-label="Toggle filters"
        className="flex-shrink-0 p-2 rounded text-[#555555] hover:text-[#F1F1F1] transition-colors cursor-pointer"
        type="button"
      >
        {/* Inline funnel icon — no external icon library per architecture */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2 3h12M4 8h8M6 13h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="sr-only">Toggle filters</span>
      </button>
    </nav>
  );
}
