/**
 * GET /api/search?q={query}
 *
 * Artist search via MusicBrainz. Returns an array of Artist objects.
 * ISR revalidate = 86400 (24 hours) — artist name data changes rarely.
 *
 * Response shapes:
 *   { data: Artist[] }                    — success (including empty array)
 *   { error: string, code: 503 }          — MusicBrainz unreachable
 */

import { NextRequest, NextResponse } from "next/server";
import { searchArtists } from "@/lib/data/musicbrainz";
import { DataSourceError } from "@/lib/errors";

export const revalidate = 86400;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const artists = await searchArtists(q);
    return NextResponse.json({ data: artists });
  } catch (err) {
    if (err instanceof DataSourceError) {
      return NextResponse.json(
        { error: "Unable to reach data sources", code: 503 },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Unable to reach data sources", code: 503 },
      { status: 503 },
    );
  }
}
