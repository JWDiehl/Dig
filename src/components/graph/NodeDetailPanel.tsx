"use client";

/**
 * NodeDetailPanel — fixed right-side panel that appears on node hover (Story 2.1).
 *
 * Triggered by D3 mouseenter dwell (HOVER_DETAIL_DELAY_MS) or keyboard Enter/Space.
 * Dismissed by D3 mouseleave, Escape key, or pivot.
 *
 * Position: fixed right-4 top-[60px], 280px wide, z-30 (above canvas, below TopNav).
 * Desktop only — mobile uses a bottom sheet (Story 3.2).
 *
 * Audio preview slot reserved here; wired in Story 2.2.
 */

import { useEffect, useState } from "react";
import type { Artist } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NodeDetailPanelProps {
  /** The hovered artist to display. */
  artist: Artist;
  /** Called when the panel should close (Escape key, or parent clears hover). */
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NodeDetailPanel({ artist, onClose }: NodeDetailPanelProps) {
  // One-frame delay triggers CSS transition on mount (opacity 0 → 1).
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape key closes the panel.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const genreText = artist.genres.join(" · ");

  return (
    <aside
      role="dialog"
      aria-label={`${artist.name} details`}
      className={[
        "fixed right-4 top-[60px] w-[280px] z-30 rounded-lg p-4",
        "transition-all duration-150",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2",
      ].join(" ")}
      style={{
        backgroundColor: "rgba(16,16,16,0.98)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Artist name — detail-title: 16px / 600 / text-primary */}
      <h2 className="text-[16px] font-semibold leading-snug text-[#F1F1F1]">
        {artist.name}
      </h2>

      {/* Genre tags — detail-body: 13px / text-secondary */}
      {genreText && (
        <p className="text-[13px] text-[#666666] mt-2 leading-snug">
          {genreText}
        </p>
      )}

      {/* Era — detail-body: 13px / text-secondary */}
      {artist.era && (
        <p className="text-[13px] text-[#666666] mt-1 leading-snug">
          {artist.era}
        </p>
      )}

      {/* AudioPreviewControl — Story 2.2 */}
    </aside>
  );
}
