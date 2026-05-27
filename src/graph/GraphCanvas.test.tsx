/**
 * GraphCanvas.test.tsx — Integration tests for the D3 graph canvas.
 *
 * Strategy:
 *   - Mock @/lib/motion so prefersReducedMotion() returns true → instant positions,
 *     no physics animation → deterministic, synchronous rendering in JSDOM.
 *   - Use @testing-library/react render() + act() to flush useEffect hooks.
 *   - Verify SVG structure, aria attributes, and D3 node count.
 *
 * Note: JSDOM has limited SVG support (no layout, getBoundingClientRect returns 0).
 * Tests focus on DOM structure and ARIA — not pixel positions.
 */

import React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphCanvas } from "./GraphCanvas";
import type { GraphData } from "@/lib/data/types";

// ─── Mock: prefersReducedMotion → true (disables physics, instant positions) ──

vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: vi.fn().mockReturnValue(true),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const focalArtist = {
  mbid: "focal-123",
  slug: "the-beatles",
  name: "The Beatles",
  genres: ["rock", "pop"],
  era: "1960s",
  imageUrl: null,
  isDataThin: false,
};

const upstreamArtist = {
  mbid: "upstream-1",
  slug: "chuck-berry",
  name: "Chuck Berry",
  genres: ["rock"],
  era: "1950s",
  imageUrl: null,
  isDataThin: false,
};

const downstreamArtist = {
  mbid: "downstream-1",
  slug: "oasis",
  name: "Oasis",
  genres: ["rock"],
  era: "1990s",
  imageUrl: null,
  isDataThin: false,
};

const dataThinArtist = {
  mbid: "upstream-thin",
  slug: "obscure-artist",
  name: "Obscure Artist",
  genres: ["folk"],
  era: "1970s",
  imageUrl: null,
  isDataThin: true,
};

const mockGraphData: GraphData = {
  focalArtist,
  artists: [focalArtist, upstreamArtist, downstreamArtist],
  edges: [
    {
      sourceId: "upstream-1",
      targetId: "focal-123",
      direction: "upstream",
      confidence: "high",
    },
    {
      sourceId: "focal-123",
      targetId: "downstream-1",
      direction: "downstream",
      confidence: "medium",
    },
  ],
  depth: 1,
  warnings: [],
};

const defaultProps = {
  graphData: mockGraphData,
  filterEras: [],
  filterGenres: [],
  onPivot: vi.fn(),
  focalArtistName: "The Beatles",
  upstreamCount: 1,
  downstreamCount: 1,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GraphCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an SVG element with role='img'", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
  });

  it("SVG aria-label contains the focal artist name", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toContain("The Beatles");
  });

  it("SVG aria-label contains upstream and downstream counts", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const svg = container.querySelector("svg");
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label).toContain("1 influences");
    expect(label).toContain("1 influenced artists");
  });

  it("renders a node group for each artist in GraphData", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    // Each artist gets a <g role="button"> inside the SVG
    const nodeGroups = container.querySelectorAll('[role="button"]');
    expect(nodeGroups.length).toBe(mockGraphData.artists.length); // 3
  });

  it("focal node has an aria-label containing the artist name", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const focalNode = container.querySelector('[aria-label*="The Beatles"]');
    expect(focalNode).not.toBeNull();
  });

  it("upstream node has aria-label with 'upstream influence'", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const upstreamNode = container.querySelector('[aria-label*="Chuck Berry"]');
    expect(upstreamNode).not.toBeNull();
    expect(upstreamNode?.getAttribute("aria-label")).toContain("upstream influence");
  });

  it("downstream node has aria-label with 'downstream influence'", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const downstreamNode = container.querySelector('[aria-label*="Oasis"]');
    expect(downstreamNode).not.toBeNull();
    expect(downstreamNode?.getAttribute("aria-label")).toContain("downstream influence");
  });

  it("renders a loading aria-label when graphData is null", async () => {
    const { container } = render(
      <GraphCanvas {...defaultProps} graphData={null} focalArtistName="" />,
    );
    await act(async () => {});

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("Influence graph loading.");
  });

  it("renders an SVG with no node groups when graphData is null", async () => {
    const { container } = render(
      <GraphCanvas {...defaultProps} graphData={null} focalArtistName="" />,
    );
    await act(async () => {});

    const nodeGroups = container.querySelectorAll('[role="button"]');
    expect(nodeGroups.length).toBe(0);
  });

  it("renders a data-thin dot for isDataThin nodes", async () => {
    const graphWithThin: GraphData = {
      ...mockGraphData,
      artists: [focalArtist, dataThinArtist],
      edges: [
        {
          sourceId: "upstream-thin",
          targetId: "focal-123",
          direction: "upstream",
          confidence: "low",
        },
      ],
    };

    const { container } = render(
      <GraphCanvas
        {...defaultProps}
        graphData={graphWithThin}
        upstreamCount={1}
        downstreamCount={0}
      />,
    );
    await act(async () => {});

    const dataThinDot = container.querySelector(".data-thin-dot");
    expect(dataThinDot).not.toBeNull();
  });

  it("does not render data-thin dots for non-data-thin nodes", async () => {
    const { container } = render(<GraphCanvas {...defaultProps} />);
    await act(async () => {});

    const dataThinDots = container.querySelectorAll(".data-thin-dot");
    expect(dataThinDots.length).toBe(0); // none of the 3 artists have isDataThin: true
  });
});

// ─── genreColor unit tests ────────────────────────────────────────────────────

import { genreColor } from "./nodes";

describe("genreColor", () => {
  it("maps jazz to Honey Bee (#EDC458)", () => {
    expect(genreColor(["jazz"])).toBe("#EDC458");
  });

  it("maps rock to Killer Queen (#E05E37)", () => {
    expect(genreColor(["rock"])).toBe("#E05E37");
  });

  it("maps electronic to Purple Haze (#9F76B6)", () => {
    expect(genreColor(["electronic"])).toBe("#9F76B6");
  });

  it("maps hip-hop to Mr. Blue Sky (#ABCDBB)", () => {
    expect(genreColor(["hip-hop"])).toBe("#ABCDBB");
  });

  it("maps folk to Honey Bee (#EDC458)", () => {
    expect(genreColor(["folk"])).toBe("#EDC458");
  });

  it("falls back to Tusk (#D3CEB8) for unknown genres", () => {
    expect(genreColor(["classical", "orchestral"])).toBe("#D3CEB8");
  });

  it("falls back to Tusk (#D3CEB8) for empty array", () => {
    expect(genreColor([])).toBe("#D3CEB8");
  });

  it("uses first matching genre in a mixed array", () => {
    // hip-hop checked before jazz — should return Mr. Blue Sky
    expect(genreColor(["hip-hop", "jazz"])).toBe("#ABCDBB");
  });
});
