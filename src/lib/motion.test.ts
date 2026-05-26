import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "./motion";

// Helper: stub window.matchMedia with a given `matches` value.
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("prefersReducedMotion", () => {
  it("returns false when the media query does not match", () => {
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when prefers-reduced-motion: reduce is active", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("calls window.matchMedia with the correct query string", () => {
    mockMatchMedia(false);
    prefersReducedMotion();
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  it("returns false in an SSR environment where window is undefined", () => {
    // Temporarily hide the global window object to simulate server-side rendering.
    const original = global.window;
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete global.window;

    expect(prefersReducedMotion()).toBe(false);

    // Restore window so subsequent tests are unaffected.
    global.window = original;
  });
});