# Addendum — Dig PRD

*Content that belongs in a downstream document (architecture, solution design) or earned a place but does not fit the PRD's main narrative.*

---

## Data Source Architecture

*This belongs in the architecture / solution design document. Captured here from the product brief to preserve fidelity.*

### Corrected Source Hierarchy

Pre-build sampling across five major artists (Beatles, Björk, Fela Kuti, Kendrick Lamar, Daft Punk) confirmed that the original assumption — MusicBrainz as primary influence source — is wrong. MusicBrainz artist relationship data returned zero influence edges for all five artists.

**Upstream ("who influenced this artist"):**
1. **Primary:** Wikipedia infobox API — parse the `influences` field from the artist's MediaWiki article
2. **Secondary:** Wikidata P737 SPARQL query

**Downstream ("who did this artist influence"):**
1. **Primary:** Wikidata SPARQL reverse query — find all artists where P737 = target artist
2. **Secondary:** Wikipedia text parsing (lower confidence, harder to structure)

**Artist metadata (names, genres, dates, images):**
- MusicBrainz remains in the stack for canonical IDs, birth/death dates, genre tags, and discography — not for influence edges.

### Coverage Expectations

| Tier | Examples | Expected coverage |
|---|---|---|
| Classic canon | Beatles, Bowie, Miles Davis, Led Zeppelin | Rich — Wikipedia and Wikidata both populated |
| Major contemporary | Kendrick, Radiohead, Daft Punk, Björk | Good — Wikipedia infobox typically 10–25 influences |
| Obscure / non-Western | Mid-tier artists outside English-language canon | Sparse — acceptable for v1 |

### Sampling Results (pre-build validation)

| Source | Upstream coverage | Downstream coverage |
|---|---|---|
| MusicBrainz artist-rels | ❌ Zero for all 5 artists | ❌ Zero |
| Wikidata P737 / P738 | ⚠️ Sparse — Beatles: 9, Björk: 4, Fela Kuti: 2, Kendrick: 0, Daft Punk: 0 | ❌ P738 empty everywhere |
| Wikipedia infobox | ✅ Richest — Kendrick: 25, Daft Punk: 10, Björk: 12, Fela Kuti: 6 | ✅ Reconstructable via reverse lookup |

### Known Risks (technical)

**Wikipedia infobox parsing fragility:** The primary influence source is now Wikipedia infobox parsing. Infobox structure is inconsistent — some artists have influences in the infobox field, others in prose. This should be stress-tested against a broad sample (not just the 5 used here) early in implementation.

**Downstream data gap:** "Who did this artist influence" has no structured primary source — it must be reconstructed by reverse-querying who lists the target artist as an influence. This is architecturally viable via Wikidata SPARQL but means downstream graph data will be sparse for contemporary artists not yet widely cited. Known gap, not a blocker.

**Spotify preview API:** Spotify has progressively restricted 30-second preview URLs across markets. The preview feature should be built behind an abstraction layer so the source can be swapped without feature redesign. Alternatives: YouTube embeds, SoundCloud.

---

## Rejected Alternatives

**MusicBrainz as influence data source:** Assumed primary at project start. Ruled out after pre-build sampling confirmed zero influence edges for all five test artists. MusicBrainz remains in the stack for artist metadata only.

**Wikidata as sole influence source:** Insufficient coverage for downstream direction (P738 is effectively empty). Retained as secondary source for upstream; primary for downstream via reverse P737 query.

---

## Options Considered: Graph Layout Direction

**Option A (rejected): Color-coded edges only** — Blue = influenced by, orange = influenced. Requires a legend; color-blind users may struggle without spatial reinforcement.

**Option B (chosen): Spatial separation** — Left = upstream influences (roots), right = downstream influences (legacy), Focal Artist at center. Layout carries the directional meaning; color can reinforce but is not the sole signal. Immediately readable without a legend.

**Option C (deferred): Leave to design phase** — Deferred in favor of capturing the directional principle in the PRD so architecture and UX have a clear constraint to design against.