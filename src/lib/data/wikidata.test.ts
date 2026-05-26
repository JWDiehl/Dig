/**
 * Wikidata SPARQL client tests.
 *
 * Two categories:
 *
 * 1. Integration tests — hit the live Wikidata query service.
 *    Wrapped in describe.skipIf(!!process.env.CI) so GitHub Actions skips them.
 *    Run locally with: npm run test:run
 *
 * 2. Unit tests — mock global.fetch for deterministic parsing and error paths.
 *    Always run (no CI guard).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getDownstreamInfluences, getUpstreamInfluences } from "./wikidata";
import { DataSourceError } from "../errors";

// ─── Integration tests (live Wikidata SPARQL) ─────────────────────────────────
// Skipped automatically when CI=true (set by GitHub Actions).

describe.skipIf(!!process.env.CI)("wikidata — live API", () => {
  // Pre-build artist MBIDs (confirmed from MusicBrainz + Wikidata P434)
  const ARTISTS = {
    miles: "561d854a-6a28-4aa7-8c99-323e6ce46c2a",
    beatles: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    bjork: "87c5dedd-371d-4a53-9f7f-80522fb7f3cb",
    felaKuti: "6514cffa-fbe0-4965-ad88-e998ead8a82a",
    kendrick: "381086ea-f511-4aba-bdf9-71c753dc5077",
    daftPunk: "056e4f3e-d505-4dad-8ec1-d04f521cbb56",
  };

  it(
    "Miles Davis downstream returns ≥ 1 influenced artist",
    async () => {
      const result = await getDownstreamInfluences(ARTISTS.miles);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      for (const name of result) {
        expect(typeof name).toBe("string");
        expect(name.trim().length).toBeGreaterThan(0);
      }
    },
    15000,
  );

  it(
    "The Beatles downstream returns ≥ 1 result",
    async () => {
      const result = await getDownstreamInfluences(ARTISTS.beatles);
      expect(result.length).toBeGreaterThanOrEqual(1);
    },
    15000,
  );

  it(
    "The Beatles upstream returns ≥ 1 result",
    async () => {
      const result = await getUpstreamInfluences(ARTISTS.beatles);
      expect(result.length).toBeGreaterThanOrEqual(1);
    },
    15000,
  );

  it(
    "Björk downstream and upstream queries complete without error",
    async () => {
      const [ds, us] = await Promise.all([
        getDownstreamInfluences(ARTISTS.bjork),
        getUpstreamInfluences(ARTISTS.bjork),
      ]);
      expect(Array.isArray(ds)).toBe(true);
      expect(Array.isArray(us)).toBe(true);
      // Both confirmed to return ≥ 1 result from Wikidata
      expect(ds.length).toBeGreaterThanOrEqual(1);
      expect(us.length).toBeGreaterThanOrEqual(1);
    },
    15000,
  );

  it(
    "Fela Kuti queries complete without error (sparse data is acceptable)",
    async () => {
      const [ds, us] = await Promise.all([
        getDownstreamInfluences(ARTISTS.felaKuti),
        getUpstreamInfluences(ARTISTS.felaKuti),
      ]);
      expect(Array.isArray(ds)).toBe(true);
      expect(Array.isArray(us)).toBe(true);
    },
    15000,
  );

  it(
    "Kendrick Lamar queries complete without error (contemporary artist, upstream may be empty)",
    async () => {
      const [ds, us] = await Promise.all([
        getDownstreamInfluences(ARTISTS.kendrick),
        getUpstreamInfluences(ARTISTS.kendrick),
      ]);
      expect(Array.isArray(ds)).toBe(true);
      expect(Array.isArray(us)).toBe(true);
      // upstream may be empty for contemporary artists — that's fine
    },
    15000,
  );

  it(
    "Daft Punk queries complete without error (contemporary artist, upstream may be empty)",
    async () => {
      const [ds, us] = await Promise.all([
        getDownstreamInfluences(ARTISTS.daftPunk),
        getUpstreamInfluences(ARTISTS.daftPunk),
      ]);
      expect(Array.isArray(ds)).toBe(true);
      expect(Array.isArray(us)).toBe(true);
    },
    15000,
  );
});

// ─── Unit tests: error handling (mocked fetch) ────────────────────────────────

describe("wikidata — error handling (mocked fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws DataSourceError when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(
      getDownstreamInfluences("test-mbid"),
    ).rejects.toBeInstanceOf(DataSourceError);
  });

  it("throws DataSourceError when the API returns a non-200 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 503, statusText: "Service Unavailable" }),
      ),
    );
    await expect(
      getDownstreamInfluences("test-mbid"),
    ).rejects.toBeInstanceOf(DataSourceError);
  });

  it("throws DataSourceError when fetch is aborted (timeout simulation)", async () => {
    vi.stubGlobal(
      "fetch",
      // AbortError is what AbortController.abort() throws; treated same as network error
      vi.fn().mockRejectedValue(new DOMException("signal timed out", "AbortError")),
    );
    await expect(
      getDownstreamInfluences("test-mbid"),
    ).rejects.toBeInstanceOf(DataSourceError);
  });

  it("returns empty array when SPARQL bindings are empty (artist not in Wikidata)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ results: { bindings: [] } }),
          { status: 200 },
        ),
      ),
    );
    const result = await getDownstreamInfluences("unknown-mbid");
    expect(result).toEqual([]);
  });

  it("filters out QID-only labels (entities without English labels)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              bindings: [
                {
                  influenced: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
                  influencedLabel: { type: "literal", "xml:lang": "en", value: "U2" },
                },
                {
                  influenced: { type: "uri", value: "http://www.wikidata.org/entity/Q312434" },
                  influencedLabel: { type: "literal", value: "Q312434" }, // QID-only — no English label
                },
                {
                  influenced: { type: "uri", value: "http://www.wikidata.org/entity/Q67890" },
                  influencedLabel: { type: "literal", "xml:lang": "en", value: "David Bowie" },
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await getDownstreamInfluences("test-mbid");
    expect(result).toContain("U2");
    expect(result).toContain("David Bowie");
    expect(result).not.toContain("Q312434"); // QID filtered out
    expect(result.length).toBe(2);
  });

  it("parses influenceLabel correctly for upstream results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              bindings: [
                {
                  influence: { type: "uri", value: "http://www.wikidata.org/entity/Q5765" },
                  influenceLabel: { type: "literal", "xml:lang": "en", value: "Elvis Presley" },
                },
                {
                  influence: { type: "uri", value: "http://www.wikidata.org/entity/Q392" },
                  influenceLabel: { type: "literal", "xml:lang": "en", value: "Chuck Berry" },
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await getUpstreamInfluences("test-mbid");
    expect(result).toContain("Elvis Presley");
    expect(result).toContain("Chuck Berry");
    expect(result.length).toBe(2);
  });

  it("getUpstreamInfluences also throws DataSourceError on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(
      getUpstreamInfluences("test-mbid"),
    ).rejects.toBeInstanceOf(DataSourceError);
  });

  it("trims whitespace from returned names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              bindings: [
                {
                  influenced: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
                  influencedLabel: { type: "literal", value: "  Radiohead  " },
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await getDownstreamInfluences("test-mbid");
    expect(result).toContain("Radiohead");
  });
});
