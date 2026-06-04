/**
 * GET /api/graph/[mbid]/expand
 *
 * Returns the +1 hop influence data for the given artist MBID.
 * Used by the D3 expand affordance to load per-node additional connections
 * without reloading the entire graph.
 *
 * Response shapes:
 *   { artists: Artist[], edges: InfluenceEdge[] }  — on success (may be empty arrays)
 *
 * This route NEVER returns an `{ error }` shape — empty arrays signal no data.
 * revalidate = 3600: expansion data changes rarely; edge-cached for 1 hour.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/data/graph-builder";

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  const { mbid } = await params;

  try {
    const data = await buildGraph(mbid, 1);
    return NextResponse.json({ artists: data.artists, edges: data.edges });
  } catch {
    // ArtistNotFoundError, DataSourceError, or any failure → empty expansion
    // The client treats empty arrays as "no additional data" and shows DataThinBadge
    return NextResponse.json({ artists: [], edges: [] });
  }
}
