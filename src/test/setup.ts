import "@testing-library/react";

// ─── ResizeObserver polyfill ──────────────────────────────────────────────────
// JSDOM does not implement ResizeObserver. cmdk v1 (and other Radix primitives)
// use it internally. This stub satisfies their import without real layout tracking.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
