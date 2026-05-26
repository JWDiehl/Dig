/**
 * useDigStore unit tests.
 *
 * Tests run against the Zustand store directly — no React hooks needed.
 * useDigStore.getState() reads current state synchronously.
 * useDigStore.setState() performs a partial merge (actions preserved).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useDigStore } from "./index";

// Initial state slice for resetting between tests.
// Actions are NOT included — they live in the store and are preserved by partial merge.
const initialState = {
  focalArtistId: null as string | null,
  filterEras: [] as string[],
  filterGenres: [] as string[],
  audioPreviewId: null as string | null,
};

beforeEach(() => {
  // Partial merge resets only state fields; actions remain intact.
  useDigStore.setState(initialState);
});

// ─── Initialization ───────────────────────────────────────────────────────────

describe("useDigStore — initialization", () => {
  it("initializes focalArtistId as null", () => {
    expect(useDigStore.getState().focalArtistId).toBeNull();
  });

  it("initializes filterEras as empty array", () => {
    expect(useDigStore.getState().filterEras).toEqual([]);
  });

  it("initializes filterGenres as empty array", () => {
    expect(useDigStore.getState().filterGenres).toEqual([]);
  });

  it("initializes audioPreviewId as null", () => {
    expect(useDigStore.getState().audioPreviewId).toBeNull();
  });
});

// ─── setFocalArtist ───────────────────────────────────────────────────────────

describe("useDigStore — setFocalArtist", () => {
  it("updates focalArtistId to the provided MBID", () => {
    useDigStore.getState().setFocalArtist("a74b1b7f-71a5-4011-9441-d0b5e4122711");
    expect(useDigStore.getState().focalArtistId).toBe(
      "a74b1b7f-71a5-4011-9441-d0b5e4122711",
    );
  });

  it("replaces an existing focalArtistId with a new one", () => {
    useDigStore.getState().setFocalArtist("first-mbid");
    useDigStore.getState().setFocalArtist("second-mbid");
    expect(useDigStore.getState().focalArtistId).toBe("second-mbid");
  });

  it("does not affect filterEras or filterGenres", () => {
    useDigStore.setState({ filterEras: ["1960s"], filterGenres: ["rock"] });
    useDigStore.getState().setFocalArtist("some-mbid");
    expect(useDigStore.getState().filterEras).toEqual(["1960s"]);
    expect(useDigStore.getState().filterGenres).toEqual(["rock"]);
  });
});

// ─── setFilters ───────────────────────────────────────────────────────────────

describe("useDigStore — setFilters", () => {
  it("sets both filterEras and filterGenres simultaneously", () => {
    useDigStore.getState().setFilters(["1960s", "1970s"], ["rock", "jazz"]);
    expect(useDigStore.getState().filterEras).toEqual(["1960s", "1970s"]);
    expect(useDigStore.getState().filterGenres).toEqual(["rock", "jazz"]);
  });

  it("clears both arrays when called with empty arrays", () => {
    useDigStore.setState({ filterEras: ["1960s"], filterGenres: ["rock"] });
    useDigStore.getState().setFilters([], []);
    expect(useDigStore.getState().filterEras).toEqual([]);
    expect(useDigStore.getState().filterGenres).toEqual([]);
  });

  it("does not affect focalArtistId or audioPreviewId", () => {
    useDigStore.setState({
      focalArtistId: "focal-mbid",
      audioPreviewId: "audio-mbid",
    });
    useDigStore.getState().setFilters(["1980s"], ["electronic"]);
    expect(useDigStore.getState().focalArtistId).toBe("focal-mbid");
    expect(useDigStore.getState().audioPreviewId).toBe("audio-mbid");
  });
});

// ─── setAudioPreview ──────────────────────────────────────────────────────────

describe("useDigStore — setAudioPreview", () => {
  it("sets audioPreviewId to the provided MBID", () => {
    useDigStore.getState().setAudioPreview("preview-mbid-xyz");
    expect(useDigStore.getState().audioPreviewId).toBe("preview-mbid-xyz");
  });

  it("clears audioPreviewId when called with null", () => {
    useDigStore.getState().setAudioPreview("preview-mbid-xyz");
    useDigStore.getState().setAudioPreview(null);
    expect(useDigStore.getState().audioPreviewId).toBeNull();
  });

  it("replaces an existing audioPreviewId with a new one", () => {
    useDigStore.getState().setAudioPreview("first-preview");
    useDigStore.getState().setAudioPreview("second-preview");
    expect(useDigStore.getState().audioPreviewId).toBe("second-preview");
  });
});
