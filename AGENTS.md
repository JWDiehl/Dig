# Dig — Agent & Contributor Guide

This file is the authoritative reference for AI agents and contributors working in this codebase.

## Architecture Reference

Full architecture decisions are documented in:
`_bmad-output/planning-artifacts/architecture.md`

Full epic and story breakdown:
`_bmad-output/planning-artifacts/epics.md`

---

## Key Conventions (Non-Negotiable)

### Exports
- **Named exports only** for all components, hooks, utilities, and types.
- Default exports are reserved exclusively for Next.js route files: `page.tsx`, `layout.tsx`, `route.ts`, `not-found.tsx`, `error.tsx`.

### Data Fetching (TanStack Query v5)
- Always destructure `isPending` — **never use `isLoading`** (removed in TanStack Query v5).
- Always use `useQuery` destructuring, never consume the whole result object.
- `enabled: !!mbid` pattern for conditional fetches.

### Client State (Zustand)
- Single store: `useDigStore` from `src/store/index.ts`.
- **Always use selector pattern**: `const focalArtistId = useDigStore((state) => state.focalArtistId)`.
- Never destructure the whole store: ~~`const { focalArtistId } = useDigStore()`~~.

### TypeScript
- Use `null` for absent data fields — **never `undefined`**.
- All data shapes use `interface`, not `type` aliases.
- `Artist`, `InfluenceEdge`, `GraphData` are the canonical data contracts in `src/lib/data/types.ts`.

### Constants — Never Hardcode
- Animation/physics values → `src/graph/constants.ts` (e.g., `PIVOT_DURATION_MS`, `HOVER_DWELL_MS`).
- Data thresholds → `src/graph/constants.ts` (e.g., `DATA_THIN_THRESHOLD`).
- Era labels → `src/lib/data/constants.ts` (`ERA_EPOCH_LABELS`).
- Never write `700`, `500`, `0.13`, `3` etc. inline in `src/graph/` — always import the constant.

### Motion
- All `prefers-reduced-motion` checks go through `prefersReducedMotion()` from `src/lib/motion.ts`.
- **Never call `window.matchMedia` directly** in any D3 engine file or component.

### Tests
- **Co-located** with source files — no `__tests__/` directories.
- Named `[source].test.ts` or `[source].test.tsx`.
- Run: `npm run test:run`

### External API calls
- **All external API calls are server-side only** — never from the browser.
- Data flows through Next.js API routes: `/api/search`, `/api/graph/[mbid]`, `/api/graph/[mbid]/expand`, `/api/preview/[mbid]`.

### Unified API Response Shape
```ts
{ data: T }                        // full success
{ data: T; warnings: string[] }    // partial success
{ error: string; code: number }    // failure
```

### D3 / React DOM Boundary
- D3 owns all SVG DOM inside `<GraphCanvas>`.
- React renders only the `<svg>` mount point via `useRef`.
- **React never writes to SVG children after mount.**
- Filter changes flow: Zustand → `<GraphCanvas>` prop → D3 `applyFilters()` — zero React re-renders of the graph.

### Error Types
- `ArtistNotFoundError`, `DataSourceError`, `PartialDataError` — all in `src/lib/errors.ts`.
- Never use the words "unavailable", "failed", or "error" in user-facing copy.

### Slug Format
- Human-readable + MBID suffix on collision: e.g., `john-coltrane-a74b`.
- `generateSlug()` and `resolveSlug()` in `src/lib/data/slugs.ts`.

---

## Implementation Sequence

Stories must be implemented in this order — each story's output is a dependency of the next:

1. **Story 1.1** — Project scaffold (this story)
2. **Story 1.2** — Design system foundation (Tailwind tokens, layout shell, `prefersReducedMotion`)
3. **Story 1.3** — Data model types, graph constants, error types
4. **Story 1.4** — MusicBrainz client + slug utilities
5. **Story 1.5** — Wikipedia MediaWiki client (upstream influences)
6. **Story 1.6** — Wikidata SPARQL client (downstream influences)
7. **Story 1.7** — Graph builder + core API routes
8. **Story 1.8** — Zustand store + TanStack Query hooks
9. **Story 1.9** — D3 GraphCanvas rendering engine
10. **Story 1.10** — Zoom, pan, and pivot interactions
11. **Story 1.11** — Artist search input + top nav
12. **Story 1.12** — Landing page, artist route, not-found pages