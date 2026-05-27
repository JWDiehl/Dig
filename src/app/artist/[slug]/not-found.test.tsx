/**
 * not-found smoke tests — Story 1.12
 *
 * Covers the /artist/[slug] not-found page:
 *   - renders "We couldn't find that artist." message
 *   - TopNav receives an onArtistSelect prop
 *   - selecting an artist calls router.push with /artist/[slug]
 *
 * Assertion pattern: uses not.toBeNull() matching existing project conventions.
 * @testing-library/jest-dom is NOT installed in this project.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotFound from "./not-found";
import type { Artist } from "@/lib/data/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Mock TopNav ──────────────────────────────────────────────────────────────
// Avoids cmdk setup. Captures the onArtistSelect prop for testing.

let capturedOnArtistSelect: ((artist: Artist) => void) | null = null;

vi.mock("@/components/nav/TopNav", () => ({
  TopNav: ({ onArtistSelect }: { onArtistSelect: (artist: Artist) => void }) => {
    capturedOnArtistSelect = onArtistSelect;
    return <div data-testid="mock-topnav" />;
  },
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

const mockArtist: Artist = {
  mbid: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
  slug: "radiohead",
  name: "Radiohead",
  genres: ["alternative rock"],
  era: "1990s",
  imageUrl: null,
  isDataThin: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnArtistSelect = null;
});

describe("NotFound (/artist/[slug]) — Story 1.12", () => {
  it("7.2 renders the 'We couldn't find that artist.' message", () => {
    render(<NotFound />);
    const msg = screen.queryByText(/We couldn.*t find that artist/i);
    expect(msg).not.toBeNull();
  });

  it("7.3 TopNav is rendered and receives an onArtistSelect prop", () => {
    render(<NotFound />);
    const nav = screen.getByTestId("mock-topnav");
    expect(nav).not.toBeNull();
    // capturedOnArtistSelect is set by the mock when TopNav renders
    expect(capturedOnArtistSelect).not.toBeNull();
    expect(typeof capturedOnArtistSelect).toBe("function");
  });

  it("7.4 selecting an artist calls router.push with /artist/[slug]", () => {
    render(<NotFound />);

    // Fire the captured onArtistSelect callback directly
    expect(capturedOnArtistSelect).not.toBeNull();
    capturedOnArtistSelect!(mockArtist);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/artist/radiohead");
  });

  it("7.5 renders 'Try searching above.' helper text", () => {
    render(<NotFound />);
    const helper = screen.queryByText(/Try searching above/i);
    expect(helper).not.toBeNull();
  });
});
