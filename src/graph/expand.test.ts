/**
 * expand.ts tests — Story 2.3
 *
 * Tests the network fetch layer for on-demand hop expansion.
 * fetch is mocked inline per test (same pattern as musicbrainz.test.ts).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchExpandData } from "./expand";
import type { Artist } from "@/lib/data/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ─── Fixture ──────────────────────────────────────────────────────────────────

const mockArtist: Artist = {
  mbid: "expand-artist-mbid",
  slug: "expand-artist",
  name: "Expand Artist",
  genres: ["rock"],
  era: "1980s",
  imageUrl: null,
  isDataThin: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fetchExpandData — Story 2.3", () => {
  it("returns artists and edges on OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ artists: [mockArtist], edges: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExpandData("test-mbid");

    expect(result.artists.length).toBe(1);
    expect(result.artists[0].mbid).toBe("expand-artist-mbid");
    expect(result.edges.length).toBe(0);
  });

  it("calls the correct endpoint URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ artists: [], edges: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchExpandData("specific-mbid-123");

    expect(mockFetch).toHaveBeenCalledWith("/api/graph/specific-mbid-123/expand");
  });

  it("returns empty arrays on non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExpandData("test-mbid");

    expect(result.artists.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it("returns empty arrays on fetch error (graceful degradation)", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExpandData("test-mbid");

    expect(result.artists.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it("handles missing artists/edges fields gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}), // no artists or edges keys
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExpandData("test-mbid");

    expect(result.artists).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
