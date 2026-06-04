"use client";

/**
 * AudioPreviewControl — inline audio preview player for the NodeDetailPanel.
 *
 * Renders inside NodeDetailPanel only when a Spotify preview URL is available.
 * When unavailable the component is NOT mounted — absence is the UI (not disabled).
 *
 * Behaviour:
 *   - On mount: creates HTMLAudioElement, starts HOVER_DWELL_MS (500ms) auto-play timer
 *   - After 500ms: audio plays, play button becomes pause, waveform animates
 *   - If unmounted before 500ms (cursor left): timer clears, no audio plays
 *   - Zustand audioPreviewId coordinates one-active-preview-at-a-time
 *   - Manual toggle: click play/pause button
 *
 * NFR-4 compliance: this component never imports audio-preview.ts or spotify.ts.
 */

import { useRef, useState, useEffect } from "react";
import { useDigStore } from "@/store";
import { HOVER_DWELL_MS } from "@/graph/constants";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AudioPreviewControlProps {
  /** Spotify preview URL — always a non-null string (parent guards this). */
  previewUrl: string;
  /** MBID of the artist — used to coordinate one active preview via Zustand. */
  mbid: string;
}

// ─── Waveform bars ────────────────────────────────────────────────────────────

function WaveformBars({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true" style={{ height: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-sm bg-current ${isPlaying ? "animate-waveform" : ""}`}
          style={{
            height: isPlaying ? undefined : 4,
            animationDelay: isPlaying ? `${i * 80}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AudioPreviewControl({ previewUrl, mbid }: AudioPreviewControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPreviewId = useDigStore((s) => s.audioPreviewId);
  const setAudioPreview = useDigStore((s) => s.setAudioPreview);

  // Auto-play after HOVER_DWELL_MS, stop and clean up on unmount.
  useEffect(() => {
    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audioRef.current = audio;

    const timer = setTimeout(() => {
      audio.play().catch(() => {}); // autoplay may be blocked by browser policy
      setAudioPreview(mbid);
      setIsPlaying(true);
    }, HOVER_DWELL_MS);

    return () => {
      clearTimeout(timer);
      audio.pause();
      audioRef.current = null;
      setAudioPreview(null);
      setIsPlaying(false);
    };
  // previewUrl and mbid are stable for the lifetime of this component instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop if another preview becomes active.
  useEffect(() => {
    if (isPlaying && audioPreviewId !== mbid) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [audioPreviewId, isPlaying, mbid]);

  function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setAudioPreview(null);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      setAudioPreview(mbid);
    }
  }

  return (
    <div className="mt-3 pt-3 flex items-center gap-3 text-[#F1F1F1]"
         style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Play / Pause button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                   border border-white/20 hover:border-white/40 transition-colors"
      >
        {isPlaying ? (
          /* Pause icon — two rectangles */
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="3.5" height="12" rx="1" />
            <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          /* Play icon — triangle */
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <path d="M0 0 L10 6 L0 12 Z" />
          </svg>
        )}
      </button>

      {/* Waveform bars */}
      <WaveformBars isPlaying={isPlaying} />

      {/* Screen-reader label */}
      <span className="sr-only">
        {isPlaying ? "Audio preview playing" : "Audio preview ready"}
      </span>
    </div>
  );
}
