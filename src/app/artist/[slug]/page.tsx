/**
 * /artist/[slug] — Server Component entry point (Story 1.12).
 *
 * Responsibilities:
 *   1. Await params (Next.js 16 — params is a Promise)
 *   2. Resolve the URL slug to a MusicBrainz MBID via resolveSlug
 *   3. On ArtistNotFoundError → trigger not-found.tsx (HTTP 404)
 *   4. On success → render ArtistGraphView client component with the MBID
 *
 * No "use client" — this intentionally runs as a Server Component so that
 * resolveSlug (which calls the MusicBrainz API) runs at request time on the server.
 */

import { notFound } from "next/navigation";
import { resolveSlug } from "@/lib/data/slugs";
import { ArtistNotFoundError } from "@/lib/errors";
import { ArtistGraphView } from "./ArtistGraphView";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next.js 16: params is a Promise — must be awaited before use
  const { slug } = await params;

  let mbid: string;
  try {
    mbid = await resolveSlug(slug);
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      // notFound() returns `never` — TypeScript knows execution stops here
      notFound();
    }
    // DataSourceError or unexpected failures → propagate to error boundary (500)
    throw error;
  }

  return <ArtistGraphView mbid={mbid} />;
}
