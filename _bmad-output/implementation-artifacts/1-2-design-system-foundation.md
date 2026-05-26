# Story 1.2: Design System Foundation

## Story

As a developer,
I want the design token system, layout shell, and global CSS established,
So that all subsequent components are styled consistently from the first pixel.

## Status

review

## Acceptance Criteria

**Given** `tailwind.config.ts` is configured with `theme.extend.colors`
**When** I inspect the file
**Then** all finalized tokens are present: `canvas: '#1a1814'`, `chrome: 'rgba(28,24,20,0.92)'`, `surface-elevated: 'rgba(38,34,28,0.96)'`, `text-primary: '#F3EDDD'`, `text-secondary: '#8a8470'`, `text-dim: '#52503f'`, `data-thin: '#EDC458'`, `focus-ring: '#F3EDDD'`
**And** genre-family colors: `honey-bee: '#EDC458'`, `killer-queen: '#E05E37'`, `purple-haze: '#9F76B6'`, `mr-blue-sky: '#ABCDBB'`, `tusk: '#D3CEB8'`

**Given** `src/app/layout.tsx` and `globals.css` are implemented
**When** I load the app at localhost:3000
**Then** the page background is `#1a1814` — no scrollbars, no white flash
**And** Geist font is loaded and applied throughout
**And** `QueryClientProvider` (TanStack Query) wraps the entire layout

**Given** the layout shell is full-bleed
**When** I resize the browser to any size
**Then** the canvas area remains `100vw × 100vh` with no padding, margin, or container

**Given** `src/lib/motion.ts` is implemented
**When** `prefersReducedMotion()` is called
**Then** it returns `true` when `(prefers-reduced-motion: reduce)` is active (Chrome DevTools emulation)
**And** returns `false` otherwise
**And** no D3 engine file calls `window.matchMedia` directly — all go through this utility

**Given** the `.touch-target` utility class is defined in `globals.css`
**When** applied to an element
**Then** it sets `min-height: 44px`, `min-width: 44px`, and uses flexbox centering

## Tasks / Subtasks

- [x] Task 1: Configure `tailwind.config.ts` with full design token palette
  - [x] 1.1 Create `tailwind.config.ts` at project root with `theme.extend.colors` containing all 13 tokens (canvas, chrome, surface-elevated, text-primary, text-secondary, text-dim, data-thin, focus-ring, honey-bee, killer-queen, purple-haze, mr-blue-sky, tusk)
  - [x] 1.2 Reference config in `globals.css` via `@config` directive so Tailwind v4 picks it up

- [x] Task 2: Rewrite `src/app/globals.css` — canvas shell + utilities
  - [x] 2.1 Remove default white/dark-mode background; set `#1a1814` as the fixed dark background
  - [x] 2.2 Ensure `html` and `body` are `height: 100%` and `overflow: hidden` (no scrollbars)
  - [x] 2.3 Wire Geist font variable to Tailwind's font-sans
  - [x] 2.4 Add `.touch-target` utility (min-height: 44px, min-width: 44px, flex, items-center, justify-center)

- [x] Task 3: Create `src/app/providers.tsx` — client-side QueryClientProvider
  - [x] 3.1 Mark as `"use client"`, create `QueryClient` with `useState`, export named `Providers` component

- [x] Task 4: Update `src/app/layout.tsx` — full-bleed dark shell
  - [x] 4.1 Update metadata: title "Dig — Follow the Thread", description "Explore music influence networks"
  - [x] 4.2 Apply canvas bg and text-primary on body; `h-full overflow-hidden`; full-bleed (no max-width, no padding)
  - [x] 4.3 Wrap children in `<Providers>` (QueryClientProvider)

- [x] Task 5: Create `src/lib/motion.ts` — `prefersReducedMotion()` utility
  - [x] 5.1 Implement function: guard for SSR (`typeof window === 'undefined'`), call `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  - [x] 5.2 Export as named export

- [x] Task 6: Create `src/lib/motion.test.ts` — unit tests
  - [x] 6.1 Test: returns `false` when media query does not match
  - [x] 6.2 Test: returns `true` when `prefers-reduced-motion: reduce` is active
  - [x] 6.3 Test: returns `false` in SSR environment (window undefined)

## Dev Notes

### Context from Architecture Doc

**Tailwind Version:** v4 — uses `@tailwindcss/postcss` plugin. CSS-first configuration via `@import "tailwindcss"` and `@theme {}` in globals.css. To use a JS config file (`tailwind.config.ts`) alongside CSS, add `@config "../../tailwind.config.ts"` in globals.css **before** the import statement.

**Design Token Reference (UX-DR3):**
- `canvas: '#1a1814'` — full-bleed SVG background
- `chrome: 'rgba(28,24,20,0.92)'` — frosted-glass nav bar
- `surface-elevated: 'rgba(38,34,28,0.96)'` — panels/cards
- `text-primary: '#F3EDDD'` — primary labels (White Rabbit)
- `text-secondary: '#8a8470'` — secondary/meta text
- `text-dim: '#52503f'` — empty state text
- `data-thin: '#EDC458'` — data-thin indicator amber
- `focus-ring: '#F3EDDD'` — focus ring color (50% opacity applied via Tailwind)

**Genre-family colors (UX-DR4):**
- `honey-bee: '#EDC458'` — Jazz/blues/soul & Folk/world
- `killer-queen: '#E05E37'` — Rock/punk/funk
- `purple-haze: '#9F76B6'` — Electronic/ambient
- `mr-blue-sky: '#ABCDBB'` — Hip-hop/R&B
- `tusk: '#D3CEB8'` — Classical/uncategorized + edge default

**Full-bleed layout requirement (UX-DR1, UX-DR2):**
- `100vw × 100vh` SVG is the world — no page padding, no container
- Chrome (TopNav, FilterPanel, NodeDetailPanel) floats over canvas via absolute/fixed positioning
- No scrollbars at body/html level — overflow: hidden

**QueryClientProvider pattern:**
```tsx
// src/app/providers.tsx
"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

**prefersReducedMotion() pattern:**
```ts
// src/lib/motion.ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
```
Used by all D3 engine files to branch between physics animation and instant transitions. Never call `window.matchMedia` directly in any graph engine file.

**touch-target utility (UX-DR17, NFR-5):**
All interactive chrome elements must have 44×44px minimum touch target. The `.touch-target` CSS class applies this. Use `@layer utilities {}` in globals.css to define it so Tailwind can tree-shake it.

**Geist font:** Already configured in layout.tsx (Story 1.1). CSS variable `--font-geist-sans` is set. Wire it to `--font-sans` via `@theme inline` in globals.css so `font-sans` Tailwind class resolves to Geist.

**Naming / export conventions:**
- `Providers` — named export from `src/app/providers.tsx`
- `prefersReducedMotion` — named export from `src/lib/motion.ts`
- `layout.tsx` uses default export (Next.js convention)

### Key Files Touched

| File | Action | Purpose |
|------|--------|---------|
| `tailwind.config.ts` | Create | Design token palette |
| `src/app/globals.css` | Modify | Canvas bg, touch-target utility, no white flash |
| `src/app/providers.tsx` | Create | Client QueryClientProvider |
| `src/app/layout.tsx` | Modify | Full-bleed shell, wrap with Providers |
| `src/lib/motion.ts` | Create | prefersReducedMotion() utility |
| `src/lib/motion.test.ts` | Create | Unit tests for motion utility |

## Dev Agent Record

### Implementation Plan

1. Create `tailwind.config.ts` → update `globals.css` with `@config` + canvas styles + `.touch-target`
2. Create `providers.tsx` → update `layout.tsx`
3. Create `motion.ts` + `motion.test.ts`
4. Run `npm run test:run` → all pass
5. Run `npm run lint` → zero errors
6. Run `npm run build` → succeeds

### Debug Log

**Tailwind v4 config note:** The project uses `@tailwindcss/postcss` (Tailwind v4 CSS-first). To satisfy the AC requiring `tailwind.config.ts`, used the `@config "../../tailwind.config.ts"` directive in `globals.css` placed before `@import "tailwindcss"`. This is the Tailwind v4 backwards-compat mechanism for loading a JS config alongside CSS-first setup. Build produces a Node.js module-type warning (cosmetic, not an error) — resolved at build time with no impact on output.

### Completion Notes

All 6 tasks and 13 subtasks completed. Implementation summary:

- **tailwind.config.ts** — 13 design tokens across layout, typography, signal, and genre-family categories. Content paths cover all source directories (`src/app`, `src/components`, `src/graph`, `src/hooks`, `src/store`).
- **globals.css** — Rewrote: `@config` loads JS tokens; `@import "tailwindcss"` provides all utilities; `@theme inline` wires Geist font variables; `html,body` fixed to `height:100%/overflow:hidden`; inline canvas bg guard prevents white flash before JS loads; `.touch-target` defined in `@layer utilities`.
- **providers.tsx** — Client component (`"use client"`); stable `QueryClient` via `useState` with `staleTime: 5min`; named export `Providers`.
- **layout.tsx** — Updated metadata; `body` uses `bg-canvas font-sans text-text-primary h-full overflow-hidden antialiased`; wraps children in `<Providers>`.
- **motion.ts** — `prefersReducedMotion()` with SSR guard; named export; JSDoc cross-references all D3 engine consumers.
- **motion.test.ts** — 4 tests: false match, true match, correct query string, SSR window-undefined fallback. All pass.

**Validation gates:**
- `npm run test:run` → 4/4 passing ✅
- `npm run lint` → 0 errors ✅
- `npm run build` → success ✅

## File List

- `tailwind.config.ts` (created)
- `src/app/globals.css` (modified)
- `src/app/providers.tsx` (created)
- `src/app/layout.tsx` (modified)
- `src/lib/motion.ts` (created)
- `src/lib/motion.test.ts` (created)
- `_bmad-output/implementation-artifacts/1-2-design-system-foundation.md` (created)

## Change Log

- 2026-05-26: Story 1.2 implemented — design token palette (tailwind.config.ts), full-bleed dark canvas shell (globals.css + layout.tsx), QueryClientProvider (providers.tsx), prefersReducedMotion() utility + 4 unit tests (motion.ts / motion.test.ts)