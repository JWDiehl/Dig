/**
 * spotify.ts — Spotify Client Credentials implementation of AudioPreviewProvider.
 *
 * Fetches a 30-second preview URL for an artist via:
 *   1. POST /api/token → access token (cached module-level, ~1hr TTL)
 *   2. GET /v1/search?type=artist → Spotify artist ID
 *   3. GET /v1/artists/{id}/top-tracks → first non-null preview_url
 *
 * All failures return null — audio is an enhancement, never a hard dependency.
 * If SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET are absent, returns null immediately.
 *
 * Server-side only. Never imported by client components.
 */

import type { AudioPreviewProvider } from "./audio-preview";

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in: number };
    // Subtract 60s buffer so we refresh before actual expiry
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

// ─── Preview resolution ───────────────────────────────────────────────────────

/**
 * Resolve a preview URL for the given artist.
 *
 * `_mbid` is part of the AudioPreviewProvider interface contract (allows future
 * implementations to use MusicBrainz → Spotify ID lookup via external links).
 * This Spotify implementation searches by artist name instead.
 */
export async function getPreviewUrl(
  _mbid: string,
  artistName: string,
): Promise<string | null> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return null;
  if (!artistName.trim()) return null;

  try {
    const token = await getAccessToken();
    if (!token) return null;

    // Step 1: search Spotify for the artist by name
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      artists: { items: Array<{ id: string }> };
    };
    const spotifyId = searchData.artists?.items?.[0]?.id;
    if (!spotifyId) return null;

    // Step 2: get top tracks and return the first with a preview_url
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!tracksRes.ok) return null;

    const tracksData = (await tracksRes.json()) as {
      tracks: Array<{ preview_url: string | null }>;
    };

    for (const track of tracksData.tracks ?? []) {
      if (track.preview_url) return track.preview_url;
    }
    return null;
  } catch {
    return null; // never throw — audio is enhancement, not core feature
  }
}

export const spotifyProvider: AudioPreviewProvider = { getPreviewUrl };
