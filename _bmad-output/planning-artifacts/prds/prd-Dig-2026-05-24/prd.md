---
title: "PRD: Dig"
status: final
created: 2026-05-24
updated: 2026-05-24
---

# PRD: Dig

## 0. Document Purpose

This PRD is the single source of requirements truth for Dig v1 — intended for downstream UX design, architecture, and story implementation. It is structured as a glossary-anchored vocabulary (§3), features with nested functional requirements (§4), and explicit scope boundaries (§5–§6). It does not describe implementation choices or data source mechanics; those live in `addendum.md`. This PRD builds on the finalized product brief at `_bmad-output/planning-artifacts/briefs/brief-Dig-2026-05-24/brief.md`.

---

## 1. Vision

Dig is an open-source web app that makes musical influence visible. Search any artist and a living graph appears — their influences radiating to the left, the artists they went on to shape spreading to the right. Click any node to recenter. Follow the thread. Trace Robert Johnson through Muddy Waters to Led Zeppelin. Watch how Miles Davis touches everything.

Music streaming has solved "what sounds like this?" Dig answers "why does this sound like this?" The knowledge already exists — in Wikipedia infoboxes, in Wikidata's relationship graph, in liner notes and interviews — but it is scattered and disconnected. There is no single place to stand in front of an artist's complete musical lineage and see it whole. Dig is that place.

This is a passion project, built to be used. Built with Next.js, D3.js, and open music data. Released under the MIT license because it should be.

---

## 2. Target User

### 2.1 Personas

**Primary — The music obsessive.** Opens seven Wikipedia tabs at 2am following a thread from one artist to the next. The vinyl collector who wants to understand the lineage behind the record they just bought. The music student tracing bebop's roots. Already does this work manually; Dig visualizes it. This persona drives every design decision.

**Secondary — The curious listener.** May not know what MusicBrainz is. Just heard something they loved and wants to understand where it came from. They arrive most often via a shared URL — someone sent them a graph. They can navigate the product successfully without prior knowledge of influence graphs or music data. UX copy and empty states must be legible to this persona even though product decisions are made for the primary.

### 2.2 Jobs To Be Done

- **Functional:** Trace the roots and legacy of any artist in a single interactive session without opening multiple tabs.
- **Functional:** Answer "where did this sound come from?" faster and more completely than a Wikipedia search.
- **Emotional:** Feel like an explorer, not a researcher — discovery that feels like play.
- **Social:** Share a graph view with someone else ("look at this path from Fela Kuti to Afrobeats").
- **Builder/learner:** Build something portfolio-worthy using modern web tools and open data.

### 2.3 Non-Users (v1)

- Users expecting personalized recommendations based on listening history (this is lineage, not similarity)
- Users who need curated playlists (out of scope)
- Casual listeners who haven't felt the pull of a music rabbit hole (they may arrive via sharing but aren't the design target)

### 2.4 Key User Journeys

**UJ-1. The music obsessive traces an artist's roots.**
Alex, a music obsessive, just finished listening to Radiohead's *OK Computer* and wants to understand where it came from. They navigate to Dig, type "Radiohead" into the search bar, select from the autocomplete, and the influence graph appears — Radiohead at center, upstream influences fanning left (Talk Talk, Can, Public Enemy, Scott Walker), downstream influenced artists spreading right. Alex clicks "Can" on the left side; the graph recenters on Can. They see Krautrock's roots unfolding. They're still there 25 minutes later.

**UJ-2. The curious listener follows a discovery outward.**
Sam just heard "Water No Get Enemy" and wants to know more about Fela Kuti. They land on Dig via a shared URL (`/artist/fela-kuti`), the graph loads, and they see Fela at center with a sparse but real picture — James Brown and jazz nodes on the left, Afrobeats branches on the right. A "data thin" indicator signals the picture isn't complete. Sam clicks James Brown to see his fuller graph, then uses the era filter to narrow to the 1960s–70s. They bookmark the URL and come back later.

---

## 3. Glossary

- **Artist** — A musician, band, or collective. The atomic unit of the graph. Represented as a node. Identified by a canonical ID sourced from MusicBrainz.
- **Influence Relationship** — A directional edge between two Artists indicating one shaped the other's sound. Edges have direction: upstream (A influenced B) or downstream (B was influenced by A). Source: open music data (see `addendum.md`).
- **Upstream Influence** — An Artist who influenced the Focal Artist. Displayed on the left side of the graph. Colloquially: "roots."
- **Downstream Influence** — An Artist whom the Focal Artist went on to influence. Displayed on the right side of the graph. Colloquially: "legacy."
- **Focal Artist** — The Artist currently centered in the graph. All other nodes are positioned relative to them. Changes on Pivot.
- **Pivot** — The act of recentering the graph on a new Focal Artist by clicking a node. Triggers a graph transition animation.
- **Graph Depth** — The number of hops from the Focal Artist rendered by default. Default is 2. Nodes beyond the default depth can be expanded on demand.
- **Hop** — One degree of separation in the Influence Relationship graph. The Focal Artist's direct influences are 1 hop away; their influences' influences are 2 hops away.
- **On-Demand Expansion** — User-triggered reveal of one additional hop beyond the current rendered depth for any given node.
- **Data-Thin** — A state in which influence data for an Artist is sparse or incomplete relative to what a well-documented Artist would have. Surfaced to the user via a visual indicator.
- **Era** — A time period used for filtering the graph. Defined by decade or musical epoch (e.g., 1960s, 1970s).
- **Genre** — A musical genre tag associated with an Artist. Sourced from MusicBrainz metadata. Used for graph filtering.
- **Audio Preview** — A short audio clip playable on Artist node hover. Sourced from Spotify's preview API where available.
- **Shareable URL** — A route of the form `/artist/[slug]` that loads the graph for a specific Artist. Persists graph state for sharing.

---

## 4. Features

### 4.1 Artist Search

**Description:** The primary entry point. A search bar is prominently displayed on the landing page and persistently accessible during graph exploration. As the user types, a live autocomplete dropdown surfaces matching Artist results, sourced from MusicBrainz. Selecting a result loads the graph and navigates to the Artist's Shareable URL. The search field accepts partial names and is tolerant of minor variations (e.g., "beatles" matches "The Beatles").

**Functional Requirements:**

#### FR-1: Live autocomplete artist search

User can type a partial artist name and see a dropdown of matching results updating in real time (debounced). Results display the Artist name and a disambiguating detail (e.g., genre or era) where available.

**Consequences (testable):**
- Typing "radio" returns results including "Radiohead" within 300ms of keystroke debounce.
- Each result displays at minimum the Artist name; disambiguation detail shown when present.
- Dropdown closes on result selection, ESC key, or click outside.

#### FR-2: Search result selection loads the graph

User can select an autocomplete result to load that Artist's Influence Graph and navigate to `/artist/[slug]`.

**Consequences (testable):**
- Selecting a result renders the Influence Graph with the selected Artist as the Focal Artist.
- Browser URL updates to `/artist/[slug]` for the selected Artist.
- If no influence data exists for the selected Artist, a "no data" empty state is shown (not a crash or blank graph).

#### FR-3: Artist not found state

User receives a clear message if their search returns no matches.

**Consequences (testable):**
- Zero-result searches show an explicit "no artists found" message in the dropdown.
- The graph area does not update or clear on a zero-result search.

---

### 4.2 Influence Graph

**Description:** The core of the product. A full-viewport interactive graph rendered with D3.js. The Focal Artist occupies the center. Upstream Influences (roots) radiate leftward; Downstream Influences (legacy) radiate rightward. The graph renders to default Graph Depth (2 hops). Nodes display Artist name and image. Edges are directional. The layout carries direction meaning — left/right spatial position is the primary way the user distinguishes upstream from downstream; color may reinforce but is not the sole signal. Where influence data is sparse, a Data-Thin indicator is surfaced. The graph loads without a backend database — data is fetched live from open music data sources on demand. Realizes UJ-1, UJ-2.

**Data coverage note (UX-relevant):** Upstream (roots) data is generally richer than Downstream (legacy) data. The "who influenced this artist" direction has a structured primary source (Wikipedia infoboxes); the "who did this artist go on to influence" direction must be reconstructed via reverse queries, which means downstream graphs will be structurally sparser — particularly for contemporary artists not yet widely cited as influences. UX must account for this asymmetry: a thin right side of the graph for a contemporary artist is expected, not a bug. The Wikipedia infobox parsing approach — the primary upstream data source — must be stress-tested against a broad artist sample early in implementation; infobox structure is inconsistent across articles. Full data source architecture and pre-build validation results are in `addendum.md`.

**Functional Requirements:**

#### FR-4: Graph renders with Focal Artist centered

System renders an Influence Graph with the Focal Artist as the center node, Upstream Influences to the left, Downstream Influences to the right, to the default Graph Depth of 2 Hops.

**Consequences (testable):**
- Graph renders within 3 seconds for major Artists (The Beatles, Kendrick Lamar, David Bowie) on a connection of ≥10 Mbps.
- Focal Artist node is visually distinct (larger, highlighted) from surrounding nodes.
- Left side of graph contains only Upstream Influence nodes; right side contains only Downstream Influence nodes.

**Out of scope:**
- Graph persistence between sessions (no backend database in v1).

#### FR-5: Node displays Artist identity

Each node displays the Artist's name and, where available, a thumbnail image.

**Consequences (testable):**
- Artist name is legible at default zoom level.
- Nodes without an available image display a consistent fallback (e.g., genre-colored placeholder).

#### FR-6: Data-Thin indicator

When an Artist's influence data is sparse relative to expectations, a visual indicator is shown on that node and/or surfaced as a graph-level notice. Does not imply the graph is complete or broken — communicates "this is what we have." Note: Downstream (legacy) graphs for contemporary artists will routinely be sparse due to structural data gaps in upstream sources — Data-Thin in this direction is an expected state, not an anomaly (see §4.2 data coverage note).

**Consequences (testable):**
- Artists with fewer than [ASSUMPTION: 3] influence relationships display a Data-Thin indicator. → OQ-2.
- Indicator does not prevent the graph from rendering; it annotates it.
- Data-Thin copy does not use error language ("Data unavailable", "Failed to load") — it uses informative voice ("Limited data for this artist") consistent with §10 Voice.

#### FR-7: On-demand hop expansion

User can expand any visible node to reveal one additional Hop of influence relationships beyond the currently rendered depth.

**Consequences (testable):**
- An expand affordance (e.g., button or visual cue) is visible on hovered/focused leaf nodes.
- Activating expansion appends the next Hop of nodes and edges to the live graph without a full reload.
- Expansion is per-node — expanding one node does not expand all nodes at that depth.

**Feature-specific NFRs:**
- Expansion response time: new nodes appear within 2 seconds of user action.

---

### 4.3 Graph Interaction & Navigation

**Description:** The graph is designed for exploration. Users navigate by clicking nodes to Pivot (recenter), hovering to see Artist detail, and using touch gestures on mobile. Every navigation action updates the Shareable URL so the current state is always linkable. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-8: Pivot on node click

User can click any node to Pivot the graph — recentering on that Artist as the new Focal Artist.

**Consequences (testable):**
- Clicking a node triggers a graph transition animation and renders the clicked Artist as the new Focal Artist.
- The URL updates to `/artist/[slug]` for the new Focal Artist.
- The graph re-renders with the new Focal Artist's Upstream and Downstream Influences at default Graph Depth.

#### FR-9: Node hover state

Hovering a node reveals an Artist detail panel or tooltip displaying: Artist name, genre(s), era/active years, and Audio Preview control (if available).

**Consequences (testable):**
- Hover state activates within 200ms of cursor entering node bounds.
- Panel/tooltip displays without obscuring the Focal Artist node.
- Audio Preview control is visible in the hover state when a preview is available; absent (not errored) when unavailable.

#### FR-10: Graph pan and zoom

User can pan the graph by click-drag and zoom by scroll wheel (desktop) or pinch gesture (mobile).

**Consequences (testable):**
- Graph remains navigable (no lost state) after arbitrary pan and zoom operations.
- Zoom has defined min/max bounds to prevent the graph from becoming too small or too large to navigate. [ASSUMPTION: minimum zoom shows at least the Focal Artist and all 1-hop neighbors; maximum zoom makes individual node labels legible. Specific scale values to be determined during UX/implementation.] → OQ-6.

#### FR-11: Mobile touch navigation

On mobile, tap triggers Pivot (equivalent to desktop click); pinch-to-zoom and drag-to-pan are supported.

**Consequences (testable):**
- Tapping a node on a touch device triggers Pivot.
- Pinch gesture scales the graph view.
- Graph is navigable on a viewport of 375px width (iPhone SE baseline).

---

### 4.4 Filters

**Description:** Two filter controls allow users to narrow the graph to a subset of nodes: by Era (decade/epoch) and by Genre. Filters apply to the currently visible graph — nodes that don't match the active filters are visually dimmed or hidden. Filters persist while navigating the graph via Pivot. Realizes UJ-2.

**Functional Requirements:**

#### FR-12: Filter by Era

User can apply an Era filter to dim or hide nodes outside the selected time range.

**Consequences (testable):**
- Era filter options are derived from the data present in the current graph (not a static hardcoded list). [ASSUMPTION: decade buckets, e.g., 1950s, 1960s, …] → OQ-1.
- Applying an Era filter visually differentiates in-range nodes from out-of-range nodes.
- Clearing the filter restores all nodes to full visibility.

#### FR-13: Filter by Genre

User can apply a Genre filter to dim or hide nodes outside the selected genre(s).

**Consequences (testable):**
- Genre filter options are derived from genre tags present in the current graph.
- Multiple genres can be selected simultaneously (OR logic — show nodes matching any selected genre).
- Clearing the filter restores all nodes to full visibility.

**Notes:** Genre tags sourced from MusicBrainz metadata; coverage will vary. Nodes without genre data are shown (not hidden) when a genre filter is active, to avoid silently hiding data gaps. [NOTE FOR PM: Consider whether nodes without genre data should display with a distinct visual treatment when a filter is active.]

---

### 4.5 Audio Preview

**Description:** A 30-second audio clip plays when the user hovers a node, sourced from the Spotify preview API. The feature is designed as a progressive enhancement — it adds delight when available and degrades gracefully when it is not. The integration point is intentionally swappable; if Spotify's preview API changes terms or reduces availability, the mechanism can be replaced with an alternative source (YouTube, SoundCloud) without changing the feature contract. Realizes UJ-1.

**Functional Requirements:**

#### FR-14: Spotify preview on node hover

When a user hovers an Artist node and a Spotify preview URL is available for that Artist, a short audio preview plays.

**Consequences (testable):**
- Preview begins playing within 500ms of hover dwell (not on immediate hover to avoid accidental triggers).
- Preview stops when the cursor leaves the node.
- Only one preview plays at a time — hovering a second node while one is playing stops the first.

#### FR-15: Graceful preview fallback

When no Spotify preview is available for an Artist, the hover state displays normally with no audio and no error indication.

**Consequences (testable):**
- Absence of a preview URL results in a silent hover state — no error UI, no broken indicator.
- The Audio Preview control in the hover panel is absent (not disabled/greyed-out) when no preview is available.

**Feature-specific NFRs:**
- The audio preview integration point must be abstracted (interface, not direct API call inline) so the source can be swapped without feature redesign.

---

### 4.6 Shareable URLs & Routing

**Description:** Every graph state has a URL. Navigating to `/artist/[slug]` loads the influence graph for that Artist. Pivot updates the URL. This makes every graph view linkable and shareable — paste the URL, get the graph. Sharing a discovery is core behavior, not a social feature. Realizes UJ-2.

**Functional Requirements:**

#### FR-16: Artist route loads graph directly

Navigating to `/artist/[slug]` loads the Influence Graph for the corresponding Artist without requiring a search. Slug format for artists with special characters, non-Latin names, or name collisions is unresolved — see OQ-3.

**Consequences (testable):**
- Loading `/artist/radiohead` renders Radiohead's graph as the Focal Artist.
- Loading `/artist/[slug]` for an unknown slug shows an "artist not found" page (not a 500 error).
- The page is directly linkable — no session or prior navigation state required.

#### FR-17: URL updates on Pivot

Pivoting to a new Focal Artist updates the browser URL to `/artist/[slug]` for the new Focal Artist.

**Consequences (testable):**
- Browser history is updated (pushState) on each Pivot so the back button works.
- Refreshing the page after a Pivot reloads the current Focal Artist's graph (not the original entry Artist).

---

## 5. Non-Goals (Explicit)

- **No user accounts or authentication.** Dig is stateless for the user in v1.
- **No saved graphs or bookmarks.** Shareable URLs cover the sharing need; persistent saves are not in scope.
- **No social features.** No follows, comments, likes, or activity feeds.
- **No curated playlists.** Music playback is limited to hover preview; playlist generation is out.
- **No backend database.** Data is fetched live from external open APIs. No ETL pipeline, no hosted data store in v1.
- **No user-contributed data.** Community curation of influence data is not a v1 concern; data quality is the responsibility of the upstream open data sources.
- **Not a recommendation engine.** Dig surfaces lineage, not similarity. "Sounds like" is explicitly out of scope.
- **Not a music encyclopedia.** Deep artist biography, discography browsing, or album-level data are not Dig's domain.

---

## 6. MVP Scope

### 6.1 In Scope

- Artist search with live MusicBrainz autocomplete
- Interactive influence graph: Focal Artist centered, Upstream Influences left, Downstream Influences right, default 2-hop depth
- Node click → Pivot (recenter graph on clicked Artist)
- On-demand hop expansion (one hop per node, on demand)
- Node hover state: Artist name, genre, era, Audio Preview
- Audio preview on hover (Spotify, graceful fallback)
- Filter by Era
- Filter by Genre
- Data-Thin indicator for sparse nodes
- Shareable URLs: `/artist/[slug]`
- Back-button navigation (pushState on Pivot)
- Mobile responsive (pan, pinch-zoom, tap-to-pivot)
- Open source, MIT license, public GitHub repository

### 6.2 Out of Scope for MVP

- User authentication or accounts
- Saved/bookmarked graphs — deferred to v2 if there's demand
- Social features (follows, comments, sharing to platforms) — deferred; URL sharing covers v1 need
- Curated playlists — deferred
- Backend database or hosted data layer — deferred; live API fetch is v1 architecture
- Custom data contributions from users — deferred to v2+
- Album- or track-level graph nodes (v1 is Artist-only)
- Advanced graph analytics (shortest path between two artists, influence strength scoring) — [NOTE FOR PM: high-interest features for v2; worth tracking]
- PWA / offline support — deferred

---

## 7. Success Metrics

This is a passion project. Success criteria are deliberately qualitative and creator-centric.

**Primary**
- **SM-1:** App is live at a public URL. Binary. Validates FR-2, FR-4, FR-16.
- **SM-2:** Searching The Beatles, Kendrick Lamar, and David Bowie each returns a meaningful, accurate influence graph. Validates FR-1, FR-4, FR-5.
- **SM-3:** The graph is interactive end-to-end: autocomplete works, nodes are clickable, Pivot works, filters work. Validates FR-1 through FR-13.
- **SM-4:** The experience is mobile-responsive and navigable on a phone. Validates FR-11.
- **SM-5:** The creator is proud to share the URL.

**Counter-metrics (do not optimize)**
- **SM-C1:** Do not optimize for page views, session length, or DAU. These are not success criteria and optimizing for them (ads, dark patterns, retention hooks) would contradict what this product is.
- **SM-C2:** Do not treat graph completeness as a quality proxy. A sparse-but-honest graph with Data-Thin indicators is correct; a dense-but-fabricated graph is not.

---

## 8. Open Questions

1. **Era filter bucketing (OQ-1):** Are decade buckets (1950s, 1960s, …) the right granularity, or should era labels map to musical epochs (e.g., "Golden Age of Hip-Hop," "British Invasion")? Decade buckets are the working assumption.
2. **Data-Thin threshold (OQ-2):** What constitutes "data thin"? The working assumption is < 3 influence relationships, but this should be validated against real data during early implementation (not just the five pre-build test artists).
3. **Slug format for artist URLs (OQ-3):** How should `/artist/[slug]` slugs be generated for artists with special characters, non-Latin names, or name collisions? MusicBrainz canonical IDs are a possible fallback for collision resolution. Referenced by FR-16.
4. **Graph empty state (OQ-4):** If an artist exists in MusicBrainz but has zero influence data from all sources, what does the graph show? A node-only view with a Data-Thin indicator and explanatory message is assumed.
5. **Audio preview hover dwell time (OQ-5):** 500ms dwell before triggering preview is assumed. This may need UX tuning — too short feels noisy, too long feels unresponsive.
6. **Graph zoom bounds (OQ-6):** Specific min/max zoom scale values to be determined during UX/implementation. Working assumption: minimum shows Focal Artist + all 1-hop neighbors; maximum makes individual node labels legible. Referenced by FR-10.

---

## 9. Assumptions Index

- **§4.2 / FR-6:** Data-Thin threshold is fewer than 3 influence relationships. → OQ-2.
- **§4.3 / FR-10:** Graph zoom min shows Focal Artist + all 1-hop neighbors; zoom max makes node labels legible. Specific scale values TBD. → OQ-6.
- **§4.4 / FR-12:** Era filter uses decade buckets (1950s, 1960s, …). → OQ-1.
- **§4.5 / FR-14:** Audio preview hover dwell time is 500ms. → OQ-5.
- **§4.6 / FR-16:** Slug format for special characters and name collisions TBD; MusicBrainz IDs as fallback. → OQ-3.
- **§4.6 / FR-2:** Zero-data graph state (artist found but no influence data) shows a node-only view with Data-Thin indicator and explanatory message. → OQ-4.
- **§6.2:** Shareable URLs cover the v1 sharing need; no further sharing mechanism required.
- **General:** Graph uses a force-directed layout (D3.js) with spatial left/right anchoring for upstream/downstream nodes.
- **General:** App is deployed to Vercel or equivalent static/serverless host (no self-managed server infrastructure in v1).
- **Cross-cutting NFRs / Accessibility:** WCAG 2.1 AA for interactive controls; full graph accessibility deferred given the visual medium — acceptable for a hobby project but should be acknowledged in implementation.

---

## 10. Aesthetic and Tone

*Informs downstream UX and visual design work. This section is requirements, not implementation prescriptions.*

**Visual direction:** Dark UI, data-forward. The product should feel like a tool — something you use seriously — not a toy or a SaaS dashboard. Reference: Obsidian (the note-taking app) meets Spotify's dark palette.

**Graph feel:** The graph canvas is a night sky. Dark background. Nodes glow with color. The experience of looking at a dense graph should feel like looking at a star map — dense with information, beautiful, navigable.

**Typography:** Clean and legible. No decorative fonts. Information density is a feature, not a problem to design away.

**Anti-references:** Corporate SaaS dashboards, music streaming apps optimized for casual listeners, anything that looks "template-built."

**Voice (any in-product text):** Direct, knowledgeable, and unpretentious. Writes like a music obsessive, not a product marketer. Data-Thin messages, empty states, and error messages should feel like a knowledgeable friend saying "we don't have much on this one" — not a system error.

---

## 11. Cross-Cutting NFRs

- **Performance:** Initial graph render for a major artist (The Beatles, Kendrick Lamar, David Bowie) within 3 seconds on a connection of ≥10 Mbps. On-demand hop expansion within 2 seconds.
- **External API resilience:** All three external data sources (MusicBrainz, Wikipedia, Wikidata) are public APIs with rate limits and no uptime guarantees. The app must degrade gracefully when any source is slow or unavailable — partial data is preferable to a broken graph. Error states are visible and honest, not silent.
- **Audio preview abstraction:** The Spotify preview integration must be swappable (see FR-15). Fragility of Spotify's preview API is a known risk.
- **Accessibility:** Graph nodes and controls must be keyboard-accessible. Color is never the sole signal for meaning (spatial layout carries directional meaning per §4.2). [ASSUMPTION: WCAG 2.1 AA is a reasonable target for interactive elements; the graph itself may not be fully accessible in v1 given the visual nature of the medium — this is acceptable for a hobby project but should be acknowledged.]
- **Open source:** The codebase is open because it should be — not as a license compliance exercise. MIT license applied. Public GitHub repository. No proprietary dependencies that would restrict redistribution or community contribution.