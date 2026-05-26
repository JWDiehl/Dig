/**
 * Custom error classes for the Dig data layer.
 *
 * All three classes:
 * - Extend the native `Error` base class
 * - Set `this.name` to the class name (required for readable stack traces)
 * - Call `Object.setPrototypeOf` to fix `instanceof` checks in environments
 *   where TypeScript transpiles to ES5 (Next.js build target)
 *
 * Usage in API routes:
 *   catch (err) {
 *     if (err instanceof ArtistNotFoundError) → 404
 *     if (err instanceof DataSourceError)     → 503
 *     if (err instanceof PartialDataError)    → return with warnings[]
 *   }
 */

/**
 * Thrown when a slug or MBID cannot be resolved to a known artist.
 *
 * Used by: `resolveSlug()` in slugs.ts, graph-builder.ts, and the
 * `/artist/[slug]` page route handler.
 *
 * API route maps this to HTTP 404 + `{ error: "Artist not found", code: 404 }`.
 */
export class ArtistNotFoundError extends Error {
  constructor(slug: string) {
    super(`Artist not found: "${slug}"`);
    this.name = "ArtistNotFoundError";
    Object.setPrototypeOf(this, ArtistNotFoundError.prototype);
  }
}

/**
 * Thrown when ALL external data sources fail for a given request.
 *
 * Used by: Wikipedia client, Wikidata client, MusicBrainz client,
 * and graph-builder.ts (when every source is unavailable).
 *
 * API route maps this to HTTP 503 + `{ error: "Unable to reach data sources", code: 503 }`.
 *
 * Contrast with `PartialDataError`: DataSourceError = total failure.
 * PartialDataError = at least one source succeeded.
 */
export class DataSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceError";
    Object.setPrototypeOf(this, DataSourceError.prototype);
  }
}

/**
 * Thrown (or surfaced as `warnings[]`) when one or more data sources fail
 * but at least one succeeds, allowing a partial graph to be returned.
 *
 * Partial success is first-class in Dig — a graph with warnings is always
 * preferable to a 503 response. The graph-builder uses this to populate the
 * `warnings` field of `GraphData` rather than aborting the request.
 *
 * Per NFR-2: "Partial data is always preferable to a broken graph."
 */
export class PartialDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartialDataError";
    Object.setPrototypeOf(this, PartialDataError.prototype);
  }
}