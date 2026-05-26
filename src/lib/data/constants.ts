/**
 * Data-layer constants — consumed by server-side code (graph-builder, API routes).
 *
 * Note: DATA_THIN_THRESHOLD also appears in src/graph/constants.ts for use by the
 * D3 rendering engine. Both must equal 3. The duplication is intentional: the data
 * layer and graph engine are separate modules with separate import graphs.
 */

/**
 * Minimum number of influence relationships an artist must have to be considered
 * "data-rich". Artists below this threshold have `isDataThin = true` and receive
 * the amber dot indicator and/or the graph-level DataThinBadge notice.
 *
 * Computed in graph-builder.ts on the server; never re-derived on the client.
 */
export const DATA_THIN_THRESHOLD = 3;

/**
 * Maps decade strings to combined filter chip labels used by the FilterPanel.
 *
 * Keys are the filter values stored in Zustand state.
 * Values are the user-visible chip labels combining decade + epoch description.
 *
 * Coverage: 1920s through 2020s (10 decades + present).
 * Format: "[decade]s — [Epoch1] / [Epoch2]"
 *
 * Example AC value: "1960s" → "1960s — British Invasion / Motown"
 */
export const ERA_EPOCH_LABELS: Record<string, string> = {
  "1920s": "1920s — Jazz Age / Blues",
  "1930s": "1930s — Swing / Delta Blues",
  "1940s": "1940s — Bebop / R&B",
  "1950s": "1950s — Rock & Roll / Cool Jazz",
  "1960s": "1960s — British Invasion / Motown",
  "1970s": "1970s — Punk / Disco / Funk",
  "1980s": "1980s — New Wave / Hip-Hop / Metal",
  "1990s": "1990s — Grunge / Britpop / Electronic",
  "2000s": "2000s — Indie / Nu-Metal / Neo-Soul",
  "2010s": "2010s — Streaming Era / DIY",
  "2020s": "2020s — Post-Pandemic / Hyperpop",
};