"use client";

/**
 * FilterPanel — slide-down filter strip beneath the TopNav.
 *
 * Position: fixed top-12 (below the 48px nav), z-40.
 * Opens/closes via CSS max-height transition on the `isOpen` prop.
 *
 * Derives available eras and genre families from graphData.artists at render time.
 * Chip toggle updates are communicated upward via onFiltersChange — the parent
 * calls Zustand setFilters, which triggers GraphCanvas Effect 3 → D3 applyFilters().
 * This component never touches Zustand directly.
 */

import { ERA_EPOCH_LABELS } from "@/lib/data/constants";
import { GENRE_FAMILIES, getGenreFamily } from "@/graph/filters";
import { FilterChip } from "./FilterChip";
import type { GraphData } from "@/lib/data/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FilterPanelProps {
  graphData: GraphData | null;
  filterEras: string[];
  filterGenres: string[];
  onFiltersChange: (eras: string[], genres: string[]) => void;
  isOpen: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleValue(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterPanel({
  graphData,
  filterEras,
  filterGenres,
  onFiltersChange,
  isOpen,
}: FilterPanelProps) {
  // Derive available eras from current graph (ERA_EPOCH_LABELS keys present in data)
  const availableEras = graphData
    ? Object.keys(ERA_EPOCH_LABELS).filter((era) =>
        graphData.artists.some((a) => a.era === era),
      )
    : [];

  // Derive available genre families from current graph
  const availableFamilies = graphData
    ? Array.from(
        new Set(
          graphData.artists
            .map((a) => getGenreFamily(a.genres))
            .filter((f): f is string => f !== null),
        ),
      )
    : [];

  const hasAnyFilter = filterEras.length > 0 || filterGenres.length > 0;

  return (
    <div
      className="fixed top-12 left-0 right-0 z-40 overflow-hidden"
      style={{
        maxHeight: isOpen ? "56px" : "0",
        transition: "max-height 200ms ease-in-out",
        backgroundColor: "rgba(10,10,10,0.96)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="flex items-center gap-2 px-4 h-[56px] overflow-x-auto">
        {/* Era chips */}
        {availableEras.map((era) => (
          <FilterChip
            key={era}
            label={ERA_EPOCH_LABELS[era] ?? era}
            isActive={filterEras.includes(era)}
            onToggle={() =>
              onFiltersChange(toggleValue(filterEras, era), filterGenres)
            }
          />
        ))}

        {/* Divider between era and genre when both are present */}
        {availableEras.length > 0 && availableFamilies.length > 0 && (
          <div
            className="flex-shrink-0 w-px h-4 self-center"
            style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            aria-hidden="true"
          />
        )}

        {/* Genre chips */}
        {availableFamilies.map((family) => (
          <FilterChip
            key={family}
            label={GENRE_FAMILIES[family] ?? family}
            isActive={filterGenres.includes(family)}
            onToggle={() =>
              onFiltersChange(filterEras, toggleValue(filterGenres, family))
            }
          />
        ))}

        {/* Spacer pushes Clear All to the right */}
        <div className="flex-1" />

        {/* Clear All — only when at least one filter is active */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => onFiltersChange([], [])}
            className="flex-shrink-0 text-[12px] text-[#555555] hover:text-[#F1F1F1] transition-colors cursor-pointer select-none"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
