/**
 * MusicBrainz REST API client.
 *
 * Responsibilities:
 * - Artist search (autocomplete source)
 * - Rate limiting: MusicBrainz enforces 1 req/sec — we use 1100ms minimum
 *   interval as a safety margin
 * - Retry-with-backoff: 3 attempts with exponential delay on 429 or errors
 * - Always sends the required User-Agent header (requests without it are rejected)
 *
 * MusicBrainz is the canonical source for:
 *   artist MBID, name, genre tags, and active-era/decade
 *
 * Image URLs come from Cover Art Archive (a separate lookup added in graph-builder).
 * isDataThin is computed by graph-builder, never by this client.
 *
 * API docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

import type { Artist } from "./types";
import { DataSourceError } from "../errors";

// ─── Constants ────────────────────────────────────────────────────────────────

const MB_BASE_URL = "https://musicbrainz.org/ws/2";

/**
 * MusicBrainz requires a descriptive User-Agent on every request.
 * Requests without it are rejected outright or immediately rate-limited.
 * Format: AppName/Version (contact-email-or-url)
 */
const MB_USER_AGENT = "dig/0.1.0 (jondiehl22@gmail.com)";

const MB_HEADERS = {
  "User-Agent": MB_USER_AGENT,
  Accept: "application/json",
} as const;

/**
 * Minimum milliseconds between outgoing requests to MusicBrainz.
 * MusicBrainz enforces 1 req/sec; we use 1100ms (10% safety margin).
 */
const MB_MIN_INTERVAL_MS = 1100;

const MB_MAX_RETRIES = 3;

// ─── Rate limiter ─────────────────────────────────────────────────────────────

/** Timestamp of the most recent MusicBrainz request (module-level singleton). */
let lastRequestTime = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch wrapper.
 * Waits until at least MB_MIN_INTERVAL_MS has elapsed since the last request,
 * then fires the fetch with required headers.
 */
async function mbFetch(url: string): Promise<Response> {
  const elapsed = Date.now() - lastRequestTime;
  if (lastRequestTime > 0 && elapsed < MB_MIN_INTERVAL_MS) {
    await delay(MB_MIN_INTERVAL_MS - elapsed);
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: MB_HEADERS });
}

/**
 * Fetch with retry-with-backoff.
 * Retries on 429 (rate limited) and network errors.
 * Throws DataSourceError after max retries are exhausted.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MB_MAX_RETRIES; attempt++) {
    try {
      const res = await mbFetch(url);

      if (res.status === 429) {
        // Server-side rate limit hit — back off before retrying
        await delay(1000 * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MB_MAX_RETRIES - 1) {
        await delay(500 * (attempt + 1));
      }
    }
  }

  throw new DataSourceError(
    `MusicBrainz unreachable after ${MB_MAX_RETRIES} attempts: ${String(lastError)}`,
  );
}

// ─── Response parsing ────────────────────────────────────────────────────────

interface MbTag {
  name: string;
  count: number;
}

interface MbLifeSpan {
  begin?: string | null;
  end?: string | null;
  ended?: boolean;
}

interface MbArtist {
  id: string;
  name: string;
  tags?: MbTag[];
  "life-span"?: MbLifeSpan | null;
}

interface MbSearchResponse {
  artists: MbArtist[];
}

/**
 * Converts a MusicBrainz `life-span.begin` year string to a decade string.
 * "1985" → "1980s", "1960" → "1960s", undefined/invalid → null
 */
function extractEra(lifeSpan: MbLifeSpan | null | undefined): string | null {
  const year = parseInt(lifeSpan?.begin ?? "", 10);
  if (isNaN(year) || year < 1000) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Private slug helper — avoids a circular dependency with slugs.ts.
 * (slugs.ts imports searchArtists from this file, so this file cannot
 * import from slugs.ts. The public generateSlug() lives in slugs.ts;
 * this private copy handles the base-slug case used by search results.)
 */
function toBaseSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Extracts genre strings from MusicBrainz tags, sorted by count descending.
 * Returns up to 5 top genres.
 */
function extractGenres(tags: MbTag[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];
  return [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((t) => t.name);
}

/**
 * Maps a raw MusicBrainz artist object to the canonical Artist interface.
 */
function mapArtist(mb: MbArtist): Artist {
  return {
    mbid: mb.id,
    slug: toBaseSlug(mb.name),
    name: mb.name,
    genres: extractGenres(mb.tags),
    era: extractEra(mb["life-span"]),
    imageUrl: null, // images fetched separately via Cover Art Archive
    isDataThin: false, // computed by graph-builder, not here
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Searches MusicBrainz for artists matching the given query string.
 *
 * Returns up to 10 results mapped to the canonical Artist interface.
 * Results are ordered by MusicBrainz relevance score (highest first).
 *
 * @throws {DataSourceError} when MusicBrainz is unreachable after retries.
 */
export async function searchArtists(query: string): Promise<Artist[]> {
  if (!query.trim()) return [];

  const url = `${MB_BASE_URL}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=10`;

  let res: Response;
  try {
    res = await fetchWithRetry(url);
  } catch (err) {
    if (err instanceof DataSourceError) throw err;
    throw new DataSourceError(`MusicBrainz search failed: ${String(err)}`);
  }

  if (!res.ok) {
    throw new DataSourceError(
      `MusicBrainz returned HTTP ${res.status} for query "${query}"`,
    );
  }

  let body: MbSearchResponse;
  try {
    body = (await res.json()) as MbSearchResponse;
  } catch {
    throw new DataSourceError("MusicBrainz returned invalid JSON");
  }

  return (body.artists ?? []).map(mapArtist);
}