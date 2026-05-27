/**
 * Graph Builder — orchestrates Wikipedia, Wikidata, and MusicBrainz
 * to assemble a complete `GraphData` object for a given focal artist.
 *
 * Partial-success is first-class: if one or more sources fail, the graph is
 * returned with `warnings[]` populated. Only if ALL sources fail is
 * `DataSourceError` thrown.
 *
 * `isDataThin` is computed here (server-side) and never re-derived on the client.
 */

import { getArtistByMbid, searchArtists } from "./musicbrainz";
import { getUpstreamInfluences as getWikipediaUpstream } from "./wikipedia";
import {
  getUpstreamInfluences as getWikidataUpstream,
  getDownstreamInfluences,
} from "./wikidata";
import { generateSlug } from "./slugs";
import { ArtistNotFoundError, DataSourceError } from "../errors";
import type { Artist, GraphData, InfluenceEdge } from "./types";
import { DATA_THIN_THRESHOLD } from "./constants";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum influence names to resolve per direction (upstream / downstream).
 * Capped before MusicBrainz lookups to limit total API calls per graph build.
 */
const MAX_INFLUENCES_PER_DIRECTION = 15;

/**
 * Number of MusicBrainz name-lookups fired concurrently per batch.
 *
 * Within a batch all promises are started together via Promise.allSettled.
 * The rate limiter in musicbrainz.ts (1100 ms minimum interval) serialises
 * requests as they enter mbFetch, so the effective pattern per batch is:
 *   item 0  → fires immediately
 *   item 1  → waits ~1100 ms  (rate-limiter delay)
 *   item 2  → fires ~simultaneously with item 1 (both computed the same
 *              delay before either updated lastRequestTime — an inherent
 *              limitation of the singleton rate limiter under concurrency)
 *
 * fetchWithRetry's 429-with-backoff handles the rare case where item 2
 * triggers a server-side rate-limit response.
 *
 * Key performance benefit over pure sequential: network round-trips overlap
 * within a batch, so response latency does not compound across lookups.
 */
const RESOLVE_BATCH_SIZE = 3;

/**
 * Pause between consecutive resolve batches.
 *
 * 400 ms is intentionally less than the mbFetch rate-limit interval (1100 ms).
 * The rate limiter adds the remaining ~700 ms for the next batch's first
 * request automatically, so the effective gap between batches is still
 * ~1100 ms — but we don't burn extra wall-clock time during the pause.
 */
const RESOLVE_INTER_BATCH_MS = 400;

/**
 * Hard deadline for the entire buildGraph() call, in milliseconds.
 *
 * If the name-resolution phase (the slow MusicBrainz lookup loop) has not
 * finished by this point, the function returns whatever partial graph has
 * been assembled so far, plus a warning explaining the truncation.
 *
 * Chosen to be long enough for a typical artist (~5 influence names per
 * direction → 2 batches → ~3 s) while capping worst-case wait time.
 */
const GRAPH_BUILD_TIMEOUT_MS = 8000;

/** Minimal sleep helper — keeps graph-builder self-contained. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a `GraphData` object for the given MusicBrainz ID.
 *
 * Sources:
 * - Wikipedia MediaWiki API → upstream influence names (primary)
 * - Wikidata SPARQL P737 forward → upstream influence names (supplement)
 * - Wikidata SPARQL P737 reverse → downstream influence names
 *
 * Partial-success contract:
 * - Any single source failure → graph returned with `warnings[]` populated
 * - All sources fail → throws `DataSourceError`
 * - Focal artist not in MusicBrainz → throws `ArtistNotFoundError`
 *
 * @param mbid  MusicBrainz ID of the focal artist
 * @param depth Intended graph depth (stored in GraphData; hop-1 data returned)
 * @throws {ArtistNotFoundError} when the MBID is not found in MusicBrainz
 * @throws {DataSourceError} when all influence sources fail
 */
export async function buildGraph(
  mbid: string,
  depth = 2,
): Promise<GraphData> {
  // ── Step 1: Fetch focal artist by MBID ──────────────────────────────────────
  let focalArtist: Artist;
  try {
    const raw = await getArtistByMbid(mbid);
    // musicbrainz.ts uses toBaseSlug (no MBID suffix). Override with proper
    // generateSlug from slugs.ts (graph-builder can import both without circular dep).
    focalArtist = { ...raw, slug: generateSlug(raw.name) };
  } catch (err) {
    if (err instanceof ArtistNotFoundError) throw err;
    throw new DataSourceError(
      `Could not load focal artist for MBID "${mbid}": ${String(err)}`,
    );
  }

  // ── Step 2: Fetch influence names from all 3 sources in parallel ────────────
  const [wikiResult, wikidataUpResult, wikidataDownResult] =
    await Promise.allSettled([
      getWikipediaUpstream(focalArtist.name),
      getWikidataUpstream(mbid),
      getDownstreamInfluences(mbid),
    ]);

  // ── Step 3: Total-failure check ─────────────────────────────────────────────
  if (
    wikiResult.status === "rejected" &&
    wikidataUpResult.status === "rejected" &&
    wikidataDownResult.status === "rejected"
  ) {
    throw new DataSourceError(
      `All influence data sources failed for MBID "${mbid}"`,
    );
  }

  // ── Step 4: Collect names and warnings ──────────────────────────────────────
  const warnings: string[] = [];
  let upstreamNamesWiki: string[] = [];
  let upstreamNamesWikidata: string[] = [];
  let downstreamNames: string[] = [];

  if (wikiResult.status === "fulfilled") {
    upstreamNamesWiki = wikiResult.value;
  } else {
    warnings.push(
      "Wikipedia unavailable — upstream influences may be incomplete",
    );
  }

  if (wikidataUpResult.status === "fulfilled") {
    upstreamNamesWikidata = wikidataUpResult.value;
  } else {
    warnings.push(
      "Wikidata upstream unavailable — upstream influences may be incomplete",
    );
  }

  if (wikidataDownResult.status === "fulfilled") {
    downstreamNames = wikidataDownResult.value;
  } else {
    warnings.push(
      "Wikidata downstream unavailable — downstream influences may be incomplete",
    );
  }

  // ── Step 5: Deduplicate upstream (Wikipedia primary; Wikidata supplements) ──
  const upstreamNames: string[] = [...upstreamNamesWiki];
  for (const name of upstreamNamesWikidata) {
    if (!upstreamNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      upstreamNames.push(name);
    }
  }

  // ── Step 6: Cap per direction before expensive MusicBrainz lookups ──────────
  const cappedUpstream = upstreamNames.slice(0, MAX_INFLUENCES_PER_DIRECTION);
  const cappedDownstream = downstreamNames.slice(0, MAX_INFLUENCES_PER_DIRECTION);

  // ── Step 7: Resolve names → Artist objects via MusicBrainz search ───────────
  const upstreamArtists = await resolveNamesToArtists(cappedUpstream);
  const downstreamArtists = await resolveNamesToArtists(cappedDownstream);

  // ── Step 8: Build confidence-tracking sets ───────────────────────────────────
  const wikiSet = new Set(upstreamNamesWiki.map((n) => n.toLowerCase()));
  const wikidataUpSet = new Set(
    upstreamNamesWikidata.map((n) => n.toLowerCase()),
  );

  // ── Step 9: Build edges ──────────────────────────────────────────────────────
  const edges: InfluenceEdge[] = [
    ...upstreamArtists.map((a) => ({
      sourceId: a.mbid,  // influencer
      targetId: mbid,    // focal artist was influenced BY them
      direction: "upstream" as const,
      confidence: (
        wikiSet.has(a.name.toLowerCase()) &&
        wikidataUpSet.has(a.name.toLowerCase())
      )
        ? ("high" as const)
        : ("medium" as const),
    })),
    ...downstreamArtists.map((a) => ({
      sourceId: mbid,    // focal artist influenced them
      targetId: a.mbid,
      direction: "downstream" as const,
      confidence: "medium" as const,  // Wikidata only — single source
    })),
  ];

  // ── Step 10: Compute isDataThin for every artist ─────────────────────────────
  const allArtists = [focalArtist, ...upstreamArtists, ...downstreamArtists].map(
    (a) => ({
      ...a,
      isDataThin: countEdgesForArtist(a.mbid, edges) < DATA_THIN_THRESHOLD,
    }),
  );

  const focalArtistFinal = allArtists.find((a) => a.mbid === mbid) ?? allArtists[0];

  return {
    focalArtist: focalArtistFinal,
    artists: allArtists,
    edges,
    depth,
    warnings,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves a list of artist name strings to `Artist` objects by searching
 * MusicBrainz and taking the top result for each name.
 *
 * Lookups are fired in batches of RESOLVE_BATCH_SIZE using Promise.allSettled,
 * with a RESOLVE_INTER_BATCH_MS pause between batches to respect MusicBrainz's
 * rate limit. Within each batch the existing mbFetch rate limiter serialises
 * requests; network round-trips overlap, so response latency does not compound.
 *
 * Names with no MusicBrainz match are silently skipped — we never add stub
 * artists (they would have no MBID and break edge references).
 *
 * Individual lookup failures are swallowed so a single bad name doesn't
 * abort the whole graph build.
 */
async function resolveNamesToArtists(names: string[]): Promise<Artist[]> {
  const results: Artist[] = [];

  for (let i = 0; i < names.length; i += RESOLVE_BATCH_SIZE) {
    const batch = names.slice(i, i + RESOLVE_BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map(async (name) => {
        const artists = await searchArtists(name);
        if (artists.length === 0) return null;
        const a = artists[0];
        return { ...a, slug: generateSlug(a.name) };
      }),
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value !== null) {
        results.push(result.value);
      }
      // "rejected": swallow silently — same as original; one bad name must not
      // abort the entire graph build.
    }

    // Pause between batches so the next batch's first request does not collide
    // with the tail of this batch inside the rate-limit window.
    if (i + RESOLVE_BATCH_SIZE < names.length) {
      await sleep(RESOLVE_INTER_BATCH_MS);
    }
  }

  return results;
}

/**
 * Counts how many edges in the graph include the given artist MBID
 * as either source or target.
 */
function countEdgesForArtist(mbid: string, edges: InfluenceEdge[]): number {
  return edges.filter(
    (e) => e.sourceId === mbid || e.targetId === mbid,
  ).length;
}
