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