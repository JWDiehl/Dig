# Story 2.2: Audio Preview Integration (Spotify + AudioPreviewControl)

## Status: review

## Story

**As a** music lover,
**I want** to hear a short audio preview when I hover an artist node,
**So that** the graph becomes a sensory experience — not purely visual.

---

## Acceptance Criteria

**AC1 — AudioPreviewProvider interface**
Given `src/lib/audio/audio-preview.ts` is implemented
When I inspect the file
Then it defines `interface AudioPreviewProvider { getPreviewUrl(mbid: string, artistName: string): Promise<string | null> }` only
And no client component imports it directly — only the API route consumes it

**AC2 — Preview API route**
Given `GET /api/preview/[mbid]?name={artistName}` is called with a valid MBID
Then it returns `{ data: { previewUrl: string } }` when a Spotify preview is available
And `{ data: { previewUrl: null } }` when unavailable (not `{ error }`)
And `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are accessed server-side only
And `export const revalidate = 0`
And if Spotify credentials are missing/invalid, returns `{ data: { previewUrl: null } }` (graceful degradation — not an error)

**AC3 — Audio starts after 500ms hover dwell**
Given a node is hovered and a preview URL is available
When `HOVER_DWELL_MS` (500ms) elapses from when `AudioPreviewControl` mounts
Then audio begins playing automatically; the play button becomes a pause icon; waveform animates
And if the cursor leaves before 500ms (unmounting the component), no audio ever starts

**AC4 — One preview at a time**
Given audio is playing from one node and I hover a second node
When the second node's panel opens and its dwell completes
Then the first audio stops and the second begins

**AC5 — No preview = component absent**
Given no Spotify preview URL is available for an artist
When `<NodeDetailPanel>` opens
Then `<AudioPreviewControl>` is NOT rendered — not disabled, not greyed — the slot is absent

**AC6 — Tests**
Given tests are implemented for AudioPreviewControl and useAudioPreview
When `npm run test:run` executes
Then all existing tests plus new tests pass with no regressions

---

## Tasks / Subtasks

- [x] **Task 1 — Create AudioPreviewProvider interface**
  - [x] `src/lib/audio/audio-preview.ts` — AudioPreviewProvider interface
  - [x] `src/lib/audio/index.ts` — barrel export

- [x] **Task 2 — Create Spotify implementation**
  - [x] `src/lib/audio/spotify.ts` — Client Credentials flow, module-level token cache, search-by-name → top-tracks → first preview_url
  - [x] Graceful degradation: missing credentials → null; any error → null

- [x] **Task 3 — Create `/api/preview/[mbid]` route**
  - [x] `src/app/api/preview/[mbid]/route.ts` — revalidate=0, always returns `{ data: { previewUrl } }`

- [x] **Task 4 — Create `useAudioPreview` hook**
  - [x] Updated existing `src/hooks/useAudioPreview.ts` — added artistName param, staleTime=0, retry=false, error-swallowing queryFn

- [x] **Task 5 — Create `AudioPreviewControl` component**
  - [x] `src/components/graph/AudioPreviewControl.tsx` — HOVER_DWELL_MS auto-play, play/pause toggle, waveform bars, Zustand coordination
  - [x] Waveform `@keyframes` added to `src/app/globals.css`

- [x] **Task 6 — Update `NodeDetailPanel` to integrate AudioPreviewControl**
  - [x] useAudioPreview called with artist.mbid + artist.name
  - [x] isPending → pulsing dots; previewUrl → AudioPreviewControl; null → absent

- [x] **Task 7 — Update callers of NodeDetailPanel**
  - [x] No changes needed — callers already pass `artist: Artist` which has `artist.mbid`

- [x] **Task 8 — Write tests**
  - [x] `src/components/graph/AudioPreviewControl.test.tsx` — 5 tests
  - [x] `src/hooks/useAudioPreview.test.ts` — 5 tests
  - [x] `src/components/graph/NodeDetailPanel.test.tsx` — mocked useAudioPreview
  - [x] 171/171 pass, zero regressions

---

## Dev Notes

### Spotify Client Credentials Flow (Server-Side Only)

```
1. POST https://accounts.spotify.com/api/token
   Authorization: Basic base64("CLIENT_ID:CLIENT_SECRET")
   Content-Type: application/x-www-form-urlencoded
   Body: grant_type=client_credentials

2. GET https://api.spotify.com/v1/search?q={artistName}&type=artist&limit=1
   Authorization: Bearer {access_token}
   → artists.items[0].id = Spotify artist ID

3. GET https://api.spotify.com/v1/artists/{spotifyId}/top-tracks?market=US
   Authorization: Bearer {access_token}
   → tracks[].preview_url (may be null per track)
   → return first non-null preview_url, or null if all are null
```

**Token cache pattern** (module-level in spotify.ts):
```typescript
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  // ... fetch new token ...
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}
```

**Missing credentials → graceful degradation:**
```typescript
export async function getPreviewUrl(mbid: string, artistName: string): Promise<string | null> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return null;
  try {
    // ... Spotify calls ...
  } catch {
    return null; // never throw — audio is enhancement, not core feature
  }
}
```

### API Route Pattern

```typescript
// src/app/api/preview/[mbid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPreviewUrl } from "@/lib/audio/spotify";

export const revalidate = 0; // preview URLs expire — no ISR

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
```

Always returns `{ data: { previewUrl: string | null } }` — never `{ error }`.

### AudioPreviewControl: Auto-Play Timer

The 500ms dwell timer starts when AudioPreviewControl mounts (which is after the 200ms panel dwell). Total time from hover: ~700ms. This is acceptable — the AC says "HOVER_DWELL_MS (500ms) of dwell elapses" from AudioPreviewControl's perspective.

```typescript
useEffect(() => {
  if (!previewUrl) return;
  const audio = new Audio(previewUrl);
  audio.volume = 0.7;
  audioRef.current = audio;

  const timer = setTimeout(() => {
    audio.play().catch(() => {}); // autoplay may be blocked by browser
    setAudioPreview(mbid);
    setIsPlaying(true);
  }, HOVER_DWELL_MS);

  return () => {
    clearTimeout(timer);
    audio.pause();
    audioRef.current = null;
    // Only clear the global audioPreviewId if this component owns it
    setAudioPreview((current) => current === mbid ? null : current);
    setIsPlaying(false);
  };
}, [previewUrl, mbid, setAudioPreview]);
```

**Note on `setAudioPreview` cleanup**: Zustand `setAudioPreview(id)` takes an ID or null. The cleanup needs to only clear if this component is still the active one. Since Zustand `setAudioPreview` takes a value (not a reducer), use a read-check:
```typescript
// In cleanup:
if (audioPreviewId === mbid) setAudioPreview(null);
```
But `audioPreviewId` in the cleanup closure would be stale. Use a ref instead:
```typescript
const activeIdRef = useRef(audioPreviewId);
useEffect(() => { activeIdRef.current = audioPreviewId; }, [audioPreviewId]);
// In cleanup: if (activeIdRef.current === mbid) setAudioPreview(null);
```

Or simpler: just always call `setAudioPreview(null)` on unmount and accept that the 2nd-node scenario (already handled by the 2nd AudioPreviewControl calling `setAudioPreview(newMbid)`) means a brief null in between. Since the panel closes (and Audio.pause() is called) before the new panel opens, this is fine.

### AudioPreviewControl: Stop on Foreign Play

```typescript
// If another preview starts while this one is playing, stop
useEffect(() => {
  if (isPlaying && audioPreviewId !== mbid) {
    audioRef.current?.pause();
    setIsPlaying(false);
  }
}, [audioPreviewId, isPlaying, mbid]);
```

### AudioPreviewControl: Waveform Animation

4 bars with staggered CSS animations. No external library — pure CSS:

```tsx
<div className="flex items-end gap-[2px] h-4">
  {[0, 1, 2, 3].map((i) => (
    <div
      key={i}
      className={`w-[3px] rounded-sm bg-current ${isPlaying ? "animate-waveform" : ""}`}
      style={{
        height: isPlaying ? undefined : "8px",
        animationDelay: `${i * 75}ms`,
      }}
    />
  ))}
</div>
```

Add to `globals.css`:
```css
@keyframes waveform {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}
.animate-waveform {
  animation: waveform 0.8s ease-in-out infinite;
}
```

### NodeDetailPanel Update

Current `NodeDetailPanelProps`:
```typescript
export interface NodeDetailPanelProps {
  artist: Artist;
  onClose: () => void;
}
```

Updated:
```typescript
export interface NodeDetailPanelProps {
  artist: Artist;
  mbid: string;  // ← ADD: needed for useAudioPreview hook and AudioPreviewControl
  onClose: () => void;
}
```

The panel already receives `artist` which has `artist.mbid`, so `mbid` is redundant. But keeping it explicit makes the prop contract clear and avoids drilling `artist.mbid` everywhere. Actually, since `artist: Artist` already contains `mbid`, don't add a separate `mbid` prop — just use `artist.mbid` directly inside the panel.

**Do NOT add a `mbid` prop** — `artist.mbid` is available. Keep `NodeDetailPanelProps` unchanged.

Loading state inside NodeDetailPanel (while preview URL is being fetched):
```tsx
{/* Audio preview slot */}
{isPending && (
  <div className="mt-3 flex gap-1 items-center">
    {[0,1,2].map(i => (
      <div key={i} className="w-1 h-1 rounded-full bg-[#333333] animate-pulse"
           style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </div>
)}
{!isPending && previewUrl && (
  <AudioPreviewControl previewUrl={previewUrl} mbid={artist.mbid} />
)}
{/* !isPending && !previewUrl → nothing rendered (slot absent) */}
```

### useAudioPreview Hook Pattern

```typescript
// src/hooks/useAudioPreview.ts
import { useQuery } from "@tanstack/react-query";

export function useAudioPreview(mbid: string, artistName: string) {
  const { data, isPending } = useQuery({
    queryKey: ["preview", mbid],
    queryFn: async () => {
      const res = await fetch(
        `/api/preview/${mbid}?name=${encodeURIComponent(artistName)}`
      );
      if (!res.ok) return { previewUrl: null };
      const json = await res.json() as { data: { previewUrl: string | null } };
      return json.data;
    },
    enabled: !!mbid && !!artistName,
    staleTime: 0,
    retry: false, // don't retry — audio is enhancement, not core
  });

  return {
    previewUrl: data?.previewUrl ?? null,
    isPending,
  };
}
```

### File Locations (Architecture Compliance)

```
src/lib/audio/
  audio-preview.ts   ← interface (NEW)
  spotify.ts         ← implementation (NEW)
  index.ts           ← barrel (NEW)

src/app/api/preview/[mbid]/
  route.ts           ← API route (NEW)

src/hooks/
  useAudioPreview.ts ← TanStack Query hook (NEW)

src/components/graph/
  AudioPreviewControl.tsx       ← component (NEW)
  AudioPreviewControl.test.tsx  ← tests (NEW)

src/hooks/
  useAudioPreview.test.ts ← hook tests (NEW)

MODIFY:
  src/components/graph/NodeDetailPanel.tsx  ← replace placeholder
```

Note: Architecture doc references `detail-panel/AudioPreviewControl.tsx` but the project uses `src/components/graph/` for all graph-related components. Use `src/components/graph/AudioPreviewControl.tsx`.

### What NOT To Do

- **Do NOT** import `audio-preview.ts` interface in any client component — only the API route uses it
- **Do NOT** put Spotify credentials in client-side code or env vars prefixed with `NEXT_PUBLIC_`
- **Do NOT** throw errors from `getPreviewUrl()` — audio is enhancement, always return null on failure
- **Do NOT** use `isLoading` — use `isPending` (TanStack Query v5 convention enforced by architecture)
- **Do NOT** add `revalidate` to the preview route other than 0 — preview URLs are short-lived
- **Do NOT** render a disabled/greyed AudioPreviewControl when no preview — render nothing
- **Do NOT** add a separate `mbid` prop to NodeDetailPanel — use `artist.mbid` which is already on the `artist: Artist` prop
- **Do NOT** use `react-player`, `howler`, or any audio library — use the native `HTMLAudioElement` directly
- **Do NOT** use `NEXT_PUBLIC_` prefix on Spotify env vars — they must be server-side only

### Established Patterns to Follow

**Named exports** (not default) for all components:
```typescript
export function AudioPreviewControl(...) {}  // ✅
```

**TanStack Query v5 destructuring:**
```typescript
const { data, isPending } = useQuery(...)  // ✅ isPending not isLoading
```

**Color values** (deep-space palette):
- Text: `#F1F1F1` (primary), `#666666` (secondary)
- Accent for play/pause controls: `#F1F1F1` (matches node label color)

**Test pattern** — `expect(el).not.toBeNull()` not jest-dom:
```typescript
const btn = screen.queryByRole("button");
expect(btn).not.toBeNull();  // ✅
```

**Env var access in server code:**
```typescript
process.env.SPOTIFY_CLIENT_ID  // ✅ server-side
// Never: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID  ❌
```

### Spotify API Notes (2026)

- Client Credentials token endpoint: `https://accounts.spotify.com/api/token` — unchanged
- Search endpoint: `https://api.spotify.com/v1/search?q={query}&type=artist&limit=1`
- Top tracks endpoint: `https://api.spotify.com/v1/artists/{id}/top-tracks?market=US`
- `preview_url` on tracks: still available but may be null for some tracks/regions
- Authorization header for token: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`
- Tokens expire in 3600 seconds — cache with 60s buffer

### Environment Variables for Vercel

The Vercel deployment needs `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` set in the dashboard. Until set, the feature degrades gracefully (no audio, no errors). Obtain from [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).

---

## Dev Agent Record

### Implementation Plan
Spotify Client Credentials with module-level token cache. API route reads `?name=` query param (avoids extra MusicBrainz lookup). AudioPreviewControl uses native HTMLAudioElement with HOVER_DWELL_MS auto-play timer, Zustand audioPreviewId for one-preview-at-a-time coordination. NodeDetailPanel tests mocked useAudioPreview to avoid QueryClientProvider requirement.

### Debug Log
NodeDetailPanel.test.tsx started failing after NodeDetailPanel imported useAudioPreview — fixed by mocking the hook in the test file.
useAudioPreview.test.ts fetch mock needed inline vi.fn() per test (same pattern as musicbrainz.test.ts) rather than module-level.

### Completion Notes
- AudioPreviewProvider interface + Spotify implementation + barrel (src/lib/audio/)
- /api/preview/[mbid] route: revalidate=0, always { data: { previewUrl } }
- useAudioPreview hook updated: artistName param, staleTime=0, error-swallowing
- AudioPreviewControl: 500ms auto-play, play/pause toggle, 4-bar waveform animation
- Waveform @keyframes added to globals.css
- NodeDetailPanel: isPending→dots, previewUrl→AudioPreviewControl, null→absent
- 171/171 tests pass

---

## File List

- `src/lib/audio/audio-preview.ts` — NEW: AudioPreviewProvider interface
- `src/lib/audio/spotify.ts` — NEW: Spotify Client Credentials implementation
- `src/lib/audio/index.ts` — NEW: barrel export
- `src/app/api/preview/[mbid]/route.ts` — NEW: preview API route
- `src/hooks/useAudioPreview.ts` — UPDATED: artistName param, staleTime=0, retry=false
- `src/hooks/useAudioPreview.test.ts` — NEW: 5 tests
- `src/components/graph/AudioPreviewControl.tsx` — NEW: audio player component
- `src/components/graph/AudioPreviewControl.test.tsx` — NEW: 5 tests
- `src/components/graph/NodeDetailPanel.tsx` — UPDATED: useAudioPreview + AudioPreviewControl
- `src/components/graph/NodeDetailPanel.test.tsx` — UPDATED: mock useAudioPreview
- `src/app/globals.css` — UPDATED: waveform @keyframes animation

---

## Change Log

- Story 2.2 implemented: Spotify audio preview + AudioPreviewControl — 2026-05-28
