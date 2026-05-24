---
title: "Product Brief: Dig"
status: final
created: 2026-05-24
updated: 2026-05-24
---

# Product Brief: Dig

## Executive Summary

Dig is an open-source music influence graph web app. Search any artist and explore an interactive visual map of who shaped their sound — and who they went on to shape — across genres, eras, and geographies.

Music discovery tools today answer "what sounds like this?" Dig answers "why does this sound like this?" It makes musical lineage visible, explorable, and fun — surfacing the connective tissue between Miles Davis and Radiohead, between Robert Johnson and Led Zeppelin, between Fela Kuti and Afrobeats. It exists because nothing else does, and its creator wants to use it every week.

Built with Next.js, D3.js, and open music data (MusicBrainz, Wikidata), released under the MIT license.

## The Problem

Streaming platforms are remarkable at finding music that *sounds like* what you already like. They are poor at explaining *why* it sounds that way.

The knowledge exists — in AllMusic liner notes, in Wikipedia's "Influences" sections, in MusicBrainz's relationship graph, in the stories musicians tell in interviews. But it is scattered, text-heavy, and disconnected. There is no way to stand in front of an artist's complete musical lineage and see it whole.

For the music obsessive — the person at 2am going down a Wikipedia rabbit hole about the origins of jazz fusion — this is a daily frustration. They are doing this work manually, tab by tab.

## The Solution

Dig makes musical lineage visual and navigable.

Search any artist. A graph appears: nodes are artists, edges are influence relationships. The artist you searched is at the center. Their influences radiate out in one direction; the artists they went on to influence radiate out in the other. Click any node and the graph recenters on that artist. Follow any thread. Filter by era and genre to focus the picture. Hover to hear a preview.

The experience is closer to exploration than search — you come in looking for Radiohead and leave having traced a path through Krautrock you didn't know you wanted.

## What Makes This Different

No current tool visualizes musical influence as an interactive graph you can navigate. AllMusic has the data, buried in text. Wikipedia has fragments, disconnected. Spotify produces similarity without explanation.

Dig's advantage at launch is execution: the specific combination of data sourcing, graph visualization, and interactivity in a clean, fast web app. The MIT license is a values choice — the code is open because it should be. Code contributions are welcome. The data layer runs on MusicBrainz and Wikidata — community curation of the data is not a v1 concern.

## Who This Serves

**Primary: the music obsessive.** The person who goes down Wikipedia rabbit holes at 2am, the vinyl collector tracing bebop's origins, the music student following a thread from Robert Johnson to every guitarist he touched. They already do this work manually. Dig visualizes it.

**Secondary: the curious listener.** Someone who just heard something they loved and wants to understand where it came from. They may not know what MusicBrainz is, but they know the feeling of "why does this sound like that?"

## Success Criteria

**v1 is a success when:**
- The app is live at a public URL
- Searching a major artist (The Beatles, Kendrick Lamar, David Bowie) returns a meaningful, accurate influence graph
- The graph is interactive: nodes are clickable, pivoting works, filters work
- Mobile responsive
- The creator is proud to share the URL

**Not success criteria for v1:** user count, retention, business metrics. This is a passion project first — a learning project second, a portfolio piece third.

## Scope

**In for v1:**
- Artist search
- Interactive influence graph (influenced by / influenced)
- Click any node to pivot the graph around that artist
- Filter by era and genre
- Spotify preview on hover
- Mobile responsive
- Open source, MIT license

**Out for v1:**
- User accounts or authentication
- Social features (sharing, follows, comments)
- Saved graphs or bookmarks
- Curated playlists
- A backend database — data is served live from external APIs

**Graph depth:** Defaults to 2 hops from the searched artist — the artist, their influences, and their influences' influences. One hop is too shallow; three or more is too slow and visually overwhelming for v1. Any node can be expanded one hop further on demand, keeping initial load fast while letting power users go deeper.

## Data Strategy

The graph's value depends entirely on influence data coverage. Pre-build sampling across five major artists confirmed the architecture — the original source hierarchy was wrong. Findings:

| Source | Upstream ("influenced by") | Downstream ("influenced") |
|---|---|---|
| MusicBrainz artist-rels | ❌ Zero for all 5 artists — not viable for influence | ❌ Zero |
| Wikidata P737 / P738 | ⚠️ Sparse — Beatles: 9, Björk: 4, Fela Kuti: 2, Kendrick: 0, Daft Punk: 0 | ❌ P738 is empty everywhere |
| Wikipedia infobox | ✅ Richest source — Kendrick: 25, Daft Punk: 10, Björk: 12, Fela Kuti: 6 | ✅ Reconstructable via reverse lookup |

### Corrected source hierarchy

**Upstream — "who influenced this artist":**
1. **Primary:** Wikipedia infobox API — parse the `influences` field from the artist's article
2. **Secondary:** Wikidata P737 SPARQL query

**Downstream — "who did this artist go on to influence":**
1. **Primary:** Wikidata SPARQL reverse query — find all artists where P737 = target artist
2. **Secondary:** Wikipedia text parsing (lower confidence, harder to structure)

**Artist metadata (names, genres, dates, images):**
- MusicBrainz remains valuable here — just not for influence edges

### Coverage expectations

| Tier | Examples | Expected coverage |
|---|---|---|
| Classic canon | Beatles, Bowie, Miles Davis, Led Zeppelin | Rich — Wikipedia and Wikidata both populated |
| Major contemporary | Kendrick, Radiohead, Daft Punk, Björk | Good — Wikipedia infobox typically 10–25 influences |
| Obscure / non-Western | Mid-tier artists outside English-language canon | Sparse — acceptable for v1 |

**UI for thin data:** Show what exists; surface a "data thin" indicator rather than implying the graph is complete.

### Note on MusicBrainz

MusicBrainz remains in the stack for artist metadata — canonical IDs, birth/death dates, genre tags, and discography. It is not an influence data source. The original assumption that it was the primary influence source is closed.

## Known Risks

**Spotify preview API:** Spotify has been progressively restricting 30-second preview URLs from the Web API across markets. This is a fragile dependency. The preview feature should be designed to be swappable — if the API fails or terms change, alternatives include YouTube embeds or SoundCloud.

**Wikipedia API reliability and parsing:** The primary influence data source is now Wikipedia infobox parsing. Wikipedia's MediaWiki API is public and rate-limited but generally reliable. The risk is parsing fragility — infobox structure is inconsistent across articles, and some artists have influences listed in prose rather than the infobox field. This should be stress-tested early in implementation against a broad artist sample, not just the five used here.

**Downstream data gap:** The "who did this artist influence" direction has no structured upstream source — it must be reconstructed by reverse-querying who lists the target artist as an influence. This is architecturally viable via Wikidata SPARQL but means downstream graph data will be sparse for contemporary artists not yet widely cited as influences. This is a known gap, not a blocker.

## Vision

If Dig works, it is the map of music history you can actually navigate — the place you go to find the roots of any sound. Not an encyclopedia of facts, but a living graph you explore. You search an artist and leave understanding something about music you've been listening to for years.

That's the product. What it becomes beyond that, Dig will earn.
