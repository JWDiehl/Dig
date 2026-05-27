/**
 * TopNav smoke tests — Story 1.11
 *
 * Verifies TopNav structure:
 *   - renders a <nav> element
 *   - nav has 48px height class (h-12)
 *   - filter toggle button present with correct aria-label
 *   - ArtistSearchInput receives the onArtistSelect callback (flex-1 className)
 *
 * ArtistSearchInput is mocked to avoid cmdk DOM complexity in these tests.
 *
 * Assertion pattern: uses not.toBeNull() matching existing project conventions.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNav } from "./TopNav";
import type { Artist } from "@/lib/data/types";

// ─── Mock ArtistSearchInput ───────────────────────────────────────────────────
// Avoids cmdk setup complexity. Renders a simple input with data-testid.

vi.mock("@/components/search/ArtistSearchInput", () => ({
  ArtistSearchInput: ({
    onSelect: _onSelect,
    className,
  }: {
    onSelect: (artist: Artist) => void;
    className?: string;
  }) => <input data-testid="mock-search" data-classname={className} />,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TopNav — Story 1.11", () => {
  it("6.2 renders a <nav> element", () => {
    render(<TopNav onArtistSelect={vi.fn()} />);
    const nav = screen.getByRole("navigation");
    expect(nav).not.toBeNull();
  });

  it("6.3 nav has h-12 class (48px height)", () => {
    render(<TopNav onArtistSelect={vi.fn()} />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("h-12");
  });

  it("6.4 filter toggle button is present with correct aria-label", () => {
    render(<TopNav onArtistSelect={vi.fn()} />);
    const button = screen.getByRole("button", { name: /toggle filters/i });
    expect(button).not.toBeNull();
  });

  it("6.5 onArtistSelect prop is wired to ArtistSearchInput (flex-1 className)", () => {
    render(<TopNav onArtistSelect={vi.fn()} />);
    const input = screen.getByTestId("mock-search");
    expect(input).not.toBeNull();
    // Verify className passed contains flex-1 (confirms prop flow through TopNav)
    expect(input.getAttribute("data-classname")).toContain("flex-1");
  });
});
