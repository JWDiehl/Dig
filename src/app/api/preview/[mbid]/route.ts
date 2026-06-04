/**
 * GET /api/preview/[mbid]?name={artistName}
 *
 * Returns a Spotify 30-second preview URL for the given artist.
 * Artist name is provided as a query parameter to avoid an extra MusicBrainz
 * lookup server-side (the client already has the Artist object from graphData).
 *
 * Response shapes:
 *   { data: { previewUrl: string } }  — preview available
 *   { data: { previewUrl: null } }    — no preview (graceful, NOT an error)
 *
 * This route NEVER returns { error } — audio is an enhancement, not core.
 * revalidate = 0: Spotify preview URLs are short-lived; no ISR caching.
 *
 * SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are server-side env vars only.
 * They are never exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPreviewUrl } from "@/lib/audio/spotify";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mbid: string }> },
): Promise<NextResponse> {
  const { mbid } = await params;
  const name = req.nextUrl.searchParams.get("name") ?? "";

  if (!name.trim()) {
    return NextResponse.json({ data: { previewUrl: null } });
  }

  const previewUrl = await getPreviewUrl(mbid, name);
  return NextResponse.json({ data: { previewUrl } });
}
