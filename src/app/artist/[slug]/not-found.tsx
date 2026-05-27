"use client";

/**
 * /artist/[slug] not-found page (Story 1.12).
 *
 * Triggered when page.tsx calls notFound() after resolveSlug throws
 * ArtistNotFoundError. Next.js automatically sets HTTP status 404.
 *
 * Displays a prominent TopNav search bar so the user can immediately
 * search for a valid artist without navigating away.
 */

import { useRouter } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import type { Artist } from "@/lib/data/types";

export default function NotFound() {
  const router = useRouter();

  function handleArtistSelect(artist: Artist) {
    // Navigate to the artist's route — the Server Component will resolve the slug
    router.push(`/artist/${artist.slug}`);
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      <TopNav onArtistSelect={handleArtistSelect} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[15px] text-[#A09880] text-center px-4">
          We couldn&apos;t find that artist. Try searching above.
        </p>
      </div>
    </div>
  );
}
