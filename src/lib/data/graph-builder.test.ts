/**
 * graph-builder.ts unit tests.
 *
 * All external dependencies are mocked — no live API calls.
 * Tests cover: successful assembly, partial failure, isDataThin, unknown artist,
 * all-sources-fail, edge directions, and upstream deduplication.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { DataSourceError, ArtistNotFoundError } from "../errors";

// vi.mock calls are hoisted — must appear before the import of the module under test
vi.mock("./musicbrainz", () => ({
  getArtistByMbid: vi.fn(),
  searchArtists: vi.fn(),
}));
vi.mock("./wikipedia", () => ({
  getUpstreamInfluences: vi.fn(),
}));
vi.mock("./wikidata", () => ({
  getUpstreamInfluences: vi.fn(),
  getDownstreamInfluences: vi.fn(),
}));
// slugs.ts uses searchArtists internally; mock it to avoid re-entrancy
vi.mock("./slugs", () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
  resolveSlug: vi.fn(),
}));

import { buildGraph } from "./graph-builder";
import { getArtistByMbid, searchArtists } from "./musicbrainz";
import { getUpstreamInfluences as getWikiUpstream } from "./wikipedia";
import {
  getUpstreamInfluences as getWikidataUpstream,
  getDownstreamInfluences,
} from "./wikidata";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FOCAL_MBID = "focal-mbid-1234";

const mockFocalArtist = {
  mbid: FOCAL_MBID,
  slug: "test-artist",
  name: "Test Artist",
  genres: ["rock"],
  era: "1990s",
  imageUrl: null,
  isDataThin: false,
};

const mockInfluenceArtistA = {
  mbid: "influence-mbid-aaaa",
  slug: "influence-artist-a",
  name: "Influence Artist A",
  genres: [],
  era: null,
  imageUrl: null,
  isDataThin: false,
};

const mockInfluenceArtistB = {
  mbid: "influence-mbid-bbbb",
  slug: "influenced-artist-b",
  name: "Influenced Artist B",
  genres: [],
  era: null,
  imageUrl: null,
  isDataThin: false,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  // Default: focal artist found
  vi.mocked(getArtistByMbid).mockResolvedValue(mockFocalArtist);

  // Default: all sources return empty — individual tests override as needed
  vi.mocked(getWikiUpstream).mockResolvedValue([]);
  vi.mocked(getWikidataUpstream).mockResolvedValue([]);
  vi.mocked(getDownstreamInfluences).mockResolvedValue([]);

  // Default: searchArtists returns empty — individual tests override
  vi.mocked(searchArtists).mockResolvedValue([]);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildGraph — successful assembly", () => {
  it("returns GraphData with populated artists[] and edges[] on full success", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(getDownstreamInfluences).mockResolvedValue(["Influenced Artist B"]);
    vi.mocked(searchArtists)
      .mockResolvedValueOnce([mockInfluenceArtistA])
      .mockResolvedValueOnce([mockInfluenceArtistB]);

    const result = await buildGraph(FOCAL_MBID, 2);

    expect(result.focalArtist.mbid).toBe(FOCAL_MBID);
    expect(result.artists.length).toBeGreaterThanOrEqual(3); // focal + 2 influences
    expect(result.edges.length).toBe(2);
    expect(result.warnings).toEqual([]);
    expect(result.depth).toBe(2);
  });

  it("includes focal artist in the artists[] array", async () => {
    const result = await buildGraph(FOCAL_MBID, 2);
    const found = result.artists.find((a) => a.mbid === FOCAL_MBID);
    expect(found).toBeDefined();
  });

  it("stores the depth parameter in GraphData", async () => {
    const result = await buildGraph(FOCAL_MBID, 3);
    expect(result.depth).toBe(3);
  });
});

describe("buildGraph — partial failure with warnings", () => {
  it("returns graph + warning when Wikipedia fails but Wikidata succeeds", async () => {
    vi.mocked(getWikiUpstream).mockRejectedValue(new DataSourceError("Wikipedia down"));
    vi.mocked(getWikidataUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w) => w.toLowerCase().includes("wikipedia"))).toBe(true);
    expect(result.artists.length).toBeGreaterThan(1); // still got data from Wikidata
  });

  it("returns graph + warning when Wikidata downstream fails but upstream succeeds", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(getDownstreamInfluences).mockRejectedValue(new DataSourceError("Wikidata down"));
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    expect(result.warnings.some((w) => w.toLowerCase().includes("wikidata downstream"))).toBe(true);
    expect(result.focalArtist.mbid).toBe(FOCAL_MBID);
  });

  it("returns graph with warnings when all influence sources fail individually but not collectively", async () => {
    // Only downstream succeeds — wiki and wikidata-upstream fail
    vi.mocked(getWikiUpstream).mockRejectedValue(new DataSourceError("wiki down"));
    vi.mocked(getWikidataUpstream).mockRejectedValue(new DataSourceError("wikidata up down"));
    vi.mocked(getDownstreamInfluences).mockResolvedValue(["Influenced Artist B"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistB]);

    const result = await buildGraph(FOCAL_MBID, 2);

    expect(result.warnings.length).toBe(2); // wiki + wikidata-upstream
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildGraph — all sources fail", () => {
  it("throws DataSourceError when all three influence sources reject", async () => {
    vi.mocked(getWikiUpstream).mockRejectedValue(new DataSourceError("wiki down"));
    vi.mocked(getWikidataUpstream).mockRejectedValue(new DataSourceError("wikidata up down"));
    vi.mocked(getDownstreamInfluences).mockRejectedValue(new DataSourceError("wikidata down down"));

    await expect(buildGraph(FOCAL_MBID, 2)).rejects.toBeInstanceOf(DataSourceError);
  });
});

describe("buildGraph — unknown artist", () => {
  it("rethrows ArtistNotFoundError when getArtistByMbid throws it", async () => {
    vi.mocked(getArtistByMbid).mockRejectedValue(
      new ArtistNotFoundError(FOCAL_MBID),
    );

    await expect(buildGraph(FOCAL_MBID, 2)).rejects.toBeInstanceOf(
      ArtistNotFoundError,
    );
  });

  it("wraps non-ArtistNotFoundError from getArtistByMbid in DataSourceError", async () => {
    vi.mocked(getArtistByMbid).mockRejectedValue(new Error("network blip"));

    await expect(buildGraph(FOCAL_MBID, 2)).rejects.toBeInstanceOf(DataSourceError);
  });
});

describe("buildGraph — isDataThin computation", () => {
  it("sets isDataThin: true for an artist with 0 edges", async () => {
    // No influences returned → focal artist has 0 edges → isDataThin
    const result = await buildGraph(FOCAL_MBID, 2);

    const focal = result.artists.find((a) => a.mbid === FOCAL_MBID);
    expect(focal?.isDataThin).toBe(true);
  });

  it("sets isDataThin: false for an artist with >= DATA_THIN_THRESHOLD edges", async () => {
    // Give focal 3 upstream influences → 3 edges → not data-thin
    vi.mocked(getWikiUpstream).mockResolvedValue([
      "Influence A",
      "Influence B",
      "Influence C",
    ]);
    vi.mocked(searchArtists)
      .mockResolvedValueOnce([{ ...mockInfluenceArtistA, mbid: "mbid-a", name: "Influence A" }])
      .mockResolvedValueOnce([{ ...mockInfluenceArtistA, mbid: "mbid-b", name: "Influence B" }])
      .mockResolvedValueOnce([{ ...mockInfluenceArtistA, mbid: "mbid-c", name: "Influence C" }]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const focal = result.artists.find((a) => a.mbid === FOCAL_MBID);
    expect(focal?.isDataThin).toBe(false); // 3 edges = DATA_THIN_THRESHOLD, not thin
  });

  it("sets isDataThin: true for an influence artist with only 1 edge", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const influenceArtist = result.artists.find(
      (a) => a.mbid === mockInfluenceArtistA.mbid,
    );
    // Has 1 edge (sourceId → FOCAL_MBID) → 1 < 3 → isDataThin
    expect(influenceArtist?.isDataThin).toBe(true);
  });
});

describe("buildGraph — edge directions", () => {
  it("upstream edges have direction: 'upstream' and correct sourceId/targetId", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const upstreamEdges = result.edges.filter((e) => e.direction === "upstream");
    expect(upstreamEdges.length).toBe(1);
    expect(upstreamEdges[0].sourceId).toBe(mockInfluenceArtistA.mbid);
    expect(upstreamEdges[0].targetId).toBe(FOCAL_MBID);
  });

  it("downstream edges have direction: 'downstream' and correct sourceId/targetId", async () => {
    vi.mocked(getDownstreamInfluences).mockResolvedValue(["Influenced Artist B"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistB]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const downstreamEdges = result.edges.filter((e) => e.direction === "downstream");
    expect(downstreamEdges.length).toBe(1);
    expect(downstreamEdges[0].sourceId).toBe(FOCAL_MBID);
    expect(downstreamEdges[0].targetId).toBe(mockInfluenceArtistB.mbid);
  });
});

describe("buildGraph — upstream deduplication", () => {
  it("deduplicates upstream names appearing in both Wikipedia and Wikidata", async () => {
    // Both sources return "Influence Artist A"; Wikidata also adds "Influence Artist B"
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(getWikidataUpstream).mockResolvedValue([
      "Influence Artist A",
      "Influence Artist B",
    ]);
    vi.mocked(searchArtists)
      .mockResolvedValueOnce([mockInfluenceArtistA])  // "Influence Artist A"
      .mockResolvedValueOnce([mockInfluenceArtistB]); // "Influence Artist B"

    const result = await buildGraph(FOCAL_MBID, 2);

    // Only 2 upstream artists (not 3): deduplication removed the duplicate
    const upstreamEdges = result.edges.filter((e) => e.direction === "upstream");
    expect(upstreamEdges.length).toBe(2);

    // searchArtists should be called exactly twice (2 unique names)
    expect(vi.mocked(searchArtists)).toHaveBeenCalledTimes(2);
  });

  it("assigns 'high' confidence when name appears in both Wikipedia AND Wikidata upstream", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(getWikidataUpstream).mockResolvedValue(["Influence Artist A"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const edge = result.edges.find(
      (e) => e.sourceId === mockInfluenceArtistA.mbid,
    );
    expect(edge?.confidence).toBe("high");
  });

  it("assigns 'medium' confidence for single-source upstream artists", async () => {
    vi.mocked(getWikiUpstream).mockResolvedValue(["Influence Artist A"]);
    // Wikidata upstream returns something else — no overlap
    vi.mocked(getWikidataUpstream).mockResolvedValue(["Some Other Artist"]);
    vi.mocked(searchArtists).mockResolvedValue([mockInfluenceArtistA]);

    const result = await buildGraph(FOCAL_MBID, 2);

    const edge = result.edges.find(
      (e) => e.sourceId === mockInfluenceArtistA.mbid,
    );
    expect(edge?.confidence).toBe("medium");
  });
});
