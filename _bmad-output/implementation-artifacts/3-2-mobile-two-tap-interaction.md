# Story 3.2: Mobile Two-Tap Interaction & Bottom Sheet Detail Panel

## Status: ready-for-dev

## Story

**As a** music lover on mobile,
**I want** to tap a node to preview it and tap again to navigate,
**So that** I can explore the influence graph on my phone without accidentally pivoting on every tap.

---

## Acceptance Criteria

**AC1 — First tap opens bottom sheet**
Given I tap any non-focal node on a < 768px viewport
When the first tap fires
Then a bottom sheet slides up from the bottom edge (full-width, `max-height: 40vh`)
And it shows: artist name, genre, era, AudioPreviewControl (audio begins immediately — no 500ms dwell)
And it shows the pivot prompt: "Tap again to explore [Artist Name]" in `text-secondary`

**AC2 — Second tap commits pivot**
Given the bottom sheet is open and I tap the same node a second time
When the second tap fires
Then the pivot commits: graph transitions, sheet closes, URL updates

**AC3 — Dismiss on outside tap or swipe down**
Given the bottom sheet is open and I tap outside it or swipe down
When the dismiss gesture fires
Then the sheet closes with no pivot

**AC4 — Expand affordance in sheet**
Given a non-expanded node is shown in the bottom sheet
When the sheet is open
Then an expand button is accessible within the sheet
And tapping it triggers hop expansion for that node

**AC5 — Audio immediate on mobile**
Given an artist node has an audio preview available
When the bottom sheet opens (mobile)
Then audio begins immediately (no 500ms dwell — sheet open = trigger)
And closing the sheet stops the audio

**AC6 — Tests**
Given `MobileBottomSheet.test.tsx` is implemented
When I run `npm run test:run`
Then tests cover: renders artist info, shows pivot prompt, calls onPivot on second-tap sim, calls onClose on dismiss

---

## Tasks / Subtasks

- [ ] **Task 1 — Add `autoPlayDelay` prop to `AudioPreviewControl`**
  - [ ] Add optional `autoPlayDelay?: number` to `AudioPreviewControlProps` (default `HOVER_DWELL_MS`)
  - [ ] Replace hardcoded `HOVER_DWELL_MS` in the setTimeout with `autoPlayDelay ?? HOVER_DWELL_MS`
  - [ ] Update `AudioPreviewControl.test.tsx` mock if needed — the test already mocks the timer via `vi.useFakeTimers()`

- [ ] **Task 2 — Create `MobileBottomSheet` component**
  - [ ] Create `src/components/graph/MobileBottomSheet.tsx`
  - [ ] `"use client"` directive, named export `MobileBottomSheet`
  - [ ] Props: `artist: Artist`, `onPivot: () => void`, `onClose: () => void`, `onExpand: (mbid: string) => void`
  - [ ] Position: `fixed bottom-0 left-0 right-0 z-30`, `max-height: 40vh`, rounded top corners
  - [ ] Background: `rgba(16,16,16,0.98)` with `backdrop-filter: blur(12px)`, top border `rgba(255,255,255,0.08)`
  - [ ] Slide-in animation: `translateY(100%) → translateY(0)` using `requestAnimationFrame` pattern (same as NodeDetailPanel)
  - [ ] **Content layout** (scrollable if needed):
    - Drag handle pill at top-center (visual affordance)
    - Artist name: 16px / 600 / `#F1F1F1`
    - Genre + era: 13px / `#666666`
    - `AudioPreviewControl` with `autoPlayDelay={0}` (immediate)
    - Pivot prompt: "Tap again to explore {artist.name}" in 13px / `#666666` with subtle top border
    - Expand button: "Expand connections" — calls `onExpand(artist.mbid)`, shown below pivot prompt
  - [ ] **Swipe-down dismiss**: track `touchStart.clientY` on `onTouchStart`, on `onTouchEnd` if delta > 60px downward → call `onClose`
  - [ ] **Escape key**: also closes (for a11y)
  - [ ] `role="dialog"` and `aria-label="{artist.name} details"`
  - [ ] Uses `useAudioPreview(artist.mbid, artist.name)` hook internally

- [ ] **Task 3 — Add `tappedMbid` state and two-tap `handlePivot` to `page.tsx`**
  - [ ] Add `const [tappedMbid, setTappedMbid] = useState<string | null>(null)`
  - [ ] Import `isMobileViewport` from `@/lib/motion`
  - [ ] Import `expandGraphNode` from `@/graph/simulation`
  - [ ] Import `MobileBottomSheet` from `@/components/graph/MobileBottomSheet`
  - [ ] Rewrite `handlePivot` to intercept mobile first-tap vs second-tap:
    ```typescript
    const handlePivot = useCallback(
      (mbid: string) => {
        setHoveredMbid(null);
        if (isMobileViewport()) {
          if (tappedMbid === mbid) {
            setTappedMbid(null);
            // actual pivot — same as desktop path
            setFocalArtist(mbid);
            const artist = graphData?.artists.find(a => a.mbid === mbid);
            window.history.pushState({ focalMbid: mbid }, "", artist?.slug ? `/artist/${artist.slug}` : "");
          } else {
            setTappedMbid(mbid);  // first tap → open sheet
          }
          return;
        }
        // Desktop: immediate pivot
        setFocalArtist(mbid);
        const artist = graphData?.artists.find(a => a.mbid === mbid);
        window.history.pushState({ focalMbid: mbid }, "", artist?.slug ? `/artist/${artist.slug}` : "");
      },
      [tappedMbid, graphData, setFocalArtist],
    );
    ```
  - [ ] Derive `tappedArtist = graphData?.artists.find(a => a.mbid === tappedMbid) ?? null`
  - [ ] In success render, render MobileBottomSheet + dismiss overlay when `tappedArtist` is non-null:
    ```tsx
    {tappedArtist && (
      <>
        {/* Transparent overlay: tapping it dismisses sheet without pivot */}
        <div className="fixed inset-0 z-[25]" onClick={() => setTappedMbid(null)} />
        <MobileBottomSheet
          artist={tappedArtist}
          onPivot={() => handlePivot(tappedArtist.mbid)}
          onClose={() => setTappedMbid(null)}
          onExpand={(mbid) => void expandGraphNode(mbid)}
        />
      </>
    )}
    ```
  - [ ] Clear `tappedMbid` when `handleArtistSelect` fires (search selection navigates away)
  - [ ] Also clear `tappedMbid` when `handlePivot` commits the actual pivot

- [ ] **Task 4 — Add `tappedMbid` state and two-tap `handlePivot` to `ArtistGraphView.tsx`**
  - [ ] Same pattern as Task 3 — `tappedMbid`, `tappedArtist`, two-tap `handlePivot`
  - [ ] For `ArtistGraphView`, the actual pivot is `router.push(`/artist/${artist.slug}`)` (not pushState)
  - [ ] `handlePivot` on mobile: first tap sets `tappedMbid`; second tap calls `router.push`
  - [ ] Clear `tappedMbid` in `handleArtistSelect`
  - [ ] Render MobileBottomSheet + overlay when `tappedArtist` non-null

- [ ] **Task 5 — Write tests**
  - [ ] Create `src/components/graph/MobileBottomSheet.test.tsx`:
    - Mock `useAudioPreview` → `{ previewUrl: null, isPending: false }` (same pattern as NodeDetailPanel tests)
    - Mock `useDigStore` for audioPreviewId
    - Test: renders artist name, genre, era
    - Test: renders pivot prompt "Tap again to explore [Artist Name]"
    - Test: `onPivot` called when pivot button/prompt is tapped (fireEvent.click)
    - Test: `onClose` called when swipe or Escape fires
    - Test: `role="dialog"` present
    - Use `expect(el).not.toBeNull()` pattern
  - [ ] Run `npm run test:run` — all existing + new tests pass

---

## Dev Notes

### Key Insight: Two-Tap Via React Intercept — No D3 Changes Needed

D3's `click` event fires on BOTH mouse clicks (desktop) AND touch taps (mobile). The existing `onPivot` callback is called on every click/tap. The two-tap model is implemented entirely in React by intercepting `handlePivot`:

- **First tap** (tappedMbid is null or different node): set `tappedMbid` → show `MobileBottomSheet`
- **Second tap** (tappedMbid === this node): clear `tappedMbid`, do actual pivot

**No changes to `src/graph/nodes.ts` or `src/graph/simulation.ts`** are needed for the two-tap logic. Story 3.1 already suppressed hover on mobile, and Story 3.2 handles the mobile tap interaction purely in React.

### Transparent Overlay for Dismiss

When the bottom sheet is open, a `z-[25]` full-screen overlay sits above the canvas (z-0 through z-20) but below the sheet (z-30). Clicking/tapping it dismisses the sheet:

```tsx
<div className="fixed inset-0 z-[25]" onClick={() => setTappedMbid(null)} />
<MobileBottomSheet ... />  {/* z-30 — above overlay */}
```

This intercepts taps on the graph canvas behind the sheet without interfering with the nav (z-50) or filter panel (z-40).

### AudioPreviewControl — Immediate Play on Mobile

Add `autoPlayDelay?: number` prop (default: `HOVER_DWELL_MS = 500`). MobileBottomSheet passes `autoPlayDelay={0}`.

```typescript
// AudioPreviewControl.tsx — change:
}, HOVER_DWELL_MS);
// To:
}, autoPlayDelay ?? HOVER_DWELL_MS);
```

The existing timer logic is otherwise unchanged. `setTimeout(fn, 0)` still yields before executing, so the audio element is fully set up before play is attempted.

### MobileBottomSheet — Swipe Detection

Simple touch tracking — no gesture library needed:

```typescript
const touchStartY = useRef(0);

function handleTouchStart(e: React.TouchEvent) {
  touchStartY.current = e.touches[0].clientY;
}

function handleTouchEnd(e: React.TouchEvent) {
  const deltaY = e.changedTouches[0].clientY - touchStartY.current;
  if (deltaY > 60) onClose(); // swipe down by 60px
}
```

### MobileBottomSheet — Expand Button

Show for all non-focal nodes (even already-expanded ones — `expandGraphNode` guards against double-expansion). The button in the sheet:

```tsx
<button
  type="button"
  onClick={() => onExpand(artist.mbid)}
  className="..."
>
  Expand connections
</button>
```

The `expandGraphNode` function imported from `@/graph/simulation` handles the expand logic including the `expandedMbids.has(mbid)` guard.

### MobileBottomSheet — Slide-Up Animation

Follow `NodeDetailPanel`'s `requestAnimationFrame` pattern:

```typescript
const [isVisible, setIsVisible] = useState(false);
useEffect(() => {
  const id = requestAnimationFrame(() => setIsVisible(true));
  return () => cancelAnimationFrame(id);
}, []);
```

```tsx
className={[
  "fixed bottom-0 left-0 right-0 z-30 rounded-t-xl",
  "transition-transform duration-250",
  isVisible ? "translate-y-0" : "translate-y-full",
].join(" ")}
```

### MobileBottomSheet — Content with Audio

The sheet uses `useAudioPreview(artist.mbid, artist.name)` internally, then renders `<AudioPreviewControl autoPlayDelay={0} previewUrl={previewUrl} mbid={artist.mbid} />`.

```tsx
{!isPending && previewUrl && (
  <AudioPreviewControl previewUrl={previewUrl} mbid={artist.mbid} autoPlayDelay={0} />
)}
```

### Files Not Changing

- `src/graph/nodes.ts` — no changes (two-tap is React-only)
- `src/graph/simulation.ts` — no changes
- `src/graph/GraphCanvas.tsx` — no changes
- `src/components/graph/NodeDetailPanel.tsx` — no changes (stays desktop-only)
- `src/components/nav/TopNav.tsx` — no changes

### What NOT To Do

- **Do NOT modify D3 nodes.ts click handler** — D3 click fires on tap; the React `handlePivot` intercept is sufficient
- **Do NOT use Radix Popover** for the bottom sheet — a simple `fixed` div with CSS transitions is cleaner and avoids portal/backdrop conflicts with the D3 SVG
- **Do NOT import `HOVER_DWELL_MS` in MobileBottomSheet** — just pass `autoPlayDelay={0}` directly
- **Do NOT add bottom sheet logic to `NodeDetailPanel`** — keep them separate components
- **Do NOT show the bottom sheet on desktop** — MobileBottomSheet renders only when `tappedArtist` is set, and `tappedMbid` is only set inside the `isMobileViewport()` branch of `handlePivot`
- **Do NOT call `expandGraphNode` directly in MobileBottomSheet** — pass it as `onExpand` prop from the parent

### Test Mock Pattern (from Story 2.2)

```typescript
vi.mock("@/hooks/useAudioPreview", () => ({
  useAudioPreview: () => ({ previewUrl: null, isPending: false }),
}));

vi.mock("@/store", () => ({
  useDigStore: (selector) => selector({ audioPreviewId: null, setAudioPreview: vi.fn() }),
}));
```

---

## Dev Agent Record

### Implementation Plan
_To be populated during implementation_

### Debug Log
_To be populated if issues arise_

### Completion Notes
_To be populated on completion_

---

## File List

_To be populated during implementation_

---

## Change Log

_To be populated during implementation_
