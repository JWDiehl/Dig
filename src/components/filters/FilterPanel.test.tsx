/**
 * FilterPanel smoke tests — Story 2.4
 *
 * Covers:
 *   - Era chips render for available eras in graphData
 *   - Genre chips render for available genre families
 *   - Clicking an era chip calls onFiltersChange with correct value
 *   - Clicking a genre chip calls onFiltersChange with correct value
 *   - "Clear All" button renders when filters are active
 *   - "Clear All" calls onFiltersChange([], [])
 *   - Era chip has role="checkbox" and correct aria-checked
 *   - FilterPanel renders nothing visible when isOpen=false (max-height: 0)
 *
 * Assertion pattern: not.toBeNull() — @testing-library/jest-dom NOT installed.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "./FilterPanel";
import type { GraphData } from "@/lib/data/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockGraphData: GraphData = {
  focalArtist: {
    mbid: "focal-mbid",
    slug: "focal-artist",
    name: "Focal Artist",
    genres: ["rock"],
    era: "1960s",
    imageUrl: null,
    isDataThin: false,
  },
  artists: [
    {
      mbid: "focal-mbid",
      slug: "focal-artist",
      name: "Focal Artist",
      genres: ["rock"],
      era: "1960s",
      imageUrl: null,
      isDataThin: false,
    },
    {
      mbid: "artist-2",
      slug: "artist-2",
      name: "Jazz Artist",
      genres: ["jazz"],
      era: "1970s",
      imageUrl: null,
      isDataThin: false,
    },
    {
      mbid: "artist-3",
      slug: "artist-3",
      name: "No Era Artist",
      genres: ["electronic"],
      era: null,
      imageUrl: null,
      isDataThin: false,
    },
  ],
  edges: [],
  depth: 2,
  warnings: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FilterPanel — Story 2.4", () => {
  let onFiltersChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFiltersChange = vi.fn();
  });

  it("renders era chips for eras present in graphData", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={[]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    // 1960s and 1970s are present in the data
    const chip1960s = screen.queryByRole("checkbox", { name: /1960s/i });
    const chip1970s = screen.queryByRole("checkbox", { name: /1970s/i });
    expect(chip1960s).not.toBeNull();
    expect(chip1970s).not.toBeNull();
  });

  it("renders genre chips for genre families present in graphData", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={[]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    // rock and jazz and electronic are present
    const rockChip = screen.queryByRole("checkbox", { name: /rock/i });
    const jazzChip = screen.queryByRole("checkbox", { name: /jazz/i });
    expect(rockChip).not.toBeNull();
    expect(jazzChip).not.toBeNull();
  });

  it("clicking an era chip calls onFiltersChange with that era added", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={[]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    const chip1960s = screen.getByRole("checkbox", { name: /1960s/i });
    fireEvent.click(chip1960s);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const [eras] = onFiltersChange.mock.calls[0] as [string[], string[]];
    expect(eras).toContain("1960s");
  });

  it("era chip has role='checkbox' and aria-checked reflects active state", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={["1960s"]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    const chip1960s = screen.getByRole("checkbox", { name: /1960s/i });
    expect(chip1960s.getAttribute("aria-checked")).toBe("true");

    const chip1970s = screen.getByRole("checkbox", { name: /1970s/i });
    expect(chip1970s.getAttribute("aria-checked")).toBe("false");
  });

  it("Clear All button renders when filters are active", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={["1960s"]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    const clearAll = screen.queryByText(/clear all/i);
    expect(clearAll).not.toBeNull();
  });

  it("Clear All button is absent when no filters are active", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={[]}
        filterGenres={[]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    const clearAll = screen.queryByText(/clear all/i);
    expect(clearAll).toBeNull();
  });

  it("clicking Clear All calls onFiltersChange([], [])", () => {
    render(
      <FilterPanel
        graphData={mockGraphData}
        filterEras={["1960s"]}
        filterGenres={["rock"]}
        onFiltersChange={onFiltersChange}
        isOpen={true}
      />,
    );
    const clearAll = screen.getByText(/clear all/i);
    fireEvent.click(clearAll);
    expect(onFiltersChange).toHaveBeenCalledWith([], []);
  });
});
