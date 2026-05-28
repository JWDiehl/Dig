"use client";

/**
 * ArtistSearchInput — cmdk-powered artist search autocomplete.
 *
 * Uses the pre-existing useArtistSearch hook (300ms debounce built in).
 * cmdk handles keyboard navigation (↑↓ arrow keys, Enter to select).
 * Escape is handled manually to clear the query and close the dropdown.
 *
 * CRITICAL: shouldFilter={false} on Command disables cmdk's built-in text
 * matching — all filtering is done server-side via useArtistSearch.
 *
 * Architecture:
 *   ArtistSearchInput   ← owned by TopNav
 *     Command (cmdk)
 *       Command.Input   ← controlled, 300ms debounce lives in useArtistSearch
 *       Command.List    ← conditionally rendered when query.trim().length > 0
 *         Command.Item  ← one per artist result, wraps SearchResultItem
 *
 * No Zustand access here — all selection side-effects delegated to onSelect prop.
 */

import { useState } from "react";
import { Command } from "cmdk";
import { useArtistSearch } from "@/hooks/useArtistSearch";
import { SearchResultItem } from "./SearchResultItem";
import type { Artist } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ArtistSearchInputProps {
  /** Called when the user selects an artist from the dropdown. */
  onSelect: (artist: Artist) => void;
  /** Optional className forwarded to the Command root (e.g. flex-1). */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtistSearchInput({ onSelect, className }: ArtistSearchInputProps) {
  const [query, setQuery] = useState("");

  // useArtistSearch already debounces by SEARCH_DEBOUNCE_MS (300ms) internally.
  // Do NOT add a second debounce here.
  const { data, isPending } = useArtistSearch(query);
  const artists = data?.data ?? [];

  const isOpen = query.trim().length > 0;

  function handleSelect(artist: Artist) {
    // Clear query first so dropdown closes before parent side-effects fire.
    setQuery("");
    onSelect(artist);
  }

  return (
    <>
      <Command
        shouldFilter={false}
        className={`relative${className ? ` ${className}` : ""}`}
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search any artist…"
          aria-label="Search artists"
          className="w-full bg-transparent text-[15px] text-[#F1F1F1] placeholder:text-[#444444] outline-none border-0"
          onKeyDown={(e) => {
            // cmdk does not natively clear the input on Escape — we do it manually.
            if (e.key === "Escape") {
              setQuery("");
            }
          }}
        />

        {isOpen && (
          <Command.List
            className="absolute top-full left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg z-50"
            style={{
              backgroundColor: "rgba(16,16,16,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxHeight: "360px",
              overflowY: "auto",
            }}
          >
            {/* Empty state — only show after results have resolved (not during load) */}
            {!isPending && artists.length === 0 && (
              <Command.Empty
                className="px-3 py-4 text-[13px] text-[#555555] text-center"
              >
                No artists found for &apos;{query}&apos;
              </Command.Empty>
            )}

            {artists.map((artist) => (
              <Command.Item
                key={artist.mbid}
                value={artist.mbid}
                onSelect={() => handleSelect(artist)}
                className="flex flex-col px-3 py-2 cursor-pointer transition-colors data-[selected=true]:bg-white/10 hover:bg-white/5"
              >
                <SearchResultItem artist={artist} />
              </Command.Item>
            ))}
          </Command.List>
        )}
      </Command>

      {/* ARIA live region — announces result count to screen readers.
          Placed outside Command to avoid duplication with cmdk's internal aria-live. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isOpen && !isPending
          ? artists.length > 0
            ? `${artists.length} result${artists.length !== 1 ? "s" : ""} for ${query}`
            : ""
          : ""}
      </div>
    </>
  );
}
