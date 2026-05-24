# PRD Quality Review — Dig

## Overall verdict

This is a well-structured, honest PRD for a hobby/passion project — the scope is real, trade-offs are named, and the testable-consequences pattern is consistently applied. The two areas that carry downstream risk are (1) the complete absence of data-layer contract language in the PRD itself (entirely deferred to the addendum, which creates a broken reference chain for anyone reading PRD-only), and (2) a handful of FRs whose testable consequences still contain adjective-qualified outcomes rather than bounds.

---

## 1. Decision-readiness — adequate

The PRD makes real decisions and names them as decisions: spatial layout over color-only encoding (referenced from addendum), no backend database, Spotify preview as swappable integration. Trade-offs are surfaced with explicit Open Questions and `[NOTE FOR PM]` callouts at the right junctures. The counter-metrics section is an unusually honest signal — the creator explicitly declines to optimize for engagement metrics.

Where it falls short: several consequential decisions are deferred to the addendum rather than surfaced in the PRD body with a summary callout. A reader working from the PRD alone would not know that MusicBrainz was ruled out as an influence source, that downstream graph data is structurally sparse, or that Spotify previews have restricted availability in many markets. These are product-shaping constraints, not implementation details. The PRD's cross-cutting NFRs mention API resilience, but the risk level is understated without the addendum context.

### Findings

- **high** Missing data-source risk summary in PRD body (§4.2, §4.5) — The addendum documents that MusicBrainz returns zero influence edges (the original primary source), that downstream graph data has no structured primary source, and that Spotify previews have declining market availability. None of this is surfaced in §4.2 or §4.5 — a reader of the PRD alone does not know the core data model rests on Wikipedia infobox parsing, which is documented as fragile. *Fix:* Add a §4.2 product note (not architecture detail): "Influence edge data sourced from Wikipedia and Wikidata — not MusicBrainz. Coverage varies; see addendum." Add a §4.5 note acknowledging preview availability restriction as a known risk driving the abstraction requirement.
- **medium** Graph empty state is an Open Question but not marked as blocking (§8, OQ-4) — If an artist exists in MusicBrainz but has zero influence data, the assumed behavior is "node-only view + Data-Thin + message." This is actually load-bearing for UX design. *Fix:* Promote OQ-4 to a `[NOTE FOR PM]` within §4.2 FR-4 so UX doesn't have to go looking for it.
- **low** FR-12/FR-13 filter behavior on Pivot not decided — The description says filters "persist while navigating via Pivot," but there's no consequence testing this. If a user filters by Era=1960s and Pivots to James Brown, do 1970s James Brown nodes appear? *Fix:* Add one testable consequence to FR-12 covering filter persistence through a Pivot.

---

## 2. Substance over theater — strong

The Vision section earns its keep — it articulates a real gap ("no single place to stand in front of an artist's complete musical lineage") and uses concrete examples (Robert Johnson → Muddy Waters → Led Zeppelin) that a real user would recognize. It is not generically swappable into another music product.

The persona section is lean and honest. The "music obsessive" persona is defined behaviorally ("opens seven Wikipedia tabs at 2am") rather than demographically, and the Non-Users section does real work — it rules out recommendation-seekers and playlist users who would otherwise be design distractions.

The NFR section is mostly specific: 3-second render for named artists, 2-second expansion, 500ms hover dwell, 375px mobile baseline. These are product-specific, not boilerplate.

The Success Metrics section is the clearest signal of authenticity in the whole document: SM-5 ("the creator is proud to share the URL") and the explicit counter-metrics declining to optimize for DAU are not furniture — they constrain downstream decisions.

### Findings

- **low** "Reasonable" and "graceful" adjectives still appear in cross-cutting NFRs (§Cross-Cutting NFRs) — "degrade gracefully" and "Error states are visible and honest" are not theater, but they're not testable either. *Fix:* Add one concrete consequence per statement: e.g., "If MusicBrainz is unreachable, the graph renders with available data and surfaces a banner — not a broken page."
- **low** Audio preview "abstraction layer" NFR (§4.5) is architecturally prescriptive — it specifies an implementation approach ("interface, not direct API call inline"), which belongs in architecture, not PRD. *Fix:* Restate as a product constraint: "The audio preview source must be replaceable without changing user-facing feature behavior."

---

## 3. Strategic coherence — strong

The thesis is stated and held: "Music streaming solved 'what sounds like this?' Dig answers 'why does this sound like this?'" Every feature traces to that thesis. Artist search is the entry point; the influence graph is the thesis made visual; Pivot is the "follow the thread" behavior; Shareable URLs are the "share a discovery" behavior from the JTBD. Filters, Audio Preview, and Data-Thin indicators all serve the exploration arc without contradicting it.

MVP scope is coherent — the single most questionable inclusion is Audio Preview (Spotify), which is a delight feature with known fragility. The PRD acknowledges this explicitly and routes it as progressive enhancement, which is the right call.

The Success Metrics validate the thesis directly: SM-2 tests data quality (not just app existence), SM-3 tests end-to-end interaction, SM-5 tests creator intention. Counter-metrics naming what not to optimize for is a strong coherence signal.

### Findings

- **low** Filters may be coherent in the JTBD but their MVP necessity is not argued — Era and Genre filters appear in the MVP scope without a line connecting them to the thesis or the UJs. UJ-2 references Era filter usage, which partially closes this gap, but Genre filter has no UJ support. *Fix:* Either add a brief filter-rationale sentence in §4.4, or add a UJ beat that uses Genre filter, or move Genre filter to v2 with an explicit deferral note.

---

## 4. Done-ness clarity — adequate

The testable-consequences pattern is consistently applied across all FRs — this is the PRD's strongest structural feature. Engineers and story writers can extract FRs individually and know what a passing implementation looks like for most requirements.

Gaps exist where consequence language slips back into adjectives, and two FRs have under-specified boundaries that would cause ambiguity in story acceptance.

### Findings

- **high** FR-4 render performance bound is asymmetric — "within 3 seconds for major Artists on standard broadband" is testable for The Beatles, Kendrick Lamar, David Bowie (named). But "standard broadband" is not defined. The architect will need a number. *Fix:* Add: "Standard broadband = ≥25 Mbps download."
- **high** FR-10 zoom bounds are stated as a requirement but no values given — "defined min/max bounds" is named but the bounds themselves are deferred. This will require a design or architecture decision. *Fix:* Add `[ASSUMPTION: min zoom = X%, max zoom = Y%]` with a note that UX to validate, or flag as `[NOTE FOR PM: zoom bounds to be defined in UX spec]`.
- **medium** FR-9 hover panel positioning — "without obscuring the Focal Artist node" is a constraint, not a testable consequence. It describes intent but not behavior. *Fix:* "Hover panel anchors to the opposite side of the viewport from the hovered node; if the Focal Artist node would be obscured, panel shifts position."
- **medium** FR-5 "consistent fallback" is under-specified — "genre-colored placeholder" is a design concept, not a testable consequence. *Fix:* "Nodes without an available image display a fallback that is visually distinct from nodes with images and does not display a broken image indicator."
- **low** FR-7 "expand affordance visible on hovered/focused leaf nodes" — "leaf nodes" is not in the Glossary. A leaf node and a non-leaf node at the graph boundary may behave differently. *Fix:* Add "Leaf Node" to the Glossary, or restate as "nodes at the current rendered depth boundary."

---

## 5. Scope honesty — strong

The Non-Goals section does real work — eight explicit exclusions, each with a clear rationale or deferral note. The `[ASSUMPTION]` and `[NOTE FOR PM]` pattern is used consistently in the body text and rounds up in the Assumptions Index (§9). Open Questions are genuinely open (not rhetorical), and OQ-2 through OQ-5 are each tagged to an assumption in §9.

The addendum's "Rejected Alternatives" section is honest and specific — MusicBrainz ruled out with evidence, layout Option A rejected with reasoning.

One structural gap: the addendum carries scope-shaping information (data source coverage expectations, known downstream data gap, Spotify restriction risk) that a reader of the PRD alone would not encounter. The PRD references the addendum in §0 and in the Glossary, but does not summarize what changed from original assumptions.

### Findings

- **medium** Assumptions Index (§9) is incomplete — Three assumptions in the body text are not indexed: (1) Force-directed layout is mentioned in §9 but not tagged in the FRs that depend on it. (2) WCAG 2.1 AA target is an assumption in §Cross-Cutting NFRs but not linked to an OQ. (3) "No session or prior navigation state required" (FR-16) is a non-trivial constraint for a serverless deployment but appears without an `[ASSUMPTION]` tag. *Fix:* Add these three to §9 Assumptions Index. Add an OQ for WCAG AA scope on the graph itself.
- **low** §0 references `brief.md` but brief is not part of the review chain — downstream agents (UX, architecture) will source from this PRD, and the brief reference implies there may be context not in this document. *Fix:* Either ensure the brief is co-located or add a "what this PRD supersedes" note in §0.

---

## 6. Downstream usability — adequate

The Glossary is present, used consistently, and covers the key domain nouns. FR IDs are sequential and unique (FR-1 through FR-17). UJs are labeled and referenced in feature descriptions. SM IDs are present; counter-metrics are labeled (SM-C1, SM-C2). The Assumptions Index provides a roundtrip to Open Questions for three of the five OQs.

Gaps:

### Findings

- **high** Addendum information is not accessible by downstream agents reading only the PRD — UX design needs to know about the left/right spatial layout decision (currently only in the addendum's "Options Considered" section). Architecture needs the source hierarchy. Neither is summarized in the PRD body. Downstream agents who receive only `prd.md` will be working from an incomplete picture. *Fix:* Add a "Key decisions from addendum" summary box in §0 or §4.2 with 3–4 bullet-point callouts.
- **medium** OQ-3 (slug format) is not linked to an FR — FR-16 depends on slug resolution for non-Latin and special-character names, but FR-16 has no `[ASSUMPTION]` tag or OQ reference. *Fix:* Add `[ASSUMPTION: → OQ-3]` in FR-16 consequences.
- **medium** UJ-1 and UJ-2 use "Alex" and "Sam" as persona names, but §2 does not name the persona — §2.1 uses "the music obsessive" as a label, and UJ-1 assigns "Alex" to that persona without a mapping note. UJ-2's Sam is presumably also the music obsessive but could be the "casual listener who arrived via sharing" (§2.3). *Fix:* Add "(music obsessive)" parenthetical after Alex and Sam in UJ-1 and UJ-2 respectively, or add a named persona label in §2.1.
- **low** SM cross-references are partially redundant — SM-3 says "validates FR-1 through FR-13" but FR-7 (on-demand expansion) and FR-9 (hover state) are independently testable behaviors that could fail SM-3 while passing all others. Consider splitting SM-3 or tightening its scope. *Fix:* Low priority — acceptable for hobby project scale.
- **low** "Slug" is used in FR-2, FR-8, FR-16, FR-17, and §6.1 but is not in the Glossary. *Fix:* Add "Slug" to §3.

---

## 7. Shape fit — strong

This PRD is appropriately sized for a hobby/passion project that feeds a UX → architecture → story chain. It is not over-formalized: no stakeholder RACI, no business case, no compliance section, no risk register. The creator-centric Success Metrics (SM-5) and counter-metrics signal the document knows what it is.

It is not under-formalized: the testable-consequences pattern on FRs is chain-top rigor done right — downstream story creation will benefit from this directly. The Glossary, Assumptions Index, and Open Questions are present and functional without being ceremonial.

The Aesthetic and Tone section is well-placed and correctly scoped — it says "requirements, not implementation prescriptions" and delivers accordingly. The Obsidian/Spotify reference is specific enough to be actionable by a UX designer.

### Findings

- **low** §0 "Document Purpose" is slightly over-formal for a hobby project — the two-sentence description of the document's own structure reads like enterprise PRD boilerplate. Harmless, but could be cut without loss. *Fix:* Optional — no action required.

---

## Mechanical notes

**Glossary drift:**
- "Slug" used six times but not defined in §3.
- "Leaf Node" used in FR-7 but not defined in §3.
- "UJ" abbreviation used in FR descriptions ("Realizes UJ-1") without being introduced — minor, widely understood.

**ID continuity:**
- FR-1 through FR-17: contiguous, no gaps. Clean.
- SM-1 through SM-5 + SM-C1/SM-C2: contiguous, clearly labeled.
- OQ-1 through OQ-5: contiguous.
- Assumptions Index in §9 covers OQ-1, OQ-2, OQ-5 explicitly; OQ-3 and OQ-4 are not rounded up in §9 (OQ-4 is present as a general note but not linked from the OQ number).

**Broken cross-references:**
- FR-16 mentions `/artist/[slug]` resolution but has no `[ASSUMPTION]` tag pointing to OQ-3 (slug format for special characters).
- §4.4 FR-13 Notes reference `[NOTE FOR PM]` correctly but are not indexed in §9.
- §9 Assumptions Index lists "General: Graph uses a force-directed layout" but this assumption does not appear in any FR with a tag — cannot roundtrip.

**Addendum integration:**
- The addendum contains two categories of content: (a) architecture/data decisions that should be accessible as summaries in the PRD body, and (b) legitimately deferred technical detail. Category (a) items — specifically the data source change, coverage expectations table, and Spotify restriction risk — are product-shaping and should have surface-level callouts in prd.md for downstream usability.