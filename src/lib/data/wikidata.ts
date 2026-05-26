/**
 * Wikidata SPARQL client.
 *
 * Uses Wikidata property P737 ("influenced by") to retrieve influence
 * relationships for a given artist, looked up by MusicBrainz ID (P434).
 *
 * Two exported functions:
 *
 *   getDownstreamInfluences(mbid) — reverse P737: artists the focal artist influenced
 *   getUpstreamInfluences(mbid)   — forward P737: artists that influenced the focal artist
 *                                   (upstream fallback when Wikipedia returns empty)
 *
 * Contract:
 *  - Artist not in Wikidata / no P737 links → returns []
 *  - Network failure, timeout, or non-OK HTTP → throws DataSourceError
 */

import { DataSourceError } from "../errors";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIDATA_USER_AGENT = "dig/0.1.0 (jondiehl22@gmail.com)";
const WIKIDATA_TIMEOUT_MS = 5000;
const WIKIDATA_HEADERS: Record<string, string> = {
  "User-Agent": WIKIDATA_USER_AGENT,
  Accept: "application/sparql-results+json",
};

// ─── SPARQL response types ────────────────────────────────────────────────────

interface SparqlBinding {
  [key: string]: { type: string; value: string; "xml:lang"?: string } | undefined;
}

interface SparqlResponse {
  results: {
    bindings: SparqlBinding[];
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns artists that the given artist influenced (reverse P737 — downstream).
 * Looks up the artist by MusicBrainz ID via Wikidata P434.
 *
 * @throws {DataSourceError} on network failure, timeout, or non-OK HTTP
 */
export async function getDownstreamInfluences(
  mbid: string,
): Promise<string[]> {
  const query = `
SELECT ?influenced ?influencedLabel WHERE {
  ?focal wdt:P434 "${mbid}" .
  ?influenced wdt:P737 ?focal .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 50
`.trim();

  const bindings = await executeSparql(query, mbid);
  return extractNames(bindings, "influencedLabel");
}

/**
 * Returns artists that influenced the given artist (forward P737 — upstream).
 * Used as a secondary upstream source when Wikipedia returns empty results.
 * Looks up the artist by MusicBrainz ID via Wikidata P434.
 *
 * @throws {DataSourceError} on network failure, timeout, or non-OK HTTP
 */
export async function getUpstreamInfluences(mbid: string): Promise<string[]> {
  const query = `
SELECT ?influence ?influenceLabel WHERE {
  ?focal wdt:P434 "${mbid}" .
  ?focal wdt:P737 ?influence .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 50
`.trim();

  const bindings = await executeSparql(query, mbid);
  return extractNames(bindings, "influenceLabel");
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function executeSparql(
  query: string,
  mbid: string,
): Promise<SparqlBinding[]> {
  const url =
    SPARQL_ENDPOINT +
    "?query=" +
    encodeURIComponent(query) +
    "&format=json";

  // Use Promise.race for timeout — avoids passing AbortSignal to fetch entirely,
  // which sidesteps jsdom's instanceof AbortSignal check in test environments.
  let response: Response;
  try {
    const fetchPromise = fetch(url, { headers: WIKIDATA_HEADERS });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new DataSourceError(`Wikidata: query timed out for MBID "${mbid}"`)),
        WIKIDATA_TIMEOUT_MS,
      ),
    );
    response = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof DataSourceError) throw err;
    throw new DataSourceError(
      `Wikidata: request failed for MBID "${mbid}": ${String(err)}`,
    );
  }

  if (!response.ok) {
    throw new DataSourceError(
      `Wikidata: HTTP ${response.status} ${response.statusText} for MBID "${mbid}"`,
    );
  }

  let data: SparqlResponse;
  try {
    data = (await response.json()) as SparqlResponse;
  } catch (err) {
    throw new DataSourceError(
      `Wikidata: invalid JSON response for MBID "${mbid}": ${String(err)}`,
    );
  }

  return data?.results?.bindings ?? [];
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Extracts artist name strings from SPARQL bindings.
 *
 * Filters out entries where the label is a bare QID (e.g. "Q312434") — these
 * are Wikidata entities that have no English label and are not useful as display
 * names.
 */
function extractNames(
  bindings: SparqlBinding[],
  labelKey: string,
): string[] {
  const names: string[] = [];

  for (const binding of bindings) {
    const labelEntry = binding[labelKey];
    if (!labelEntry) continue;

    const value = labelEntry.value.trim();
    // Skip QID-only labels (entities without English labels)
    if (!value || /^Q\d+$/.test(value)) continue;

    names.push(value);
  }

  return names;
}
