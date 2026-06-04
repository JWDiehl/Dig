/**
 * AudioPreviewControl smoke tests — Story 2.2
 *
 * Covers:
 *   - Renders play button in idle state (before auto-play timer fires)
 *   - Play button has accessible aria-label
 *   - Waveform bars render
 *   - Does not auto-play immediately (timer not yet fired)
 *
 * Note: HTMLAudioElement is mocked globally. Auto-play timer uses fake timers.
 * Assertion pattern: not.toBeNull() — @testing-library/jest-dom NOT installed.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AudioPreviewControl } from "./AudioPreviewControl";

// ─── Mock Zustand store ───────────────────────────────────────────────────────

const mockSetAudioPreview = vi.fn();

vi.mock("@/store", () => ({
  useDigStore: (selector: (s: { audioPreviewId: string | null; setAudioPreview: typeof mockSetAudioPreview }) => unknown) =>
    selector({ audioPreviewId: null, setAudioPreview: mockSetAudioPreview }),
}));

// ─── Mock HTMLAudioElement ────────────────────────────────────────────────────

const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

const MockAudio = vi.fn().mockImplementation(() => ({
  play: mockPlay,
  pause: mockPause,
  volume: 0,
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AudioPreviewControl — Story 2.2", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("Audio", MockAudio);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders a play button in idle state", () => {
    render(
      <AudioPreviewControl previewUrl="https://preview.example/track.mp3" mbid="test-mbid" />,
      { wrapper: createWrapper() },
    );
    const btn = screen.queryByRole("button", { name: /play preview/i });
    expect(btn).not.toBeNull();
  });

  it("play button has aria-label 'Play preview' before playing", () => {
    render(
      <AudioPreviewControl previewUrl="https://preview.example/track.mp3" mbid="test-mbid" />,
      { wrapper: createWrapper() },
    );
    const btn = screen.queryByRole("button");
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("aria-label")).toBe("Play preview");
  });

  it("does not call audio.play() immediately on mount (before timer fires)", () => {
    render(
      <AudioPreviewControl previewUrl="https://preview.example/track.mp3" mbid="test-mbid" />,
      { wrapper: createWrapper() },
    );
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("calls audio.play() after HOVER_DWELL_MS timer fires", () => {
    render(
      <AudioPreviewControl previewUrl="https://preview.example/track.mp3" mbid="test-mbid" />,
      { wrapper: createWrapper() },
    );
    vi.runAllTimers();
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it("renders waveform bar elements", () => {
    render(
      <AudioPreviewControl previewUrl="https://preview.example/track.mp3" mbid="test-mbid" />,
      { wrapper: createWrapper() },
    );
    // The container for waveform bars is aria-hidden; check it exists via DOM
    const container = document.querySelector("[aria-hidden='true']");
    expect(container).not.toBeNull();
  });
});
