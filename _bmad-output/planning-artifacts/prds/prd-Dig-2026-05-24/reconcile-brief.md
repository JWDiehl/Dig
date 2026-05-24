---
title: "Brief–PRD Reconciliation: Dig"
created: 2026-05-24
---

# Brief–PRD Reconciliation: Dig

**Brief:** `_bmad-output/planning-artifacts/briefs/brief-Dig-2026-05-24/brief.md`
**PRD:** `_bmad-output/planning-artifacts/prds/prd-Dig-2026-05-24/prd.md`
**Addendum:** `_bmad-output/planning-artifacts/prds/prd-Dig-2026-05-24/addendum.md`

---

## Summary Verdict

The PRD is a high-fidelity translation of the brief. Core scope, success criteria, persona, data strategy, and risks are all present or explicitly deferred to the addendum. The gaps are real but narrow — mostly around one missing risk, one partially-dropped voice signal, and a few brief phrases that carried design intent the PRD's FR structure did not fully absorb.

---

## Gaps and Weaknesses

### GAP-1: "Creator is proud to share the URL" — Success Criterion Present but Weakened

**Brief (§Success Criteria):** Lists "The creator is proud to share the URL" as one of five explicit v1 success criteria, placing it on equal footing with the technical checks.

**PRD (§7 SM-5):** Includes `SM-5: The creator is proud to share the URL.` — the criterion is present.

**Weakness:** The brief also emphasizes the creator-centric framing explicitly: *"This is a passion project first — a learning project second, a portfolio piece third."* The PRD states "This is a passion project" in §1 Vision, but the ranked ordering (passion → learning → portfolio) is dropped. This ordering has downstream relevance: it should constrain decisions where passion/aesthetic quality conflicts with technical learning opportunity or portfolio polish. The PRD's §7 does include counter-metrics (SM-C1, SM-C2) which partially capture the same spirit, but the explicit priority ordering is absent.

**Recommendation:** Add a note in §7 to the effect of: *"Priority order when trade-offs arise: creator satisfaction > technical learning > portfolio presentation."*

---

### GAP-2: Wikipedia Parsing Stress-Testing Recommendation — Present in Addendum, Missing from PRD Risk Register

**Brief (§Known Risks):** Explicitly recommends: *"This should be stress-tested early in implementation against a broad artist sample, not just the five used here."* This is an implementation timing directive — a risk mitigation action with a "when" (early in implementation).

**PRD:** The Spotify and downstream data risks surface in the Cross-Cutting NFRs (§8 External API resilience) and FR-15, but the Wikipedia infobox parsing risk does not appear in the PRD proper. It does appear in `addendum.md` under "Known Risks (technical)" — but without the timing directive ("stress-test early").

**Impact:** The addendum is flagged as belonging to architecture/solution design. If architects or developers read only the PRD, they will miss the timing recommendation. Parsing fragility is noted; the instruction to validate it early is not.

**Recommendation:** Add to Cross-Cutting NFRs: *"Wikipedia infobox parsing fragility is a known risk — the parsing layer should be stress-tested against a broad artist sample early in implementation (not deferred to post-build)."*

---

### GAP-3: "Secondary Persona" (The Curious Listener) — Dropped

**Brief (§Who This Serves):** Names two user groups explicitly:
- Primary: the music obsessive
- Secondary: the curious listener — *"Someone who just heard something they loved and wants to understand where it came from. They may not know what MusicBrainz is, but they know the feeling of 'why does this sound like that?'"*

**PRD (§2):** Defines the Primary Persona thoroughly (§2.1) and includes user journeys covering both Alex (music obsessive) and Sam (curious listener via shared URL). However, the Secondary Persona is never named or characterized as a distinct user. Sam appears in UJ-2 but is treated as an incidental case (arrives via shared URL) rather than a recognized, designed-for user type.

**Impact:** Design decisions for newcomers who lack domain knowledge — onboarding copy, graph legibility for first-time visitors, the "data thin" message tone — benefit from having the curious listener explicitly acknowledged as a target. The brief's characterization (*"may not know what MusicBrainz is"*) signals that jargon-free language and lower-barrier entry are requirements, not nice-to-haves.

**Recommendation:** Add §2.2a or expand §2.3 to characterize the secondary persona and note that Dig's UI language should be accessible to someone unfamiliar with MusicBrainz or graph tools.

---

### GAP-4: Open Source as a Values Claim — Present but Diluted

**Brief (§What Makes This Different):** *"The MIT license is a values choice — the code is open because it should be."* This is a statement of principle, not just a feature.

**PRD (§6.1 / Cross-Cutting NFRs):** Lists "Open source, MIT license, public GitHub repository" in scope, and the NFR states *"MIT license applied to the codebase. Public GitHub repository. No proprietary dependencies that would restrict redistribution."*

**Weakness:** The "no proprietary dependencies" clause in the NFR is good, but it is framed as a redistribution concern rather than a values commitment. The brief's "because it should be" framing invites a broader interpretation: if a feature requires a proprietary dependency or closed API as the only available path, that should be a flag, not just a technical consideration. The PRD does not carry this framing.

**Impact:** Low — this is primarily a tone gap rather than a functional omission. But it could matter if a future decision (e.g., using a proprietary music metadata API) is evaluated purely on capability grounds without reference to the values framing.

**Recommendation:** Append to the Open Source NFR: *"Open source is a values choice, not just a license. Prefer open or open-licensed dependencies where viable."*

---

### GAP-5: "What it becomes beyond that, Dig will earn" — Vision Tail Dropped

**Brief (§Vision):** Closes with: *"That's the product. What it becomes beyond that, Dig will earn."*

**PRD (§1 Vision):** Does not include this phrase or its spirit. The PRD's vision is strong and specific, but it ends with the product description rather than with an explicit statement of v1 humility and deferred ambition.

**Impact:** Minimal for functional requirements, but meaningful for downstream contributors and architecture. The phrase signals intentional constraint — do not over-engineer for a future that hasn't been earned. This is relevant to architecture choices (no over-built backend for v1, no future-proofing for features not in scope).

**Recommendation:** Add a closing line to §1: *"This is the v1 product. What it becomes beyond that, Dig will earn."*

---

### GAP-6: Downstream Data Sparsity for Contemporary Artists — Risk Present but Framing Softened

**Brief (§Known Risks):** *"This means downstream graph data will be sparse for contemporary artists not yet widely cited as influences. This is a known gap, not a blocker."*

**PRD + Addendum:** The addendum captures this risk. The PRD captures Data-Thin indicators (FR-6) and the general API resilience NFR. However, the PRD does not explicitly note that the downstream (legacy) direction will be structurally sparser than upstream — meaning users who come looking for "who did Kendrick influence?" may find much less data than users asking "who influenced Kendrick?" This asymmetry has UX implications (Data-Thin messaging, user expectation setting) that are not addressed.

**Recommendation:** Add a note to FR-6 or §4.2: *"The downstream (legacy) direction is structurally sparser than upstream for contemporary artists — the Data-Thin indicator should be calibrated to reflect this asymmetry. Users should not interpret a sparse legacy graph as a product defect."*

---

## Qualitative Tone and Voice Gaps

The brief's voice is strongly opinionated and personal. Several signals from the brief did not carry fully into the PRD's more formal FR structure:

### TONE-1: "The experience is closer to exploration than search"

**Brief:** *"The experience is closer to exploration than search — you come in looking for Radiohead and leave having traced a path through Krautrock you didn't know you wanted."*

**PRD:** The PRD's §2.2 Jobs To Be Done includes *"Feel like an explorer, not a researcher — discovery that feels like play."* This is good. However, the specific framing — that the starting intent (search) transforms into something else (discovery of the unexpected) — is a design constraint. It suggests the UI should reward serendipity, not just efficient search completion. This is partially present but not explicit.

**Recommendation:** The UX spec should carry this framing explicitly as a design principle. Consider adding to §2.2: *"The product succeeds when users leave having discovered something they didn't come looking for."*

### TONE-2: "Not an encyclopedia of facts, but a living graph you explore"

**Brief (§Vision):** Frames the product as an experiential artifact, not an information retrieval system.

**PRD:** The §8 Non-Goals ("Not a music encyclopedia") handles the scope boundary, but the positive framing — "living graph you explore" — is only present in §1 Vision. The Features sections read as functional specifications without this spirit. This is appropriate for a PRD but worth noting for UX handoff.

**Recommendation:** The UX brief should reference the brief's vision language explicitly, not just the PRD's NFR sections.

### TONE-3: "It exists because nothing else does, and its creator wants to use it every week"

**Brief:** This phrase establishes the product's raison d'être and the creator as the primary use-case validator.

**PRD:** The "passion project" framing is present (§1, §7), but the "wants to use it every week" framing — which implies that personal weekly use is a real validation test — is absent. This matters because it sets a bar for product quality that is higher than "technically functional."

---

## Items Confirmed Present (Not Gaps)

The following brief elements are confirmed fully reflected in the PRD or addendum:

- All five v1 success criteria (SM-1 through SM-5)
- All in-scope features (search, graph, pivot, hover, filters, audio preview, mobile, MIT license)
- All out-of-scope items (auth, social, saved graphs, playlists, backend database)
- Graph depth default (2 hops) and on-demand expansion
- Data source hierarchy (addendum)
- Coverage tier table (addendum)
- Spotify fragility risk and abstraction requirement (FR-15 NFR + addendum)
- MusicBrainz role clarification (metadata only, not influence source)
- Data-Thin indicator concept (FR-6)
- Shareable URLs (FR-16, FR-17)
- Dark visual direction and "night sky" graph feel (§Aesthetic and Tone)
- Voice guidance for in-product text (§Aesthetic and Tone)
- Counter-metrics (SM-C1, SM-C2)
- External API resilience requirement (Cross-Cutting NFRs)
- Open source / MIT license / no proprietary dependency constraint

---

## Prioritized Gap List

| # | Gap | Severity | Recommended Action |
|---|-----|----------|--------------------|
| GAP-3 | Secondary persona (curious listener) dropped | Medium | Add secondary persona to §2 |
| GAP-2 | Wikipedia parsing stress-test timing directive missing from PRD | Medium | Add to Cross-Cutting NFRs |
| GAP-6 | Upstream/downstream data asymmetry not flagged in FR-6 | Medium | Add note to FR-6 or §4.2 |
| GAP-1 | Passion/learning/portfolio priority ordering dropped | Low | Add to §7 framing |
| GAP-4 | Open source as values framing diluted | Low | Append to Open Source NFR |
| GAP-5 | "What it becomes, Dig will earn" — v1 humility signal dropped | Low | Add to §1 Vision close |
| TONE-1 | "Exploration, not search" as design principle not explicit | Low | Carry into UX spec |
