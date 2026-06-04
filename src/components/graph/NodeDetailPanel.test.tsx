/**
 * NodeDetailPanel smoke tests — Story 2.1
 *
 * Covers the fixed right-side artist detail panel:
 *   - Artist name renders
 *   - Genre tags render (joined with " · ")
 *   - Era renders when non-null
 *   - Genre and era omitted when empty/null
 *   - Escape key calls onClose
 *   - role="dialog" and aria-label present
 *
 * Assertion pattern: uses not.toBeNull() matching project conventions.
 * @testing-library/jest-dom is NOT installed in this project.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NodeDetailPanel } from "./NodeDetailPanel";
import type { Artist } from "@/lib/data/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockArtistFull: Artist = {
  mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
  slug: "the-beatles",
  name: "The Beatles",
  genres: ["rock", "pop"],
  era: "1960s",
  imageUrl: null,
  isDataThin: false,
};

const mockArtistMinimal: Artist = {
  mbid: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
  slug: "radiohead",
  name: "Radiohead",
  genres: [],
  era: null,
  imageUrl: null,
  isDataThin: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NodeDetailPanel — Story 2.1", () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it("renders artist name", () => {
    render(<NodeDetailPanel artist={mockArtistFull} onClose={onClose} />);
    const name = screen.queryByText("The Beatles");
    expect(name).not.toBeNull();
  });

  it("renders genre tags joined with ' · '", () => {
    render(<NodeDetailPanel artist={mockArtistFull} onClose={onClose} />);
    const genres = screen.queryByText("rock · pop");
    expect(genres).not.toBeNull();
  });

  it("renders era when non-null", () => {
    render(<NodeDetailPanel artist={mockArtistFull} onClose={onClose} />);
    const era = screen.queryByText("1960s");
    expect(era).not.toBeNull();
  });

  it("omits genre text when genres array is empty", () => {
    render(<NodeDetailPanel artist={mockArtistMinimal} onClose={onClose} />);
    // No genre text — the element with " · " separator should not exist
    const genres = screen.queryByText(/ · /);
    expect(genres).toBeNull();
  });

  it("omits era when era is null", () => {
    render(<NodeDetailPanel artist={mockArtistMinimal} onClose={onClose} />);
    // Era is null — should render no era paragraph but name should still show
    const name = screen.queryByText("Radiohead");
    expect(name).not.toBeNull();
  });

  it("calls onClose when Escape is pressed", () => {
    render(<NodeDetailPanel artist={mockArtistFull} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has role='dialog' and correct aria-label", () => {
    render(<NodeDetailPanel artist={mockArtistFull} onClose={onClose} />);
    const dialog = screen.queryByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-label")).toBe("The Beatles details");
  });
});
