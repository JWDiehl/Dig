"use client";

/**
 * FilterToggle — icon button with amber active-dot indicator.
 *
 * Shows a small amber dot (shape change, not color-only per WCAG) when any
 * filters are active, even while the panel is collapsed.
 */

export interface FilterToggleProps {
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
}

export function FilterToggle({ isOpen, isActive, onToggle }: FilterToggleProps) {
  const ariaLabel = isOpen
    ? "Close filters"
    : isActive
      ? "Filters active — toggle"
      : "Toggle filters";

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="p-2 rounded transition-colors cursor-pointer"
        style={{ color: isOpen || isActive ? "#F0B429" : "#555555" }}
      >
        {/* Inline funnel icon — no external icon library per architecture */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2 3h12M4 8h8M6 13h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Amber dot — appears when filters are active (shape change for color-blindness compliance) */}
      {isActive && (
        <span
          className="absolute top-1 right-1 w-[5px] h-[5px] rounded-full bg-[#F0B429] pointer-events-none"
          aria-label="Filters active"
        />
      )}
    </div>
  );
}
