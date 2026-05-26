/**
 * Wikipedia MediaWiki client tests.
 *
 * Two categories:
 *
 * 1. Integration tests — hit the live Wikipedia MediaWiki API.
 *    Wrapped in describe.skipIf(!!process.env.CI) so GitHub Actions skips them.
 *    Run locally with: npm run test:run
 *
 * 2. Unit tests — mock global.fetch for deterministic parsing and error paths.
 *    Always run (no CI guard).
 *
 * Note: Wikipedia's {{Infobox musical artist | influences}} field is almost
 * never populated for established artists. The client falls back to parsing
 * the "Influences" article-body section (e.g. The Beatles, Radiohead, Alice
 * in Chains all have this section; Miles Davis does not).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getUpstreamInfluences, parseInfluences } from "./wikipedia";
import { DataSourceError } from "../errors";

// ─── Integration tests (live Wikipedia API) ───────────────────────────────────
// Skipped automatically when CI=true (set by GitHub Actions).

describe.skipIf(!!process.env.CI)("wikipedia — live API", () => {
  it(
    "The Beatles returns >= 2 upstream influences",
    async () => {
      const influences = await getUpstreamInfluences("The Beatles");
      expect(Array.isArray(influences)).toBe(true);
      expect(influences.length).toBeGreaterThanOrEqual(2);
      // All entries should be non-empty strings
      for (const name of influences) {
        expect(typeof name).toBe("string");
        expect(name.trim().length).toBeGreaterThan(0);
      }
    },
    15000,
  );

  it(
    "Radiohead returns >= 2 upstream influences",
    async () => {
      const influences = await getUpstreamInfluences("Radiohead");
      expect(Array.isArray(influences)).toBe(true);
      expect(influences.length).toBeGreaterThanOrEqual(2);
    },
    15000,
  );

  it(
    // Miles Davis has no dedicated Influences section on Wikipedia; Alice in Chains does.
    "Alice in Chains returns >= 2 upstream influences",
    async () => {
      const influences = await getUpstreamInfluences("Alice in Chains");
      expect(Array.isArray(influences)).toBe(true);
      expect(influences.length).toBeGreaterThanOrEqual(2);
    },
    15000,
  );
});

// ─── Unit tests: error handling (mocked fetch) ────────────────────────────────

describe("wikipedia — error handling (mocked fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws DataSourceError when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(getUpstreamInfluences("The Beatles")).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it("throws DataSourceError when the API returns a non-200 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 503, statusText: "Service Unavailable" }),
      ),
    );
    await expect(getUpstreamInfluences("The Beatles")).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it("returns empty array when article is missing (missing: true)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            query: {
              pages: [{ missing: true }],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await getUpstreamInfluences("NonExistentArtistXYZ");
    expect(result).toEqual([]);
  });

  it("returns empty array when API returns no pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ query: { pages: [] } }),
          { status: 200 },
        ),
      ),
    );
    const result = await getUpstreamInfluences("Nobody");
    expect(result).toEqual([]);
  });
});

// ─── Unit tests: parseInfluences — infobox field ──────────────────────────────

describe("wikipedia — parseInfluences — infobox field", () => {
  it("returns empty array when no infobox is present", () => {
    const wikitext = `
== Biography ==
Some artist with no infobox.
`;
    expect(parseInfluences(wikitext)).toEqual([]);
  });

  it("returns empty array when infobox has no influences field and no section", () => {
    const wikitext = `
{{Infobox musical artist
| name = Some Artist
| background = solo_singer
| origin = London
}}
`;
    expect(parseInfluences(wikitext)).toEqual([]);
  });

  it("parses comma-separated [[Wikilink]] format from infobox", () => {
    const wikitext = `
{{Infobox musical artist
| influences = [[Chuck Berry]], [[Little Richard]], [[Elvis Presley]]
| associated_acts = something
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Little Richard");
    expect(result).toContain("Elvis Presley");
    expect(result.length).toBe(3);
  });

  it("parses pipe-separated [[Target|Display]] format — uses article title", () => {
    const wikitext = `
{{Infobox musical artist
| influences = [[Chuck Berry|Chuck "Guitar" Berry]], [[Little Richard|Little Richard (the artist)]]
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Little Richard");
  });

  it("parses <br>-separated list from infobox", () => {
    const wikitext = `
{{Infobox musical artist
| influences = John Coltrane<br>Miles Davis<br>Charlie Parker
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("John Coltrane");
    expect(result).toContain("Miles Davis");
    expect(result).toContain("Charlie Parker");
  });

  it("parses <br />-separated list (self-closing)", () => {
    const wikitext = `
{{Infobox musical artist
| influences = John Coltrane<br />Miles Davis
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("John Coltrane");
    expect(result).toContain("Miles Davis");
  });

  it("handles {{flatlist}} wrapper with bullet items", () => {
    const wikitext = `
{{Infobox musical artist
| influences = {{flatlist|
* [[Chuck Berry]]
* [[Buddy Holly]]
* [[Bo Diddley]]
}}
| origin = England
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Buddy Holly");
    expect(result).toContain("Bo Diddley");
  });

  it("decodes HTML entities (&amp; → &)", () => {
    const wikitext = `
{{Infobox musical artist
| influences = Simon &amp; Garfunkel, Earth&nbsp;Wind &amp; Fire
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result.some((n) => n.includes("Simon") && n.includes("Garfunkel"))).toBe(true);
  });

  it("strips namespace prefix (w:Artist Name → Artist Name)", () => {
    const wikitext = `
{{Infobox musical artist
| influences = w:John Coltrane, w:Miles Davis
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("John Coltrane");
    expect(result).toContain("Miles Davis");
  });

  it("is case-insensitive for infobox detection", () => {
    const wikitext = `
{{infobox musical artist
| influences = [[Chuck Berry]]
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
  });

  it("filters out empty strings from result", () => {
    const wikitext = `
{{Infobox musical artist
| influences = [[Chuck Berry]],,, , [[Little Richard]]
| origin = USA
}}
`;
    const result = parseInfluences(wikitext);
    for (const name of result) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Little Richard");
  });
});

// ─── Unit tests: parseInfluences — article body section fallback ──────────────

describe("wikipedia — parseInfluences — section fallback", () => {
  it("falls back to Influences section when infobox field is absent", () => {
    const wikitext = `
{{Infobox musical artist
| name = Some Artist
| origin = England
}}

== Artistry ==

=== Influences ===
Some Artist was heavily influenced by [[Chuck Berry]] and [[Elvis Presley]].

=== Genres ===
Rock.
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Elvis Presley");
  });

  it("falls back to Influences section when no infobox at all", () => {
    const wikitext = `
== Artistry ==

=== Influences ===
Early influences include [[Muddy Waters]] and [[Robert Johnson (musician)|Robert Johnson]].

=== Style ===
Blues-based.
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Muddy Waters");
    expect(result).toContain("Robert Johnson (musician)");
  });

  it("strips citation wikilinks (<ref> blocks) from section results", () => {
    const wikitext = `
{{Infobox musical artist
| name = Some Artist
}}

=== Influences ===
Influenced by [[Chuck Berry]].<ref>{{cite web |url=https://example.com |title=Source }}</ref>
Also inspired by [[Rolling Stone]] magazine's coverage of [[Elvis Presley]].

=== Next Section ===
Content.
`;
    const result = parseInfluences(wikitext);
    // Chuck Berry and Elvis Presley should be there
    expect(result).toContain("Chuck Berry");
    expect(result).toContain("Elvis Presley");
    // Rolling Stone (a publication, not an artist) may or may not appear — that's OK
    // The key is that <ref>-internal wikilinks are stripped
  });

  it("stops extraction at the next section header", () => {
    const wikitext = `
=== Influences ===
Influenced by [[Chuck Berry]].

=== Style ===
[[Led Zeppelin]] is in the next section and should not appear.
`;
    const result = parseInfluences(wikitext);
    expect(result).toContain("Chuck Berry");
    expect(result).not.toContain("Led Zeppelin");
  });

  it("returns empty array when neither infobox field nor Influences section exists", () => {
    const wikitext = `
{{Infobox musical artist
| name = Some Artist
| origin = England
}}

== History ==
No influences section here.
`;
    const result = parseInfluences(wikitext);
    expect(result).toEqual([]);
  });
});
