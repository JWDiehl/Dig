/**
 * AudioPreviewProvider — swappable interface for audio preview URL resolution.
 *
 * Only `src/app/api/preview/[mbid]/route.ts` consumes an implementation directly.
 * No client component ever imports this file — all preview fetching is server-side.
 *
 * To swap providers (e.g. replace Spotify with another service): implement this
 * interface in a new file and update the route.ts import. Zero feature redesign.
 *
 * NFR-4: Audio preview abstraction.
 */
export interface AudioPreviewProvider {
  /**
   * Resolve a 30-second preview URL for the given artist.
   *
   * @param mbid       MusicBrainz ID of the artist (for future provider lookup)
   * @param artistName Display name — used by search-based providers (e.g. Spotify)
   * @returns Preview URL string, or null when unavailable or on any failure
   */
  getPreviewUrl(mbid: string, artistName: string): Promise<string | null>;
}
