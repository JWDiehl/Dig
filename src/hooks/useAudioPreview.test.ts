/**
 * useAudioPreview tests — Story 2.2
 *
 * Tests the TanStack Query hook that fetches Spotify preview URLs.
 * Follows the same fetch-mock pattern used by musicbrainz.test.ts:
 * create and stub vi.fn() inline per test, then unstub.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAudioPreview } from "./useAudioPreview";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useAudioPreview — Story 2.2", () => {
  it("returns previewUrl when API responds with a URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { previewUrl: "https://preview.example/track.mp3" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(
      () => useAudioPreview("test-mbid", "The Beatles"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.previewUrl).toBe("https://preview.example/track.mp3"));
  });

  it("returns null when API responds with previewUrl: null", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { previewUrl: null } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(
      () => useAudioPreview("test-mbid", "Unknown Artist"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => !result.current.isPending);
    expect(result.current.previewUrl).toBeNull();
  });

  it("returns null on fetch failure (graceful degradation)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(
      () => useAudioPreview("test-mbid", "Some Artist"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => !result.current.isPending);
    expect(result.current.previewUrl).toBeNull();
  });

  it("is disabled (isPending false, previewUrl null) when mbid is empty", () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(
      () => useAudioPreview("", "The Beatles"),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.previewUrl).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("is disabled when artistName is empty", () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(
      () => useAudioPreview("test-mbid", ""),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.previewUrl).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
