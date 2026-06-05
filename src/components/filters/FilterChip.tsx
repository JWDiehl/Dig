"use client";

/**
 * FilterChip — a toggleable chip for era or genre filter selection.
 *
 * Uses role="checkbox" + aria-checked for screen reader semantics.
 * Active chips: amber text + border. Inactive: muted gray.
 */

export interface FilterChipProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

export function FilterChip({ label, isActive, onToggle }: FilterChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isActive}
      onClick={onToggle}
      className="flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer select-none"
      style={{
        color: isActive ? "#F0B429" : "#555555",
        border: `1px solid ${isActive ? "#F0B429" : "rgba(255,255,255,0.1)"}`,
        backgroundColor: isActive ? "rgba(240,180,41,0.08)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}
