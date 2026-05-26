/**
 * Slug utility tests — pure unit tests, no network calls.
 *
 * searchArtists is mocked so resolveSlug tests run instantly
 * without touching the MusicBrainz API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSlug, resolveSlug } from "./slugs";
import { ArtistNotFoundError } from "../errors";
import type { Artist } from "./types";

// ─── Mock MusicBrainz module ─────────────────────────────────────────────────

vi.mock("./musicbrainz", () => ({
  searchArtists: vi.fn(),
}));

import { searchArtists } from "./musicbrainz";
const mockSearchArtists = vi.mocked(searchArtists);

// ─── Test fixture helpers ─────────────────────────────────────────────────────

function makeArtist(overrides: Partial<Artist> & { mbid: string; name: string }): Artist {
  return {
    slug: generateSlug(overrides.name),
    genres: [],
    era: null,
    imageUrl: null,
    isDataThin: false,
    ...overrides,
  };
}

// ─── generateSlug ─────────────────────────────────────────────────────────────

describe("generateSlug", () => {
  it("lowercases and hyphenates a simple name", () => {
    expect(generateSlug("The Beatles")).toBe("the-beatles");
  });

  it("strips diacritics — Björk → bjork", () => {
    expect(generateSlug("Björk")).toBe("bjork");
  });

  it("strips diacritics — Sigur Rós → sigur-ros", () => {
    expect(generateSlug("Sigur Rós")).toBe("sigur-ros");
  });

  it("handles slash and special punctuation — AC/DC → ac-dc", () => {
    expect(generateSlug("AC/DC")).toBe("ac-dc");
  });

  it("handles ampersand — Simon & Garfunkel → simon-garfunkel", () => {
    expect(generateSlug("Simon & Garfunkel")).toBe("simon-garfunkel");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(generateSlug("Earth, Wind & Fire")).toBe("earth-wind-fire");
  });

  it("trims leading and trailing hyphens", () => {
    // Names that start/end with punctuation should not produce leading/trailing hyphens
    expect(generateSlug("...And You Will Know Us by the Trail of Dead")).toBe(
      "and-you-will-know-us-by-the-trail-of-dead",
    );
  });

  it("appends first 4 MBID chars when mbid is provided (collision resolution)", () => {
    expect(
      generateSlug("John Coltrane", "a74b1b7f-71a5-4011-9441-d0b5e4122711"),
    ).toBe("john-coltrane-a74b");
  });

  it("uses exactly the first 4 chars of the MBID, not more", () => {
    const slug = generateSlug("Test Artist", "abcd1234-xxxx");
    expect(slug).toBe("test-artist-abcd");
  });

  it("produces identical base slug without mbid", () => {
    expect(generateSlug("The Beatles")).toBe("the-beatles");
    expect(generateSlug("The Beatles", undefined)).toBe("the-beatles");
  });
});

// ─── resolveSlug ──────────────────────────────────────────────────────────────

describe("resolveSlug", () => {
  beforeEach(() => {
    mockSearchArtists.mockReset();
  });

  it("round-trip: resolves a simple slug back to the correct MBID", async () => {
    const beatlesMbid = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid: beatlesMbid, name: "The Beatles" }),
    ]);

    const mbid = await resolveSlug("the-beatles");
    expect(mbid).toBe(beatlesMbid);
  });

  it("round-trip: resolves a collision-suffixed slug back to the correct MBID", async () => {
    const coltraneMbid = "a74b1b7f-71a5-4011-9441-d0b5e4122711";
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid: coltraneMbid, name: "John Coltrane" }),
    ]);

    const mbid = await resolveSlug("john-coltrane-a74b");
    expect(mbid).toBe(coltraneMbid);
  });

  it("passes the name portion of the slug as the search query (hyphens → spaces)", async () => {
    const mbid = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid, name: "The Beatles" }),
    ]);

    await resolveSlug("the-beatles");
    expect(mockSearchArtists).toHaveBeenCalledWith("the beatles");
  });

  it("for a collision slug, strips the 4-char suffix before searching", async () => {
    const mbid = "a74b1b7f-71a5-4011-9441-d0b5e4122711";
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid, name: "John Coltrane" }),
    ]);

    await resolveSlug("john-coltrane-a74b");
    // Should search for "john coltrane", not "john coltrane a74b"
    expect(mockSearchArtists).toHaveBeenCalledWith("john coltrane");
  });

  it("throws ArtistNotFoundError when no search result matches the slug", async () => {
    mockSearchArtists.mockResolvedValue([]);

    await expect(resolveSlug("xxxxunknown")).rejects.toBeInstanceOf(
      ArtistNotFoundError,
    );
  });

  it("throws ArtistNotFoundError when results exist but none match the slug", async () => {
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid: "aaaa-bbbb", name: "Completely Different Artist" }),
    ]);

    await expect(resolveSlug("radiohead")).rejects.toBeInstanceOf(
      ArtistNotFoundError,
    );
  });

  it("picks the correct artist when multiple results are returned", async () => {
    const correctMbid = "a74b1b7f-71a5-4011-9441-d0b5e4122711";
    const otherMbid = "ffffffff-0000-0000-0000-000000000000";
    mockSearchArtists.mockResolvedValue([
      makeArtist({ mbid: otherMbid, name: "John Smith" }),
      makeArtist({ mbid: correctMbid, name: "Radiohead" }),
    ]);

    const mbid = await resolveSlug("radiohead");
    expect(mbid).toBe(correctMbid);
  });
});