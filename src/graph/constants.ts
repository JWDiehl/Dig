/**
 * Graph engine constants — all animation timing, physics, opacity, and sizing values.
 *
 * RULE: Never hardcode these values inline in any file under src/graph/.
 * Always import the named constant. This is enforced by the architecture
 * (see AGENTS.md) and verified by the Story 1.3 acceptance criteria grep.
 *
 * Example — correct:
 *   simulation.transition().duration(PIVOT_DURATION_MS)
 *
 * Example — wrong (will fail code review):
 *   simulation.transition().duration(700)  // ❌ hardcoded
 */

// ─── Timing ──────────────────────────────────────────────────────────────────

/** Duration of the pivot transition animation in milliseconds (~700ms settle). */
export const PIVOT_DURATION_MS = 700;

/**
 * Dwell delay before NodeDetailPanel opens on node hover (ms).
 * Prevents the panel flickering open during fast cursor sweeps across the canvas.
 * Distinct from HOVER_DWELL_MS, which gates audio preview (Story 2.2).
 */
export const HOVER_DETAIL_DELAY_MS = 200;

/**
 * Hover dwell time before Spotify audio preview begins (ms).
 * Audio starts only after the cursor has rested on a node for this duration.
 */
export const HOVER_DWELL_MS = 500;

/**
 * Debounce delay for the artist search input (ms).
 * Search API is not called until the user pauses typing for this duration.
 */
export const SEARCH_DEBOUNCE_MS = 300;

// ─── Data threshold ───────────────────────────────────────────────────────────

/**
 * Minimum number of influence relationships for an artist to be considered
 * "data-rich". Used by D3 node rendering to decide whether to show the amber dot.
 * Must match DATA_THIN_THRESHOLD in src/lib/data/constants.ts.
 */
export const DATA_THIN_THRESHOLD = 3;

// ─── Opacity ─────────────────────────────────────────────────────────────────

/**
 * Default opacity for influence edges (Tusk color at 13%).
 * Applied by edges.ts during initial render.
 */
export const EDGE_OPACITY_DEFAULT = 0.13;

/**
 * Opacity applied to nodes that are outside the active filter selection (12%).
 * Nodes are dimmed, never hidden, when filters are active.
 * Applied imperatively by filters.ts via D3 selection — zero React re-renders.
 */
export const NODE_OPACITY_DIMMED = 0.12;

// ─── Node radii ──────────────────────────────────────────────────────────────

/** Radius of the Focal Artist node (largest; White Rabbit fill). */
export const NODE_RADIUS_FOCAL = 24;

/** Radius of 1-hop influence nodes (medium; genre color at 72% opacity). */
export const NODE_RADIUS_HOP1 = 16;

/** Radius of 2-hop influence nodes (smallest; genre color at 50% opacity). */
export const NODE_RADIUS_HOP2 = 11;

// ─── Physics ─────────────────────────────────────────────────────────────────

/**
 * D3 force simulation alpha decay rate.
 * Lower values produce a longer, smoother settle; higher values snap quickly.
 * Default D3 value is 0.0228; 0.028 gives a slightly crisper settle for Dig's layout.
 */
export const SIMULATION_ALPHA_DECAY = 0.028;