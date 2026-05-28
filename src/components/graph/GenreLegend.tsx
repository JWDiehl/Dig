/**
 * GenreLegend — floating color key for the genre-family node palette.
 *
 * Fixed to the bottom-left of the viewport, floats above the D3 canvas (z-20).
 * Shows the five genre families and their associated node color.
 *
 * Must stay in sync with the color constants in src/graph/nodes.ts.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

const GENRES = [
  { color: "#F0B429", label: "Jazz · Blues · Soul" },
  { color: "#FF4F1F", label: "Rock · Punk · Metal" },
  { color: "#A855F7", label: "Electronic · Ambient" },
  { color: "#22D3EE", label: "Hip-Hop · R&B" },
  { color: "#94A3B8", label: "Classical · Other" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function GenreLegend() {
  return (
    <aside
      className="fixed bottom-4 left-4 z-20 pointer-events-none select-none"
      aria-label="Genre color key"
    >
      <ul
        className="flex flex-col gap-[6px] px-3 py-2 rounded-md"
        style={{
          backgroundColor: "rgba(10,10,10,0.80)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {GENRES.map(({ color, label }) => (
          <li key={label} className="flex items-center gap-2">
            {/* Color dot */}
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: 7,
                height: 7,
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}88`,
              }}
              aria-hidden="true"
            />
            {/* Label */}
            <span
              className="text-[10px] tracking-[0.06em]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {label}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
