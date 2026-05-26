import { describe, it, expect } from "vitest";
import {
  ArtistNotFoundError,
  DataSourceError,
  PartialDataError,
} from "./errors";

// ─── ArtistNotFoundError ─────────────────────────────────────────────────────

describe("ArtistNotFoundError", () => {
  const err = new ArtistNotFoundError("test-slug");

  it("is an instance of Error", () => {
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of ArtistNotFoundError", () => {
    expect(err).toBeInstanceOf(ArtistNotFoundError);
  });

  it("has a descriptive message containing the slug", () => {
    expect(err.message).toContain("test-slug");
  });

  it("has name set to 'ArtistNotFoundError'", () => {
    expect(err.name).toBe("ArtistNotFoundError");
  });

  it("includes the slug in quotes in the message", () => {
    expect(err.message).toMatch(/"test-slug"/);
  });
});

// ─── DataSourceError ─────────────────────────────────────────────────────────

describe("DataSourceError", () => {
  const err = new DataSourceError("Unable to reach MusicBrainz API");

  it("is an instance of Error", () => {
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of DataSourceError", () => {
    expect(err).toBeInstanceOf(DataSourceError);
  });

  it("has a descriptive message", () => {
    expect(err.message).toBe("Unable to reach MusicBrainz API");
  });

  it("has name set to 'DataSourceError'", () => {
    expect(err.name).toBe("DataSourceError");
  });

  it("is NOT an instance of ArtistNotFoundError", () => {
    expect(err).not.toBeInstanceOf(ArtistNotFoundError);
  });
});

// ─── PartialDataError ────────────────────────────────────────────────────────

describe("PartialDataError", () => {
  const err = new PartialDataError("Wikipedia unavailable — using Wikidata only");

  it("is an instance of Error", () => {
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of PartialDataError", () => {
    expect(err).toBeInstanceOf(PartialDataError);
  });

  it("has a descriptive message", () => {
    expect(err.message).toBe("Wikipedia unavailable — using Wikidata only");
  });

  it("has name set to 'PartialDataError'", () => {
    expect(err.name).toBe("PartialDataError");
  });

  it("is NOT an instance of DataSourceError", () => {
    expect(err).not.toBeInstanceOf(DataSourceError);
  });
});

// ─── Cross-class instanceof isolation ────────────────────────────────────────

describe("Error class instanceof isolation", () => {
  it("ArtistNotFoundError is not a DataSourceError", () => {
    expect(new ArtistNotFoundError("x")).not.toBeInstanceOf(DataSourceError);
  });

  it("DataSourceError is not a PartialDataError", () => {
    expect(new DataSourceError("x")).not.toBeInstanceOf(PartialDataError);
  });

  it("PartialDataError is not an ArtistNotFoundError", () => {
    expect(new PartialDataError("x")).not.toBeInstanceOf(ArtistNotFoundError);
  });
});