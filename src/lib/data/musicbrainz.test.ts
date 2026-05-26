/**
 * MusicBrainz client tests.
 *
 * Two categories:
 *
 * 1. Integration tests — hit the live MusicBrainz API.
 *    These are intentionally slow (network + 1 req/sec rate limit).
 *    Timeout passed as second argument per Vitest 3+ API.
 *
 * 2. Unit tests — mock global.fetch for error-path coverage.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { searchArtists } from "./musicbrainz";
import { DataSourceError } from "../errors";

// ─── Integration tests (live API) ────────────────────────────────────────────

describe("searchArtists — live MusicBrainz API", () => {
  it(
    'returns results for "radiohead" including Radiohead with a valid MBID',
    async () => {
      const results = await searchArtists("radiohead");

      expect(results.length).toBeGreaterThan(0);

      const radiohead = results.find((a) => a.name === "Radiohead");
      expect(radiohead).toBeDefined();

      // MBID must be a valid UUID (8-4-4-4-12 hex format)
      expect(radiohead!.mbid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      expect(radiohead!.name).toBe("Radiohead");
      expect(Array.isArray(radiohead!.genres)).toBe(true);

      if (radiohead!.era !== null) {
        expect(radiohead!.era).toMatch(/^\d{4}s$/);
      }
    },
    15000, // integration — allow up to 15 s for network + rate-limit delay
  );

  it(
    "returns an empty array for an empty query without throwing",
    async () => {
      const results = await searchArtists("");
      expect(results).toEqual([]);
    },
    15000,
  );

  it(
    "generates a valid slug on each result",
    async () => {
      const results = await searchArtists("miles davis");
      expect(results.length).toBeGreaterThan(0);
      for (const artist of results) {
        expect(typeof artist.slug).toBe("string");
        expect(artist.slug.length).toBeGreaterThan(0);
        expect(artist.slug).toMatch(/^[a-z0-9-]+$/);
      }
    },
    15000,
  );

  it(
    "sets imageUrl to null (images fetched separately via Cover Art Archive)",
    async () => {
      const results = await searchArtists("the beatles");
      expect(results.length).toBeGreaterThan(0);
      for (const artist of results) {
        expect(artist.imageUrl).toBeNull();
      }
    },
    15000,
  );

  it(
    "sets isDataThin to false (computed by graph-builder, not search)",
    async () => {
      const results = await searchArtists("bjork");
      expect(results.length).toBeGreaterThan(0);
      for (const artist of results) {
        expect(artist.isDataThin).toBe(false);
      }
    },
    15000,
  );
});

// ─── Unit tests (mocked fetch) ────────────────────────────────────────────────

describe("searchArtists — error handling (mocked fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws DataSourceError when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(searchArtists("radiohead")).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it("throws DataSourceError when the API returns a non-OK status after retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 500, statusText: "Internal Server Error" }),
      ),
    );

    await expect(searchArtists("radiohead")).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it("throws DataSourceError when the response body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(searchArtists("radiohead")).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it("returns an empty array when API responds with an empty artists list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ artists: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const results = await searchArtists("xyznotanartist");
    expect(results).toEqual([]);
  });

  it("includes the User-Agent header on every request", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artists: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await searchArtists("test");

    expect(mockFetch).toHaveBeenCalled();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("dig/0.1.0");
  });
});