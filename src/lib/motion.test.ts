import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion, isMobileViewport, isDesktopHoverEnabled } from "./motion";

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

describe("isMobileViewport — Story 3.1", () => {
  it("returns false in SSR environment", () => {
    const original = global.window;
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete global.window;
    expect(isMobileViewport()).toBe(false);
    global.window = original;
  });

  it("returns true when innerWidth < 768", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    expect(isMobileViewport()).toBe(true);
  });

  it("returns false at exactly 768px (tablet breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 768 });
    expect(isMobileViewport()).toBe(false);
  });

  it("returns false at 1440px (desktop)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
    expect(isMobileViewport()).toBe(false);
  });
});

describe("isDesktopHoverEnabled — Story 3.1", () => {
  it("returns true in SSR environment (desktop-first default)", () => {
    const original = global.window;
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete global.window;
    expect(isDesktopHoverEnabled()).toBe(true);
    global.window = original;
  });

  it("returns false on mobile (375px)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    expect(isDesktopHoverEnabled()).toBe(false);
  });

  it("returns false at tablet width (768px)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 768 });
    expect(isDesktopHoverEnabled()).toBe(false);
  });

  it("returns false at 1023px (just below desktop threshold)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1023 });
    expect(isDesktopHoverEnabled()).toBe(false);
  });

  it("returns true at exactly 1024px (desktop breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
    expect(isDesktopHoverEnabled()).toBe(true);
  });

  it("returns true at 1440px (desktop)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1440 });
    expect(isDesktopHoverEnabled()).toBe(true);
  });
});