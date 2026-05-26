/**
 * Unified data model — the canonical TypeScript contracts for Dig.
 *
 * Rule: use `interface` for all data shapes (not `type` aliases).
 * Rule: use `null` for fields that may explicitly be absent; never `undefined`.
 *
 * Every part of the system (API routes, D3 engine, React components) depends
 * on these types. Define them once here; import from "@/lib/data/types".
 */

/**
 * A musical artist as represented throughout the Dig data layer and graph engine.
 *
 * Fields sourced from MusicBrainz REST API; influence edges from Wikipedia + Wikidata.
 * `isDataThin` is computed server-side in graph-builder.ts and never re-derived on the client.
 */
export interface Artist {
  /** MusicBrainz canonical identifier — the authoritative key for all data operations. */
  mbid: string;

  /** Human-readable URL slug (e.g. "the-beatles", "john-coltrane-a74b"). */
  slug: string;

  /** Display name exactly as returned by MusicBrainz. */
  name: string;

  /** Genre tags from MusicBrainz. Empty array when no genre data is available. */
  genres: string[];

  /**
   * Active decade/era string (e.g. "1960s").
   * `null` when era is unknown or not available from MusicBrainz.
   */
  era: string | null;

  /**
   * URL to artist thumbnail image from MusicBrainz CDN.
   * `null` when no image is available — the graph renders a genre-colored placeholder.
   */
  imageUrl: string | null;

  /**
   * True when this artist has fewer than DATA_THIN_THRESHOLD influence relationships.
   * Computed once in graph-builder.ts; never re-computed on the client.
   * Drives the amber dot indicator on nodes and the graph-level DataThinBadge.
   */
  isDataThin: boolean;
}

/**
 * A directed influence relationship between two artists.
 *
 * `direction` is relative to the Focal Artist:
 * - `'upstream'`   → sourceId influenced targetId (roots; rendered left)
 * - `'downstream'` → sourceId was influenced by targetId (legacy; rendered right)
 *
 * `confidence` reflects the quality of the data source:
 * - `'high'`   → confirmed in multiple sources
 * - `'medium'` → single reliable source (Wikipedia or Wikidata)
 * - `'low'`    → inferred or low-signal source
 */
export interface InfluenceEdge {
  /** MBID of the source artist. */
  sourceId: string;

  /** MBID of the target artist. */
  targetId: string;

  /** Direction relative to the Focal Artist. */
  direction: "upstream" | "downstream";

  /** Data-source quality of this edge. */
  confidence: "high" | "medium" | "low";
}

/**
 * The complete influence graph for a Focal Artist, as returned by graph-builder.ts
 * and served from GET /api/graph/[mbid].
 *
 * `warnings` is the partial-success mechanism: when one or more data sources fail,
 * the graph is still returned with available data and `warnings` populated.
 * An empty `warnings` array means all sources succeeded.
 */
export interface GraphData {
  /** The artist at the center of the graph. */
  focalArtist: Artist;

  /** All artists in the graph, including the focal artist. */
  artists: Artist[];

  /** All influence edges in the graph. */
  edges: InfluenceEdge[];

  /**
   * Number of hops from the focal artist included in this graph.
   * Default is 2 for initial load; on-demand expansion adds beyond this.
   */
  depth: number;

  /**
   * Human-readable messages about degraded data sources.
   * Empty array on full success. Non-empty when partial data was returned
   * due to one or more source failures (maps to the DataThinBadge graph-notice variant).
   */
  warnings: string[];
}