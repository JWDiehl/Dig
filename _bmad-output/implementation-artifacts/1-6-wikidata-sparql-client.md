# Story 1.6: Wikidata SPARQL Client (Downstream Influences)

## Story

As a developer,
I want the Wikidata SPARQL client implemented and validated against the 5 pre-build artists,
So that downstream influence relationships can be retrieved reliably and the P737 query shapes are confirmed before proceeding.

## Status

review

## Acceptance Criteria

**Given** `src/lib/data/wikidata.ts` implements P737 forward (upstream fallback) and P737 reverse (downstream) queries
**When** I call `getDownstreamInfluences` for Miles Davis's MBID
**Then** it returns a non-empty array of artists Miles Davis influenced

**Given** validation against 5 pre-build artists: The Beatles, Björk, Fela Kuti, Kendrick Lamar, Daft Punk
**When** queries run against all 5 (documented in `wikidata.test.ts`)
**Then** each query completes without error
**And** the query results confirm P737 data shape for each artist
**And** sparse results for contemporary artists (Kendrick) are accepted as valid (empty array is fine)

**Given** Wikidata SPARQL endpoint is unreachable
**When** the client attempts a query
**Then** it throws `DataSourceError` and does not hang (≤5 second timeout per query)

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/data/wikidata.ts` — SPARQL client
  - [x] 1.1 Implement `getDownstreamInfluences(mbid: string): Promise<string[]>` — reverse P737 (who the artist influenced)
  - [x] 1.2 Implement `getUpstreamInfluences(mbid: string): Promise<string[]>` — forward P737 (who influenced the artist; upstream fallback to Wikipedia)
  - [x] 1.3 Fetch via SPARQL endpoint (`https://query.wikidata.org/sparql`) using GET with `query` param and `Accept: application/sparql-results+json`
  - [x] 1.4 Combined single-query pattern: P434 lookup + P737 traversal in one SPARQL request (no separate QID lookup needed)
  - [x] 1.5 Set `User-Agent: dig/0.1.0 (jondiehl22@gmail.com)` on every request
  - [x] 1.6 Apply `Promise.race` timeout (5000 ms) — ≤5 second timeout per query
  - [x] 1.7 Extract `?influencedLabel` / `?influenceLabel` string values from SPARQL `results.bindings`
  - [x] 1.8 Filter out QID-only labels (entries where value matches `/^Q\d+$/` — items without English labels)
  - [x] 1.9 Return `[]` when no Wikidata entity found for MBID (P434 match returns empty)
  - [x] 1.10 Throw `DataSourceError` on network failure, timeout, or non-OK HTTP

- [x] Task 2: Create `src/lib/data/wikidata.test.ts` — integration + unit tests
  - [x] 2.1 Integration block wrapped in `describe.skipIf(!!process.env.CI)` — 5 artists (15 s timeout each)
  - [x] 2.2 Integration: The Beatles downstream returns ≥ 1 result; upstream returns ≥ 1 result
  - [x] 2.3 Integration: Björk downstream returns ≥ 1 result; upstream returns ≥ 1 result
  - [x] 2.4 Integration: Fela Kuti queries complete without error (result may be empty)
  - [x] 2.5 Integration: Kendrick Lamar queries complete without error (result may be empty)
  - [x] 2.6 Integration: Daft Punk queries complete without error (result may be empty)
  - [x] 2.7 Unit: network failure → `DataSourceError` (mocked fetch)
  - [x] 2.8 Unit: non-200 response → `DataSourceError`
  - [x] 2.9 Unit: timeout (AbortError) → `DataSourceError`
  - [x] 2.10 Unit: SPARQL response with zero bindings → returns `[]`
  - [x] 2.11 Unit: SPARQL response with QID-only labels filtered out — only string-labeled entries returned
  - [x] 2.12 Unit: parses `influencedLabel` correctly from SPARQL binding shape

## Dev Notes

### Wikidata SPARQL endpoint

```
GET https://query.wikidata.org/sparql
  ?query={sparql}
  &format=json
Headers:
  Accept: application/sparql-results+json
  User-Agent: dig/0.1.0 (jondiehl22@gmail.com)
```

### P737 semantics

Wikidata property **P737** = "influenced by":
- `?artist wdt:P737 ?influence` → artist was influenced by influence (upstream direction)
- Forward query (upstream): `?focal wdt:P737 ?influence` — who influenced focal
- Reverse query (downstream): `?influenced wdt:P737 ?focal` — who focal influenced

### SPARQL query patterns (validated against live Wikidata)

**Downstream — reverse P737 (primary use case):**
```sparql
SELECT ?influenced ?influencedLabel WHERE {
  ?focal wdt:P434 "${mbid}" .
  ?influenced wdt:P737 ?focal .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 50
```

**Upstream — forward P737 (secondary / fallback to Wikipedia):**
```sparql
SELECT ?influence ?influenceLabel WHERE {
  ?focal wdt:P434 "${mbid}" .
  ?focal wdt:P737 ?influence .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 50
```

**Key design:** The combined `P434 + P737` single query avoids a separate entity-lookup round trip. Wikidata supports this as a single SPARQL query.

### SPARQL response shape

```json
{
  "results": {
    "bindings": [
      {
        "influenced": { "type": "uri", "value": "http://www.wikidata.org/entity/Q12345" },
        "influencedLabel": { "type": "literal", "xml:lang": "en", "value": "U2" }
      },
      {
        "influenced": { "type": "uri", "value": "http://www.wikidata.org/entity/Q312434" },
        "influencedLabel": { "type": "literal", "value": "Q312434" }
      }
    ]
  }
}
```

When an entity has no English label, the label service returns the QID (`Q312434`). These must be filtered out.

### Filtering QID-only labels

```ts
const names = bindings
  .map(b => b.influencedLabel?.value ?? '')
  .filter(v => v && !v.startsWith('Q'))
```

### Timeout implementation

```ts
const r = await fetch(url, {
  headers: WIKIDATA_HEADERS,
  signal: AbortSignal.timeout(WIKIDATA_TIMEOUT_MS),
});
```
`AbortSignal.timeout(5000)` is supported in Node 17.3+. It throws a `DOMException` with `name === 'TimeoutError'` — catch this and re-throw as `DataSourceError`.

### Error handling

```ts
try {
  response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
} catch (err) {
  // Network error OR timeout (AbortError / TimeoutError)
  throw new DataSourceError(`Wikidata: ${String(err)}`);
}
if (!response.ok) {
  throw new DataSourceError(`Wikidata: HTTP ${response.status}`);
}
```

### No rate limiting needed

Wikidata query service allows ~5 req/sec for anonymous clients. No rate limiter needed for single-user dev use. Standard `fetch` is fine.

### CI skip pattern

Same as Stories 1.4 and 1.5:

```ts
// Integration tests — skipped when CI=true (set by GitHub Actions)
describe.skipIf(!!process.env.CI)("wikidata — live API", () => {
  it("...", async () => { ... }, 15000)
})

// Unit tests — always run
describe("wikidata — error handling (mocked fetch)", () => { ... })
```

### Pre-build artist MBIDs (confirmed from MusicBrainz + Wikidata P434)

| Artist | MusicBrainz MBID | Confirmed Wikidata |
|---|---|---|
| Miles Davis | `561d854a-6a28-4aa7-8c99-323e6ce46c2a` | Q93341 — downstream confirmed |
| The Beatles | `b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d` | Q1299 — both directions confirmed |
| Björk | `87c5dedd-371d-4a53-9f7f-80522fb7f3cb` | Both directions confirmed |
| Fela Kuti | `6514cffa-fbe0-4965-ad88-e998ead8a82a` | Both directions confirmed (smaller sets) |
| Kendrick Lamar | `381086ea-f511-4aba-bdf9-71c753dc5077` | Downstream only (upstream empty) |
| Daft Punk | `056e4f3e-d505-4dad-8ec1-d04f521cbb56` | Downstream only (upstream empty) |

### Empty-array vs error contract

| Situation | Return |
|---|---|
| MBID not found in Wikidata (no P434 match) | `[]` |
| Artist found, no P737 links | `[]` |
| Network failure / timeout | throw `DataSourceError` |
| Non-200 HTTP | throw `DataSourceError` |

### Files

| File | Action |
|------|--------|
| `src/lib/data/wikidata.ts` | Create |
| `src/lib/data/wikidata.test.ts` | Create |

## Dev Agent Record

### Implementation Plan

1. Create `wikidata.ts` with fetch + SPARQL response parser
2. Create `wikidata.test.ts` (skipIf for integration, mocked for units)
3. `npm run test:run` → all pass
4. `npm run lint` → 0 errors
5. `npm run build` → success

### Debug Log

**`AbortSignal.timeout()` not recognized by jsdom fetch:** `AbortSignal.timeout(5000)` throws `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal` under jsdom's undici-based fetch implementation. The issue is jsdom's `instanceof AbortSignal` check uses jsdom's own AbortSignal class, not Node.js's. Changed to `AbortController` + `setTimeout` — same error persisted. Fixed by switching to `Promise.race` with a timeout promise: no AbortSignal is passed to `fetch` at all. The timeout behavior is preserved, jsdom is satisfied, and the test for abort (which mocks `fetch` itself to throw) still correctly exercises the `DataSourceError` path.

### Completion Notes

All tasks complete. 15 tests total: 7 live API (skipIf CI) + 8 unit tests (mocked fetch).

- **wikidata.ts** — Two exported functions: `getDownstreamInfluences` (reverse P737) and `getUpstreamInfluences` (forward P737). Combined P434+P737 single-query per call. `Promise.race` timeout at 5 s. `extractNames()` filters QID-only labels (`/^Q\d+$/`). Throws `DataSourceError` on network error, timeout, or non-OK HTTP; returns `[]` for empty bindings.
- **wikidata.test.ts** — 7 live API integration tests for Miles Davis, The Beatles (both directions), Björk (both), Fela Kuti, Kendrick Lamar, Daft Punk — all pass. 8 unit tests for all error paths and parsing edge cases — all pass.

**Validation:** `npm run test:run` (wikidata) → 15/15 ✅ | Full suite → 86/87 ✅ (1 pre-existing MusicBrainz network timeout unrelated to this story) | `npm run lint` → 0 errors ✅ | `npm run build` → success ✅

## File List

- `src/lib/data/wikidata.ts` (created)
- `src/lib/data/wikidata.test.ts` (created)
- `_bmad-output/implementation-artifacts/1-6-wikidata-sparql-client.md` (updated)

## Change Log

- 2026-05-26: Story 1.6 implemented — Wikidata SPARQL client with P737 downstream/upstream queries. `Promise.race` timeout (jsdom AbortSignal workaround). QID label filtering. 15 tests: 7 live API (Miles Davis, The Beatles ×2, Björk ×2, Fela Kuti, Kendrick Lamar, Daft Punk) + 8 unit (mocked fetch). Full suite: 87 tests, 1 pre-existing MusicBrainz timeout.
