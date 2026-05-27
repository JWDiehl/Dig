/**
 * zoom.ts — D3 zoom/pan behavior for the Dig graph canvas.
 *
 * Exports:
 *   initializeZoom(svg, zoomGroup) — attaches zoom to SVG; applies transform to zoomGroup
 *   handleResize(svg, zoomGroup, width, height) — re-centers after viewport resize
 *   cleanupZoom(svg) — removes zoom event listeners; called on unmount
 *
 * Constants (local — NOT in graph/constants.ts which is for animation/physics/sizing):
 *   ZOOM_SCALE_MIN = 0.3  (shows focal + all 1-hop neighbors at once)
 *   ZOOM_SCALE_MAX = 3.0  (labels legible at max zoom)
 *
 * RULE: The zoom transform is applied to the <g class="zoom-group"> child, NOT the SVG
 * itself. The SVG element is the event target and must stay untransformed. Direction
 * labels live outside zoom-group and remain fixed regardless of pan/zoom.
 *
 * Anti-patterns to avoid:
 *   ❌ svg.attr('transform', event.transform)  — transforms the SVG element itself
 *   ✅ zoomGroup.attr('transform', ...)        — transforms only moveable content
 */

import * as d3 from "d3";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_SCALE_MIN = 0.3; // Shows focal + all 1-hop neighbors at once
const ZOOM_SCALE_MAX = 3.0; // Labels legible at maximum zoom level

// ─── Selection type aliases ───────────────────────────────────────────────────

type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;
type ZoomGroupSel = d3.Selection<SVGGElement, unknown, null, undefined>;

// ─── Module-level state ───────────────────────────────────────────────────────

let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attach D3 zoom/pan behavior to the SVG element.
 *
 * All zoom transforms are applied to `zoomGroup` so that direction labels
 * (outside zoom-group) remain fixed in place while nodes/edges move with pan.
 *
 * Disables dblclick zoom to prevent accidental zooming during fast node
 * double-clicks (which would interfere with the pivot interaction).
 */
export function initializeZoom(svg: SvgSel, zoomGroup: ZoomGroupSel): void {
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([ZOOM_SCALE_MIN, ZOOM_SCALE_MAX])
    .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      zoomGroup.attr("transform", event.transform.toString());
    });

  svg.call(zoomBehavior);

  // Disable dblclick zoom — prevents accidental zoom on fast pivot double-clicks
  svg.on("dblclick.zoom", null);
}

/**
 * Re-center the zoom view at the SVG midpoint after a viewport resize.
 * Updates SVG dimensions and re-centers the zoom origin.
 *
 * @param svg       The SVG selection (zoom event target)
 * @param zoomGroup The zoom-group selection (receives transform attribute)
 * @param width     New viewport width in pixels
 * @param height    New viewport height in pixels
 */
export function handleResize(
  svg: SvgSel,
  zoomGroup: ZoomGroupSel,
  width: number,
  height: number,
): void {
  if (!zoomBehavior) return;
  svg.attr("width", width).attr("height", height);
  zoomBehavior.translateTo(svg, width / 2, height / 2);
  void zoomGroup; // accepted by signature; reserved for future re-layout
}

/**
 * Remove all zoom event listeners and reset module state.
 * Called by cleanupGraph() before clearing the SVG on component unmount.
 */
export function cleanupZoom(svg: SvgSel | null): void {
  if (!svg || !zoomBehavior) return;
  svg.on(".zoom", null);
  zoomBehavior = null;
}
