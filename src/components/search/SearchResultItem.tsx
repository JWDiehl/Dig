/**
 * SearchResultItem — presentational row for a single artist search result.
 *
 * Renders artist name (13px / text-primary) and a disambiguating detail
 * (11px / text-secondary): genre first, era as fallback, omitted entirely
 * if neither is available.
 *
 * Consumed exclusively by ArtistSearchInput as a child of Command.Item.
 * No interaction logic here — all selection handling lives in ArtistSearchInput.
 */

import type { Artist } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchResultItemProps {
  artist: Artist;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the best available disambiguating detail string, or null. */
function getDetail(artist: Artist): string | null {
  if (artist.genres.length > 0) return artist.genres[0];
  if (artist.era) return artist.era;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchResultItem({ artist }: SearchResultItemProps) {
  const detail = getDetail(artist);

  return (
    <div className="flex flex-col">
      {/* Artist name — text-primary, 13px */}
      <span
        className="text-[13px] font-medium leading-snug"
        style={{ color: "#F1F1F1" }}
      >
        {artist.name}
      </span>

      {/* Disambiguating detail — text-secondary, 11px; omitted if unavailable */}
      {detail !== null && (
        <span
          className="text-[11px] leading-snug mt-0.5"
          style={{ color: "#666666" }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}
