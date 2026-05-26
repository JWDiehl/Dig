/**
 * GET /api/graph/[mbid]
 *
 * Assembles and returns the influence graph for a given MusicBrainz ID.
 * ISR revalidate = 3600 (1 hour) — serves popular artists from edge cache.
 *
 * Response shapes:
 *   { data: GraphData }                        — full success
 *   { data: GraphData, warnings: string[] }    — partial source failure
 *   { error: 'Artist not found', code: 404 }   — MBID not in MusicBrainz
 *   { error: 'Unable to reach data sources', code: 503 } — total failure
 */

import { NextRequest, NextResponse } from "next/server";
import { buildGraph } from "@/lib/data/graph-builder";
import { ArtistNotFoundError } from "@/lib/errors";

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  // Next.js 16: params is a Promise — must be awaited
  const { mbid } = await params;

  try {
    const data = await buildGraph(mbid, 2);
    if (data.warnings.length > 0) {
      return NextResponse.json({ data, warnings: data.warnings });
    }
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      return NextResponse.json(
        { error: "Artist not found", code: 404 },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Unable to reach data sources", code: 503 },
      { status: 503 },
    );
  }
}
