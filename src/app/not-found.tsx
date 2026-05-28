"use client";

/**
 * Global 404 fallback page (Story 1.12).
 *
 * Rendered by Next.js for any route not handled by the app that doesn't
 * have a more specific not-found.tsx (e.g. non-artist 404s).
 *
 * Provides the TopNav search bar so users can navigate to any artist
 * from any 404 state.
 */

import { useRouter } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import type { Artist } from "@/lib/data/types";

export default function NotFound() {
  const router = useRouter();

  function handleArtistSelect(artist: Artist) {
    router.push(`/artist/${artist.slug}`);
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      <TopNav onArtistSelect={handleArtistSelect} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[15px] text-[#555555] text-center px-4">
          Page not found. Try searching for an artist.
        </p>
      </div>
    </div>
  );
}
