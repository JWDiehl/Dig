# Dig

**Unearth the connections between artists.**

Dig is an interactive music influence explorer. Search for any artist and see a live force-directed graph of who shaped them and who they went on to shape — upstream influences on the left, downstream on the right. Click any node to pivot and follow the thread as far as it goes.

Live at → **[your-app.vercel.app]**

---

## What it does

- **Search** any artist with debounced autocomplete
- **Explore** a two-hop influence graph, force-directed and zoomable
- **Pivot** by clicking any node — the graph re-centers with a physics transition
- **Filter** by era and genre (coming in Epic 2)
- **Preview** 30-second audio clips on hover (coming in Epic 2)
- **Expand** individual nodes on demand for deeper connections (coming in Epic 2)
- **Share** any graph state via URL slug (e.g. `/artist/the-beatles`)

The landing page shows The Beatles' influence network loaded from static JSON — no API call, renders instantly. Every artist page is ISR-cached on Vercel after its first visit.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Graph engine | D3.js v7 — owns the SVG entirely; React never touches it after mount |
| Styling | Tailwind CSS v4 (dark-first, design tokens) |
| Components | Radix UI (cmdk search, HoverCard, Tooltip) |
| Client state | Zustand v5 |
| Data fetching | TanStack React Query v5 |
| Testing | Vitest v3 + React Testing Library |
| Deployment | Vercel (ISR edge caching) |

---

## Data sources

All external data is fetched server-side through Next.js API routes. No credentials reach the client.

| Source | Used for |
|---|---|
| [MusicBrainz](https://musicbrainz.org) | Artist metadata, genre, canonical IDs |
| [Wikipedia MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) | Upstream influence names (infobox parsing) |
| [Wikidata SPARQL](https://query.wikidata.org) | Downstream influences via P737 property |
| [Spotify Web API](https://developer.spotify.com) | 30-second audio preview URLs |

Influence data is merged from Wikipedia (primary) and Wikidata (supplement) with deduplication. If one source fails, the graph is returned with a `warnings[]` field — partial data with honest warnings is preferred over an error state.

---

## Getting started

```bash
# Install dependencies
npm install

# Run locally
npm run dev
```

No environment variables are required to run the core graph and search features. To enable Spotify audio previews, create a `.env.local`:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

Obtain credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### Regenerating the landing page data

The Beatles graph at `public/data/beatles.json` is pre-committed static data. To refresh it:

```bash
npm run generate:landing
```

This makes ~30 live MusicBrainz API calls and takes about 60 seconds due to the 1 req/sec rate limit.

---

## Architecture notes

### React / D3 boundary

D3 owns the SVG entirely. React renders a single `<svg>` mount point via `useRef`; D3 manages the force simulation, all node and edge DOM, and zoom behavior. React never updates SVG children after mount. This is the only pattern that achieves smooth 60fps graph physics without fighting React's reconciler.

### Partial-success API contract

Every graph API response is one of:

```
{ data: GraphData }                        // full success
{ data: GraphData, warnings: string[] }    // one or more sources failed
{ error: string, code: 404 | 503 }        // artist not found / total failure
```

A single source outage never blocks the graph — you always get whatever data was retrievable.

### ISR caching

| Route | Cache window |
|---|---|
| `/api/graph/[mbid]` | 1 hour |
| `/api/search` | 24 hours |
| `/artist/[slug]` | 1 hour |
| `/` (landing) | Static — no cache needed |

Each artist is slow exactly once. After the first visit, Vercel serves the cached response from the edge.

---

## Project status

Epic 1 (foundation) is complete. Active development is on Epic 2 (node interactions, audio previews, hop expansion) and Epic 3 (filters, mobile UX, accessibility).
