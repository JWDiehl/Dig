"use client";

/**
 * MobileBottomSheet — mobile two-tap node detail panel (Story 3.2).
 *
 * Opens on the first tap of a non-focal node on < 768px viewports.
 * The second tap on the same node commits the pivot via onPivot().
 *
 * Behaviour:
 *   - Slides up from bottom edge (translateY 100% → 0)
 *   - Audio preview begins immediately (autoPlayDelay=0)
 *   - Swipe down ≥ 60px dismisses without pivot
 *   - Escape key dismisses
 *   - Transparent overlay behind the sheet dismisses on outside tap (rendered by parent)
 */

import { useEffect, useRef, useState } from "react";
import type { Artist } from "@/lib/data/types";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { AudioPreviewControl } from "./AudioPreviewControl";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MobileBottomSheetProps {
  /** The tapped artist to display. */
  artist: Artist;
  /** Called when the second tap commits the pivot. */
  onPivot: () => void;
  /** Called to dismiss the sheet without pivoting. */
  onClose: () => void;
  /** Called when the expand affordance button is tapped. */
  onExpand: (mbid: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileBottomSheet({ artist, onPivot, onClose, onExpand }: MobileBottomSheetProps) {
  const { previewUrl, isPending } = useAudioPreview(artist.mbid, artist.name);

  // Slide-up animation on mount
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape key dismisses
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Swipe-down detection
  const touchStartY = useRef(0);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) onClose();
  }

  const genreText = artist.genres.join(" · ");

  return (
    <aside
      role="dialog"
      aria-label={`${artist.name} details`}
      className={[
        "fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl",
        "transition-transform duration-250 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      style={{
        maxHeight: "40vh",
        overflowY: "auto",
        backgroundColor: "rgba(16,16,16,0.98)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle pill */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-8 h-1 rounded-full bg-white/20" aria-hidden="true" />
      </div>

      <div className="px-4 pb-6 pt-2">
        {/* Artist name */}
        <h2 className="text-[16px] font-semibold leading-snug text-[#F1F1F1]">
          {artist.name}
        </h2>

        {/* Genre + era */}
        {genreText && (
          <p className="text-[13px] text-[#666666] mt-1 leading-snug">{genreText}</p>
        )}
        {artist.era && (
          <p className="text-[13px] text-[#666666] mt-0.5 leading-snug">{artist.era}</p>
        )}

        {/* Audio preview — immediate on mobile */}
        {isPending && (
          <div className="mt-3 pt-3 flex gap-[5px] items-center"
               style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#333333] animate-pulse"
                   style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        {!isPending && previewUrl && (
          <AudioPreviewControl previewUrl={previewUrl} mbid={artist.mbid} autoPlayDelay={0} />
        )}

        {/* Pivot prompt */}
        <button
          type="button"
          onClick={onPivot}
          className="mt-4 pt-3 w-full text-left text-[13px] text-[#666666] cursor-pointer"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          Tap again to explore{" "}
          <span className="text-[#F1F1F1] font-medium">{artist.name}</span>
        </button>

        {/* Expand affordance */}
        <button
          type="button"
          onClick={() => onExpand(artist.mbid)}
          className="mt-2 text-[12px] text-[#444444] hover:text-[#666666] transition-colors cursor-pointer"
        >
          Expand connections
        </button>
      </div>
    </aside>
  );
}
