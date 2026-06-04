/**
 * simulation.ts — D3 force simulation orchestrator for the Dig graph engine.
 *
 * Module-level mutable state: D3 owns all SVG DOM. React never touches SVG
 * children after initializeGraph() runs. D3 simulation state (positions,
 * velocities, alpha) lives here — NOT in Zustand or React.
 *
 * Exports:
 *   initializeGraph(svgEl, graphData, onPivot) — called once on mount
 *   updateGraphData(graphData)                 — called on new focal artist
 *   cleanupGraph()                             — called on unmount
 */

import * as d3 from "d3";
import type { GraphData, InfluenceEdge } from "@/lib/data/types";
import type { GraphNode, GraphLink } from "@/graph/types";
import { renderNodes, updateNodePositions } from "./nodes";
import { renderEdges, updateEdgePositions } from "./edges";
import { initializeZoom, handleResize, cleanupZoom } from "./zoom";
import { beginPivotVisuals } from "./pivot";
import { fetchExpandData } from "./expand";
import { prefersReducedMotion } from "@/lib/motion";
import {
  SIMULATION_ALPHA_DECAY,
  NODE_RADIUS_FOCAL,
  NODE_RADIUS_HOP1,
  NODE_RADIUS_HOP2,
} from "@/graph/constants";

// ─── Module-level mutable state ───────────────────────────────────────────────
// D3 simulation state lives here — NOT in React state or Zustand.

type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;
type ZoomGroupSel = d3.Selection<SVGGElement, unknown, null, undefined>;
type NodeSel = d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;
type EdgeSel = d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown>;

let sim: d3.Simulation<GraphNode, GraphLink> | null = null;
let svgSel: SvgSel | null = null;
let zoomGroupSel: ZoomGroupSel | null = null;
let nodeGroupSel: NodeSel | null = null;
let edgeLineSel: EdgeSel | null = null;
let onPivotFn: (mbid: string) => void = () => {};
let onHoverFn: (mbid: string | null) => void = () => {};
let cachedHop1Mbids: Set<string> = new Set();
let resizeHandlerFn: (() => void) | null = null;
// ─── Expansion state ──────────────────────────────────────────────────────────
let expandedMbids: Set<string> = new Set();
let currentGraphData: GraphData | null = null;

// ─── Data conversion ──────────────────────────────────────────────────────────

/**
 * Derive which artist MBIDs are hop-1 (directly connected to the focal artist).
 * Used by nodes.ts to apply correct radius and opacity per hop level.
 */
function buildHop1Mbids(graphData: GraphData): Set<string> {
  const { focalArtist, edges } = graphData;
  const hop1 = new Set<string>();

  for (const edge of edges) {
    // upstream edge directly targeting focal → source is hop-1 upstream
    if (edge.direction === "upstream" && edge.targetId === focalArtist.mbid) {
      hop1.add(edge.sourceId);
    }
    // downstream edge sourced from focal → target is hop-1 downstream
    if (edge.direction === "downstream" && edge.sourceId === focalArtist.mbid) {
      hop1.add(edge.targetId);
    }
  }

  return hop1;
}

/** Convert GraphData.artists → GraphNode[] with direction inferred from edges. */
function buildNodes(graphData: GraphData): GraphNode[] {
  const { focalArtist, artists, edges } = graphData;

  // Build sets for O(1) direction lookup
  const upstreamSources = new Set(
    edges.filter((e) => e.direction === "upstream").map((e) => e.sourceId),
  );
  const downstreamTargets = new Set(
    edges.filter((e) => e.direction === "downstream").map((e) => e.targetId),
  );

  return artists.map((artist): GraphNode => {
    let direction: "focal" | "upstream" | "downstream";

    if (artist.mbid === focalArtist.mbid) {
      direction = "focal";
    } else if (upstreamSources.has(artist.mbid)) {
      direction = "upstream";
    } else if (downstreamTargets.has(artist.mbid)) {
      direction = "downstream";
    } else {
      // Fallback: intermediate hop-2 nodes not yet classified
      direction = "upstream";
    }

    return {
      mbid: artist.mbid,
      name: artist.name,
      genres: artist.genres,
      direction,
      isDataThin: artist.isDataThin,
      opacity: 1,
    };
  });
}

/** Convert GraphData.edges → GraphLink[] with string source/target IDs.
 *  D3's forceLink resolves strings → GraphNode refs via .id(d => d.mbid). */
function buildLinks(edges: InfluenceEdge[]): GraphLink[] {
  return edges.map(
    (edge): GraphLink => ({
      // D3 mutates source/target to object refs during simulation.
      // Cast suppresses TS string→GraphNode warning — this is correct D3 usage.
      source: edge.sourceId as unknown as GraphNode,
      target: edge.targetId as unknown as GraphNode,
      confidence: edge.confidence,
    }),
  );
}

// ─── SVG setup helpers ────────────────────────────────────────────────────────

/** Append SVG <defs> with a Gaussian glow filter (applied once per mount). */
function setupGlowDefs(svg: SvgSel): void {
  const defs = svg.append("defs");
  const filter = defs
    .append("filter")
    .attr("id", "glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  filter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "coloredBlur");

  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");
}

/** Render static direction labels at fixed SVG positions (not in zoom group). */
function renderDirectionLabels(svg: SvgSel, width: number, height: number): void {
  const g = svg.append("g").attr("class", "direction-labels");
  const midY = height / 2;

  const addLabel = (x: number, text: string) =>
    g
      .append("text")
      .attr("x", x)
      .attr("y", midY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#FFFFFF")
      .attr("opacity", 0.18)
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.22em")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .attr("user-select", "none")
      .text(text);

  addLabel(width * 0.15, "← INFLUENCES");
  addLabel(width * 0.85, "INFLUENCED →");
}

// ─── Simulation tick ──────────────────────────────────────────────────────────

function ticked(): void {
  if (nodeGroupSel) updateNodePositions(nodeGroupSel);
  if (edgeLineSel) updateEdgePositions(edgeLineSel);
}

// ─── Wrapped pivot handler ────────────────────────────────────────────────────

/**
 * Called when a non-focal node is clicked (by nodes.ts click handler).
 * Phase 1: Immediately applies D3 visual transitions (beginPivotVisuals).
 * Phase 2: Notifies React parent (onPivotFn) → store update → TanStack Query refetch.
 * This keeps D3 visual work transparent to React — the prop callback is unchanged.
 */
function wrappedPivot(mbid: string): void {
  onHoverFn(null); // close detail panel immediately on pivot
  if (nodeGroupSel) beginPivotVisuals(mbid, nodeGroupSel, cachedHop1Mbids);
  onPivotFn(mbid);
}

function wrappedHover(mbid: string | null): void {
  onHoverFn(mbid);
}

function wrappedExpand(mbid: string): void {
  void expandGraphNode(mbid);
}

// ─── DataThinBadge helper ─────────────────────────────────────────────────────

function addDataThinDot(mbid: string): void {
  if (!nodeGroupSel) return;
  nodeGroupSel
    .filter((d) => d.mbid === mbid)
    .each(function (d) {
      const el = d3.select(this);
      if (!el.select(".data-thin-dot").empty()) return; // already present
      const isHop1 = cachedHop1Mbids.has(d.mbid);
      let r: number;
      if (d.direction === "focal") r = NODE_RADIUS_FOCAL;
      else if (isHop1) r = NODE_RADIUS_HOP1;
      else r = NODE_RADIUS_HOP2;
      el.append<SVGCircleElement>("circle")
        .attr("class", "data-thin-dot")
        .attr("r", 3)
        .attr("fill", "#F0B429")
        .attr("cy", -r)
        .attr("pointer-events", "none");
    });
}

// ─── On-demand hop expansion ──────────────────────────────────────────────────

/**
 * Expand a leaf node by fetching its +1 hop connections and merging them
 * into the live D3 simulation. Called when the user clicks the expand ring.
 *
 * Expansion is D3-internal: React's graphData prop is not updated. The
 * expanded state persists until the next pivot (which calls updateGraphData
 * and resets expandedMbids and currentGraphData).
 */
export async function expandGraphNode(mbid: string): Promise<void> {
  if (!sim || !zoomGroupSel || !svgSel || !currentGraphData) return;
  if (expandedMbids.has(mbid)) return; // guard against double-click

  // Mark expanded immediately to prevent re-entry during async fetch
  expandedMbids.add(mbid);

  // Hide expand ring on this node
  if (nodeGroupSel) {
    nodeGroupSel
      .filter((d) => d.mbid === mbid)
      .select(".expand-ring")
      .attr("opacity", 0)
      .attr("pointer-events", "none");
  }

  // Fetch expansion data
  const { artists: newArtists, edges: newEdges } = await fetchExpandData(mbid);

  // Empty result → DataThinBadge, no simulation update
  if (newArtists.length === 0 && newEdges.length === 0) {
    addDataThinDot(mbid);
    return;
  }

  // Get current simulation nodes (with their live x/y positions)
  const existingNodes = sim.nodes();
  const existingMbids = new Set(existingNodes.map((n) => n.mbid));

  // Find expanded node for starting position + direction inheritance
  const expandedNode = existingNodes.find((n) => n.mbid === mbid);
  const expandedDirection = expandedNode?.direction ?? "upstream";
  const startX = expandedNode?.x ?? 0;
  const startY = expandedNode?.y ?? 0;

  // Build GraphNodes for artists not already in the graph
  const addedArtists = newArtists.filter((a) => !existingMbids.has(a.mbid));
  const addedNodes: GraphNode[] = addedArtists.map((a): GraphNode => ({
    mbid: a.mbid,
    name: a.name,
    genres: a.genres,
    direction: expandedDirection,
    isDataThin: a.isDataThin,
    opacity: 1,
    // Start at expanded node's position with small jitter; simulation drifts them out
    x: startX + (Math.random() - 0.5) * 30,
    y: startY + (Math.random() - 0.5) * 30,
  }));

  if (addedNodes.length === 0 && newEdges.length === 0) {
    // All artists were duplicates
    addDataThinDot(mbid);
    return;
  }

  // Merge into currentGraphData
  currentGraphData = {
    ...currentGraphData,
    artists: [...currentGraphData.artists, ...addedArtists],
    edges: [...currentGraphData.edges, ...newEdges],
  };

  const allNodes = [...existingNodes, ...addedNodes];
  const allLinks = buildLinks(currentGraphData.edges);

  // Update simulation nodes then links (order matters: nodes first so forceLink can resolve IDs)
  sim.nodes(allNodes);
  (sim.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(allLinks);

  // Re-render via D3 general join (existing → UPDATE stays, new → ENTER drifts in)
  const edgesContainer = zoomGroupSel.select<SVGGElement>("g.edges");
  const nodesContainer = zoomGroupSel.select<SVGGElement>("g.nodes");
  edgeLineSel = renderEdges(edgesContainer, allLinks);
  nodeGroupSel = renderNodes(
    nodesContainer,
    allNodes,
    cachedHop1Mbids,
    wrappedPivot,
    wrappedHover,
    wrappedExpand,
    expandedMbids,
  );

  sim.alpha(0.3).restart();

  if (prefersReducedMotion()) {
    sim.stop();
    ticked();
  }
}

// ─── Instant position assignment (prefersReducedMotion) ───────────────────────

function assignInstantPositions(
  nodes: GraphNode[],
  width: number,
  height: number,
): void {
  nodes.forEach((node, i) => {
    switch (node.direction) {
      case "focal":
        node.x = width / 2;
        node.y = height / 2;
        break;
      case "upstream": {
        // Spread upstream nodes in a cluster left of center
        const uTotal = nodes.filter((n) => n.direction === "upstream").length;
        const uIdx = nodes.filter((n) => n.direction === "upstream").indexOf(node);
        node.x = width * 0.25;
        node.y = height / 2 + ((uIdx - uTotal / 2) * 60);
        break;
      }
      case "downstream": {
        const dTotal = nodes.filter((n) => n.direction === "downstream").length;
        const dIdx = nodes.filter((n) => n.direction === "downstream").indexOf(node);
        node.x = width * 0.75;
        node.y = height / 2 + ((dIdx - dTotal / 2) * 60);
        break;
      }
    }
    void i; // suppress unused var
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the D3 graph engine.
 * Called ONCE from GraphCanvas's mount effect ([] deps).
 * Sets up SVG structure, force simulation, and renders initial data.
 */
export function initializeGraph(
  svgEl: SVGSVGElement,
  graphData: GraphData | null,
  onPivot: (mbid: string) => void,
  onHover: (mbid: string | null) => void,
): void {
  onPivotFn = onPivot;
  onHoverFn = onHover;
  currentGraphData = graphData;
  expandedMbids = new Set();
  svgSel = d3.select(svgEl);

  // Clear any stale content from previous mounts
  svgSel.selectAll("*").remove();

  // Dimensions: JSDOM returns 0 for clientWidth/Height, fall back to window or defaults
  const width =
    svgEl.clientWidth ||
    (typeof window !== "undefined" ? window.innerWidth : 0) ||
    1200;
  const height =
    svgEl.clientHeight ||
    (typeof window !== "undefined" ? window.innerHeight : 0) ||
    800;

  svgSel.attr("width", width).attr("height", height);

  // One-time SVG structure setup
  setupGlowDefs(svgSel);

  // zoom-group wraps edges + nodes so they pan/zoom together.
  // Direction labels stay outside zoom-group and remain fixed.
  zoomGroupSel = svgSel.append("g").attr("class", "zoom-group");
  zoomGroupSel.append("g").attr("class", "edges"); // edges behind nodes
  zoomGroupSel.append("g").attr("class", "nodes");
  renderDirectionLabels(svgSel, width, height); // fixed — outside zoom-group

  // Attach zoom/pan behavior (transform applied to zoomGroupSel)
  initializeZoom(svgSel, zoomGroupSel);

  // Window resize handler: update forces and zoom to match new dimensions
  resizeHandlerFn = () => {
    if (!svgSel || !zoomGroupSel || !sim) return;
    const newWidth =
      (typeof window !== "undefined" ? window.innerWidth : 1200) || 1200;
    const newHeight =
      (typeof window !== "undefined" ? window.innerHeight : 800) || 800;

    (sim.force("center") as d3.ForceCenter<GraphNode>)
      .x(newWidth / 2)
      .y(newHeight / 2);
    (sim.force("x") as d3.ForceX<GraphNode>).x((d) => {
      if (d.direction === "upstream") return newWidth * 0.25;
      if (d.direction === "downstream") return newWidth * 0.75;
      return newWidth / 2;
    });

    sim.alpha(0.1).restart();
    handleResize(svgSel, zoomGroupSel, newWidth, newHeight);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("resize", resizeHandlerFn);
  }

  if (!graphData) return;

  const nodes = buildNodes(graphData);
  const links = buildLinks(graphData.edges);
  cachedHop1Mbids = buildHop1Mbids(graphData);

  // Render initial nodes and edges via D3 join
  edgeLineSel = renderEdges(
    zoomGroupSel.select<SVGGElement>("g.edges"),
    links,
  );
  nodeGroupSel = renderNodes(
    zoomGroupSel.select<SVGGElement>("g.nodes"),
    nodes,
    cachedHop1Mbids,
    wrappedPivot,
    wrappedHover,
    wrappedExpand,
    expandedMbids,
  );

  // Force simulation setup
  sim = d3
    .forceSimulation<GraphNode, GraphLink>(nodes)
    .force(
      "link",
      d3
        .forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.mbid)
        .distance(150),
    )
    .force("charge", d3.forceManyBody<GraphNode>().strength(-600))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force(
      "x",
      d3
        .forceX<GraphNode>((d) => {
          if (d.direction === "upstream") return width * 0.2;
          if (d.direction === "downstream") return width * 0.8;
          return width / 2; // focal stays centered
        })
        .strength(0.5),
    )
    .force(
      "collision",
      d3.forceCollide<GraphNode>((d) => {
        const isHop1 = cachedHop1Mbids.has(d.mbid);
        if (d.direction === "focal") return NODE_RADIUS_FOCAL + 25;
        if (isHop1) return NODE_RADIUS_HOP1 + 25;
        return NODE_RADIUS_HOP2 + 25;
      }),
    )
    .alphaDecay(SIMULATION_ALPHA_DECAY)
    .on("tick", ticked);

  if (prefersReducedMotion()) {
    sim.stop();
    assignInstantPositions(nodes, width, height);
    ticked(); // Render once at final positions
  }
}

/**
 * Update the graph with new GraphData (new focal artist after pivot).
 * Called from GraphCanvas's [graphData] effect.
 */
export function updateGraphData(graphData: GraphData | null): void {
  if (!sim || !svgSel) return;
  if (!graphData) return;

  // Reset expansion state for the new focal artist
  expandedMbids = new Set();
  currentGraphData = graphData;

  const nodes = buildNodes(graphData);
  const links = buildLinks(graphData.edges);
  cachedHop1Mbids = buildHop1Mbids(graphData);

  const edgesContainer = zoomGroupSel
    ? zoomGroupSel.select<SVGGElement>("g.edges")
    : svgSel.select<SVGGElement>("g.edges");
  const nodesContainer = zoomGroupSel
    ? zoomGroupSel.select<SVGGElement>("g.nodes")
    : svgSel.select<SVGGElement>("g.nodes");

  edgeLineSel = renderEdges(edgesContainer, links);
  nodeGroupSel = renderNodes(
    nodesContainer,
    nodes,
    cachedHop1Mbids,
    wrappedPivot,
    wrappedHover,
    wrappedExpand,
    expandedMbids,
  );

  // Update simulation with new data and restart
  sim.nodes(nodes);
  (sim.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(links);
  sim.alpha(0.3).restart();

  if (prefersReducedMotion()) {
    sim.stop();
    const width = svgSel.attr("width") ? +svgSel.attr("width") : 1200;
    const height = svgSel.attr("height") ? +svgSel.attr("height") : 800;
    assignInstantPositions(nodes, width, height);
    ticked();
  }
}

/**
 * Stop simulation and clear SVG. Called on component unmount.
 */
export function cleanupGraph(): void {
  // Remove window resize listener before clearing state
  if (resizeHandlerFn && typeof window !== "undefined") {
    window.removeEventListener("resize", resizeHandlerFn);
    resizeHandlerFn = null;
  }

  if (sim) {
    sim.stop();
    sim = null;
  }

  // Remove zoom event listeners before clearing SVG content
  cleanupZoom(svgSel);

  if (svgSel) {
    svgSel.selectAll("*").remove();
    svgSel = null;
  }

  zoomGroupSel = null;
  nodeGroupSel = null;
  edgeLineSel = null;
  expandedMbids = new Set();
  currentGraphData = null;
}
