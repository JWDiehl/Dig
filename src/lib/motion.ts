/**
 * prefersReducedMotion()
 *
 * Returns `true` when the user has requested reduced motion via their
 * OS or browser accessibility settings.
 *
 * ## Usage in D3 engine files
 *
 * All `prefers-reduced-motion` checks MUST go through this utility.
 * Never call `window.matchMedia` directly in any graph engine file
 * (`simulation.ts`, `pivot.ts`, `expand.ts`, etc.) or React component.
 *
 * ```ts
 * import { prefersReducedMotion } from "@/lib/motion"
 *
 * if (prefersReducedMotion()) {
 *   // instant cross-fade — no drift animation
 * } else {
 *   // full physics settle
 * }
 * ```
 *
 * ## SSR safety
 *
 * Returns `false` in server environments (where `window` is undefined)
 * so Next.js Server Components and API Routes are unaffected.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns `true` when the viewport is mobile-width (< 768px).
 *
 * Used by the D3 engine to select mobile node radii and suppress
 * certain desktop-only interactions. Never call `window.innerWidth`
 * directly in graph engine files — always go through this utility.
 *
 * Returns `false` in SSR (desktop-first default).
 */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/**
 * Returns `true` when the viewport is desktop-width (≥ 1024px),
 * meaning the full hover model (NodeDetailPanel on dwell) is active.
 *
 * Tablet (768–1023px): hover states suppressed per UX-DR16.
 * Mobile (< 768px): two-tap model handles interaction (Story 3.2).
 *
 * Returns `true` in SSR (desktop-first default).
 */
export function isDesktopHoverEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 1024;
}