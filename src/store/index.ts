/**
 * Zustand v5 application store — single source of truth for client state.
 *
 * Access pattern (MANDATORY — selector only, never whole-store destructure):
 *
 *   ✅ const focalArtistId = useDigStore((state) => state.focalArtistId)
 *   ✅ const setFocalArtist = useDigStore((state) => state.setFocalArtist)
 *
 *   ❌ const { focalArtistId } = useDigStore()  // subscribes to entire store
 *
 * D3 simulation state (positions, velocities) lives entirely inside D3 — NOT here.
 * URL is the source of truth for focalArtistId on page load; Zustand syncs from URL.
 */

import { create } from "zustand";

// ─── Store interface ──────────────────────────────────────────────────────────

interface DigStore {
  // ── State ────────────────────────────────────────────────────────────────
  /** MBID of the currently displayed focal artist. null on initial load. */
  focalArtistId: string | null;
  /** Active era filter values (e.g. ['1960s', '1970s']). Empty = no filter active. */
  filterEras: string[];
  /** Active genre filter values (e.g. ['rock', 'jazz']). Empty = no filter active. */
  filterGenres: string[];
  /** MBID of the artist whose audio preview is currently playing. null = no audio. */
  audioPreviewId: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Set the focal artist. Called on pivot, search selection, and URL resolution. */
  setFocalArtist: (id: string) => void;
  /** Set both era and genre filters in a single store update (prevents double re-render). */
  setFilters: (eras: string[], genres: string[]) => void;
  /** Start or stop audio preview. Pass null to stop all active previews. */
  setAudioPreview: (id: string | null) => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

/**
 * Curried create<T>()((set) => ...) pattern for correct TypeScript inference.
 * This avoids type assertion and enables full autocompletion on set() calls.
 */
export const useDigStore = create<DigStore>()((set) => ({
  // Initial state
  focalArtistId: null,
  filterEras: [],
  filterGenres: [],
  audioPreviewId: null,

  // Actions
  setFocalArtist: (id) => set({ focalArtistId: id }),
  setFilters: (eras, genres) =>
    set({ filterEras: eras, filterGenres: genres }),
  setAudioPreview: (id) => set({ audioPreviewId: id }),
}));
