# Story 1.4: MusicBrainz Client & Slug Utilities

## Story

As a developer,
I want the MusicBrainz API client and slug generation/resolution utilities implemented and tested,
So that artist search and URL routing can reliably map between artist names and canonical MusicBrainz IDs.

## Status

review

## Acceptance Criteria

**Given** `src/lib/data/musicbrainz.ts` is implemented
**When** I call `searchArtists('radiohead')`
**Then** it returns an array including Radiohead with a valid MBID, `name`, `genres`, and `era`
**And** the call respects MusicBrainz's 1 req/sec rate limit via retry-with-backoff
**And** when MusicBrainz is unreachable, it throws `DataSourceError`

**Given** `generateSlug('The Beatles')` is called
**Then** it returns `'the-beatles'`
**When** I call `generateSlug('Björk')`
**Then** it returns `'bjork'` (unicode normalized to ASCII)
**When** two artists would produce the same base slug
**Then** `generateSlug` appends the first 4 chars of the MBID (e.g., `'john-coltrane-a74b'`)

**Given** `src/lib/data/slugs.test.ts` contains unit tests
**When** I run `npm run test:run`
**Then** all slug tests pass: basic slugification, unicode normalization, collision resolution, round-trip slug → MBID consistency

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/data/musicbrainz.ts` — rate-limited API client
  - [x] 1.1 Set `User-Agent: dig/0.1.0 (jondiehl22@gmail.com)` on all requests (required by MusicBrainz API)
  - [x] 1.2 Implement module-level rate limiter: ≥1100ms between requests (safely under 1 req/sec limit)
  - [x] 1.3 Implement retry-with-backoff for 429 and network failures (max 3 attempts, exponential backoff)
  - [x] 1.4 Implement `searchArtists(query: string): Promise<Artist[]>` — maps MB response to Artist interface
  - [x] 1.5 Extract `era` from `life-span.begin` as decade string (e.g. "1985" → "1980s")
  - [x] 1.6 Extract `genres` from MB tags, sorted by count desc
  - [x] 1.7 Set `imageUrl: null` (not available from search; fetched separately if needed)
  - [x] 1.8 Set `isDataThin: false` (computed by graph-builder, not search)
  - [x] 1.9 Throw `DataSourceError` on network failure or non-200 after retries

- [x] Task 2: Create `src/lib/data/musicbrainz.test.ts` — integration + unit tests
  - [x] 2.1 Integration test: `searchArtists('radiohead')` returns Radiohead with MBID (UUID format), name, genres array, era string (live API, 15s timeout)
  - [x] 2.2 Unit test: network failure throws DataSourceError (mocked fetch)
  - [x] 2.3 Unit test: empty query returns empty array without throwing

- [x] Task 3: Create `src/lib/data/slugs.ts` — generateSlug() and resolveSlug()
  - [x] 3.1 `generateSlug(name, mbid?)`: normalize unicode → ASCII, lowercase, hyphenate, trim; append first 4 MBID chars when provided
  - [x] 3.2 `resolveSlug(slug)`: parse slug → search query; detect 4-char hex suffix for collision-resolved slugs; call searchArtists; match to find correct MBID; throw ArtistNotFoundError if not found

- [x] Task 4: Create `src/lib/data/slugs.test.ts` — pure unit tests (no network)
  - [x] 4.1 `generateSlug('The Beatles')` → `'the-beatles'`
  - [x] 4.2 `generateSlug('Björk')` → `'bjork'` (diacritic stripped)
  - [x] 4.3 `generateSlug('John Coltrane', 'a74b1234-...')` → `'john-coltrane-a74b'` (collision suffix)
  - [x] 4.4 `generateSlug('AC/DC')` → `'ac-dc'` (special chars)
  - [x] 4.5 `generateSlug('Sigur Rós')` → `'sigur-ros'` (ó → o)
  - [x] 4.6 Round-trip: `resolveSlug('the-beatles')` with mocked searchArtists returns Beatles MBID
  - [x] 4.7 Round-trip: `resolveSlug('john-coltrane-a74b')` with mocked searchArtists returns Coltrane MBID
  - [x] 4.8 `resolveSlug('xxxxunknown')` throws ArtistNotFoundError when no match found

## Dev Notes

### Critical: User-Agent header

MusicBrainz API **requires** a User-Agent header on every request. Without it, requests are rejected (HTTP 403 or immediate rate limiting). Format:
```
User-Agent: dig/0.1.0 (jondiehl22@gmail.com)
```
This is NOT optional. Every fetch in musicbrainz.ts must include this header.

### Rate limiting implementation

Module-level timestamp tracker approach (simple, effective for single-process use):
```ts
let lastRequestTime = 0
const MB_MIN_INTERVAL_MS = 1100 // 10% safety margin over 1 req/sec

async function mbFetch(url: string): Promise<Response> {
  const elapsed = Date.now() - lastRequestTime
  if (lastRequestTime > 0 && elapsed < MB_MIN_INTERVAL_MS) {
    await delay(MB_MIN_INTERVAL_MS - elapsed)
  }
  lastRequestTime = Date.now()
  return fetch(url, { headers: MB_HEADERS })
}
```

### Retry-with-backoff pattern

```ts
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await mbFetch(url)
    if (res.status === 429) {
      await delay(1000 * (attempt + 1))
      continue
    }
    return res
  }
  throw new DataSourceError(`MusicBrainz: max retries exceeded for ${url}`)
}
```

### MusicBrainz API endpoint

```
GET https://musicbrainz.org/ws/2/artist/?query={name}&fmt=json&limit=10
```

Response shape (relevant fields):
```json
{
  "artists": [{
    "id": "a74b1b7f-71a5-4011-9441-d0b5e4122711",
    "name": "Radiohead",
    "tags": [{"name": "alternative rock", "count": 2}, ...],
    "life-span": { "begin": "1985", "ended": false }
  }]
}
```

### Era extraction

```ts
function extractEra(lifeSpan: { begin?: string } | null): string | null {
  const year = parseInt(lifeSpan?.begin ?? '', 10)
  if (isNaN(year)) return null
  return `${Math.floor(year / 10) * 10}s`
}
```

### generateSlug logic

```ts
export function generateSlug(name: string, mbid?: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')          // trim hyphens
  return mbid ? `${base}-${mbid.slice(0, 4)}` : base
}
```

### resolveSlug logic

1. Check if slug ends in a 4-char hex suffix (`/^(.+)-([0-9a-f]{4})$/`)
2. Extract name part; convert hyphens → spaces for search query
3. Call `searchArtists(query)`
4. For each result, call `generateSlug(artist.name)` or `generateSlug(artist.name, artist.mbid)` depending on suffix presence
5. Return mbid of first match; throw `ArtistNotFoundError(slug)` if none match

### Test strategy

- **slugs.test.ts**: Pure unit tests. Mock `./musicbrainz` module with `vi.mock`. No network calls.
- **musicbrainz.test.ts**: Mix of live integration tests (real API) + unit tests (mocked fetch).
  - Integration tests: 10s timeout, marked with comment "// integration — hits live MusicBrainz API"
  - Unit tests: mock `global.fetch` via `vi.stubGlobal('fetch', ...)`

### Files to create

| File | Type |
|------|------|
| `src/lib/data/musicbrainz.ts` | Create |
| `src/lib/data/musicbrainz.test.ts` | Create |
| `src/lib/data/slugs.ts` | Create |
| `src/lib/data/slugs.test.ts` | Create |

## Dev Agent Record

### Implementation Plan

1. musicbrainz.ts (rate limiter + retry + searchArtists)
2. slugs.ts (generateSlug + resolveSlug)
3. musicbrainz.test.ts (integration + error unit)
4. slugs.test.ts (pure unit, mocked)
5. npm run test:run → all pass
6. npm run lint → 0 errors
7. npm run build → success

### Debug Log

**Circular dependency resolved:** `musicbrainz.ts` originally imported `generateSlug` from `slugs.ts`, but `slugs.ts` must import `searchArtists` from `musicbrainz.ts`. Resolved by adding a private `toBaseSlug()` helper inside `musicbrainz.ts` for search-result slug generation. The public `generateSlug()` in `slugs.ts` remains the canonical API; the private helper is intentionally unexported.

**Vitest timeout API:** Integration tests initially used `{ timeout: 15000 }` as the third argument to `it()`, which is deprecated in Vitest 3. Fixed to use the second-argument position: `it('name', async () => {}, 15000)`.

**Live API results:** All 5 integration tests hit MusicBrainz successfully. Radiohead MBID confirmed (`a74b1b7f-71a5-4011-9441-d0b5e4122711`). Rate limiter worked correctly — 1100ms spacing respected between requests.

### Completion Notes

All 4 tasks and all subtasks complete. 49 tests total across 4 test files.

- **musicbrainz.ts** — `MB_USER_AGENT = "dig/0.1.0 (jondiehl22@gmail.com)"` set on every request via `MB_HEADERS`. Module-level `lastRequestTime` rate limiter enforces 1100ms minimum interval. `fetchWithRetry` handles 429 + network errors with up to 3 attempts and exponential backoff. `searchArtists` returns `Artist[]` with era extracted as decade string, genres sorted by count, imageUrl=null, isDataThin=false.
- **musicbrainz.test.ts** — 5 integration tests (live API, 15s timeout each) + 5 unit tests (mocked fetch). Covers: Radiohead MBID/name/genres/era, slug format validation, imageUrl/isDataThin defaults, DataSourceError on network failure / non-OK / bad JSON, User-Agent header assertion.
- **slugs.ts** — `generateSlug` NFD-normalizes, strips diacritics, lowercases, hyphenates, appends 4-char MBID suffix when provided. `resolveSlug` detects 4-char hex collision suffix, searches MusicBrainz, matches by regenerated slug, throws ArtistNotFoundError on no match.
- **slugs.test.ts** — 17 pure unit tests (vi.mock on musicbrainz module). Covers: basic slugification, Björk/Sigur Rós diacritic stripping, AC/DC special chars, Earth Wind & Fire run collapsing, ...-prefix trimming, collision suffix, round-trips for simple and collision slugs, no-match ArtistNotFoundError.

**Validation:** `npm run test:run` → 49/49 ✅ | `npm run lint` → 0 errors ✅ | `npm run build` → success ✅

## File List

- `src/lib/data/musicbrainz.ts` (created)
- `src/lib/data/musicbrainz.test.ts` (created)
- `src/lib/data/slugs.ts` (created)
- `src/lib/data/slugs.test.ts` (created)
- `_bmad-output/implementation-artifacts/1-4-musicbrainz-client-slug-utilities.md` (created)

## Change Log

- 2026-05-26: Story 1.4 implemented — MusicBrainz client (rate-limited, retry-with-backoff, required User-Agent header) and slug utilities (generateSlug with unicode normalisation + collision resolution, resolveSlug with MusicBrainz lookup). 49 tests: 17 slug unit tests + 10 MusicBrainz tests (5 live API, 5 mocked).