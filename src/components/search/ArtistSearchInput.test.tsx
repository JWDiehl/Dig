/**
 * ArtistSearchInput tests — Story 1.11
 *
 * Covers per AC 6:
 *   - idle state renders with correct placeholder
 *   - results appear on typing a query
 *   - no-results message when search returns empty array
 *   - Escape closes dropdown (clears query)
 *   - onSelect called with correct artist object on result click
 *
 * Assertion pattern: uses not.toBeNull() / toBeNull() matching existing project
 * conventions. @testing-library/jest-dom is not installed in this project.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArtistSearchInput } from "./ArtistSearchInput";

// ─── Mock useArtistSearch ─────────────────────────────────────────────────────
// Replace entirely — no TanStack Query provider needed in tests.

const mockUseArtistSearch = vi.fn();

vi.mock("@/hooks/useArtistSearch", () => ({
  useArtistSearch: (...args: unknown[]) => mockUseArtistSearch(...args),
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

const mockArtist = {
  mbid: "test-mbid-001",
  slug: "radiohead",
  name: "Radiohead",
  genres: ["alternative rock"],
  era: "1990s",
  imageUrl: null,
  isDataThin: false,
};

// ─── Default mock state ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty query, no results, not loading
  mockUseArtistSearch.mockReturnValue({ data: null, isPending: false });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Return the cmdk Command.Input element (renders as role="combobox"). */
function getInput(): HTMLElement {
  try {
    return screen.getByRole("combobox");
  } catch {
    return screen.getByPlaceholderText("Search any artist…");
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArtistSearchInput — Story 1.11", () => {
  it("5.2 idle state: renders the search input with correct placeholder", () => {
    render(<ArtistSearchInput onSelect={vi.fn()} />);

    // Input renders with the correct placeholder
    const input = screen.getByPlaceholderText("Search any artist…");
    expect(input).not.toBeNull();

    // Dropdown must not be visible when query is empty
    expect(screen.queryByText("Radiohead")).toBeNull();
  });

  it("5.3 results appear: typing a query shows matching artist names", () => {
    // Arrange: mock returns Radiohead when any query is active
    mockUseArtistSearch.mockReturnValue({
      data: { data: [mockArtist] },
      isPending: false,
    });

    render(<ArtistSearchInput onSelect={vi.fn()} />);

    // Act: type a query — isOpen becomes true, Command.List renders with results
    const input = getInput();
    fireEvent.change(input, { target: { value: "radio" } });

    // Assert: artist name is visible in the dropdown
    expect(screen.queryByText("Radiohead")).not.toBeNull();
    // Disambiguating detail (genre) also rendered
    expect(screen.queryByText("alternative rock")).not.toBeNull();
  });

  it("5.4 no-results: shows 'No artists found' message when search returns empty", () => {
    // Arrange: mock returns empty results (not loading)
    mockUseArtistSearch.mockReturnValue({
      data: { data: [] },
      isPending: false,
    });

    render(<ArtistSearchInput onSelect={vi.fn()} />);

    // Act: type a query to open the dropdown
    const input = getInput();
    fireEvent.change(input, { target: { value: "xyznotanartist" } });

    // Assert: no-results message appears
    const emptyMsg = screen.queryByText(/No artists found for/);
    expect(emptyMsg).not.toBeNull();
  });

  it("5.5 Escape closes dropdown: pressing Escape clears the input and hides results", () => {
    // Arrange: mock returns a result
    mockUseArtistSearch.mockReturnValue({
      data: { data: [mockArtist] },
      isPending: false,
    });

    render(<ArtistSearchInput onSelect={vi.fn()} />);
    const input = getInput();

    // Act: type to open dropdown, confirm result visible
    fireEvent.change(input, { target: { value: "radio" } });
    expect(screen.queryByText("Radiohead")).not.toBeNull();

    // Act: press Escape — onKeyDown handler calls setQuery("")
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    // Assert: input value cleared → isOpen false → dropdown gone
    expect((input as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Radiohead")).toBeNull();
  });

  it("5.6 onSelect: clicking a result calls onSelect with the correct artist object", () => {
    const onSelect = vi.fn();

    // Arrange: mock returns Radiohead
    mockUseArtistSearch.mockReturnValue({
      data: { data: [mockArtist] },
      isPending: false,
    });

    render(<ArtistSearchInput onSelect={onSelect} />);
    const input = getInput();

    // Act: type to open dropdown, then click the result item
    fireEvent.change(input, { target: { value: "radio" } });

    // Click the option item (cmdk renders Command.Item as role="option")
    const resultItems = screen.queryAllByRole("option");
    if (resultItems.length > 0) {
      fireEvent.click(resultItems[0]);
    } else {
      // Fallback: click the text directly (event bubbles to Command.Item)
      const nameEl = screen.queryByText("Radiohead");
      expect(nameEl).not.toBeNull();
      fireEvent.click(nameEl!);
    }

    // Assert: onSelect fired with correct artist (verify mbid)
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ mbid: "test-mbid-001" }),
    );
  });
});
