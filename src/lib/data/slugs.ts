/**
 * Slug generation and resolution utilities.
 *
 * Slugs are human-readable URL path segments derived from artist names.
 * Format: lowercase, ASCII-only, hyphenated.
 * Collision resolution: append first 4 hex chars of the artist's MBID.
 *
 * Examples:
 *   "The Beatles"          → "the-beatles"
 *   "Björk"                → "bjork"
 *   "AC/DC"                → "ac-dc"
 *   "John Coltrane" (dup)  → "john-coltrane-a74b"
 *
 * Architecture note: this file imports `searchArtists` from musicbrainz.ts.
 * musicbrainz.ts therefore cannot import from this file (would be circular).
 * musicbrainz.ts uses its own private `toBaseSlug` helper for search results.
 */

import { searchArtists } from "./musicbrainz";
import { ArtistNotFoundError } from "../errors";

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Converts an artist name to a URL-safe slug.
 *
 * Steps:
 * 1. NFD unicode normalization — decomposes characters into base + diacritic
 * 2. Strip combining diacritical marks (U+0300–U+036F)
 * 3. Lowercase
 * 4. Replace any run of non-alphanumeric chars with a single hyphen
 * 5. Trim leading/trailing hyphens
 * 6. If `mbid` is provided, append the first 4 chars as a collision suffix
 *
 * @param name  Artist display name (any unicode)
 * @param mbid  MusicBrainz ID — provide only when a collision has been detected
 * @returns     URL-safe slug string
 */
export function generateSlug(name: string, mbid?: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens

  return mbid ? `${base}-${mbid.slice(0, 4)}` : base;
}

// ─── Resolution ───────────────────────────────────────────────────────────────

/**
 * Pattern matching a 4-character hex suffix appended for collision resolution.
 * Captures: [1] the base slug, [2] the 4-char MBID prefix.
 * Example: "john-coltrane-a74b" → ["john-coltrane", "a74b"]
 */
const COLLISION_SUFFIX_RE = /^(.+)-([0-9a-f]{4})$/;

/**
 * Resolves a URL slug to the corresponding MusicBrainz MBID.
 *
 * Algorithm:
 * 1. Detect whether the slug contains a 4-char hex collision suffix.
 * 2. Convert the slug's name portion (hyphens → spaces) into a search query.
 * 3. Call `searchArtists` and iterate results, regenerating the slug for each.
 * 4. Return the MBID of the first artist whose generated slug matches exactly.
 * 5. Throw `ArtistNotFoundError` when no match is found.
 *
 * @param slug  URL slug (e.g. "radiohead", "john-coltrane-a74b")
 * @returns     MBID string
 * @throws      {ArtistNotFoundError} when no artist matches the slug
 */
export async function resolveSlug(slug: string): Promise<string> {
  const collisionMatch = COLLISION_SUFFIX_RE.exec(slug);
  const hasCollisionSuffix = collisionMatch !== null;

  // Derive the search query from the name portion of the slug
  const namePart = hasCollisionSuffix ? collisionMatch[1] : slug;
  const query = namePart.replace(/-/g, " ");

  const artists = await searchArtists(query);

  for (const artist of artists) {
    // For collision-resolved slugs we regenerate with the MBID; otherwise plain.
    const candidate = hasCollisionSuffix
      ? generateSlug(artist.name, artist.mbid)
      : generateSlug(artist.name);

    if (candidate === slug) {
      return artist.mbid;
    }
  }

  throw new ArtistNotFoundError(slug);
}