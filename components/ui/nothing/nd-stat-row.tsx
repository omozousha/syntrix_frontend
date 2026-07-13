import * as React from "react";
import type { NdTextColor } from "./nothing-types";
import { NdLabel } from "./nd-label";
import { NdValue } from "./nd-value";
import { NdProgressBar } from "./nd-progress-bar";
import { cn } from "@/lib/utils";

export type NdStatRowProps = {
  /** Label text (will be Space Mono ALL CAPS 11px) */
  label: string;
  /** Numeric or string value */
  value: string | number;
  /** Color of the value — status color if numeric threshold exceeded */
  valueColor?: NdTextColor;
  /** Optional unit displayed in small caps after value */
  unit?: string;
  /** If true, value is treated as progress percentage (0-100) and renders segmented progress bar */
  isProgress?: boolean;
  /** Max value for progress mode */
  max?: number;
  /** Progress tone when in progress mode */
  tone?: "neutral" | "good" | "moderate" | "over";
  /** Optional inline hint (small caps) */
  hint?: string;
  /** Optional interactive link — value becomes interactive */
  asLink?: boolean;
  /** Optional onClick for link */
  onClick?: () => void;
  /** Additional className */
  className?: string;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Compact spacing */
  compact?: boolean;
  /** Use monospace font for value (default true) */
  mono?: boolean;
};

/**
 * Stat Row — label + value pair with optional progress bar.
 * Label: Space Mono ALL CAPS 11px --text-secondary
 * Value: Space Mono numeric with status color
 * Progress: Segmented bar (Nothing signature viz)
 */
export function NdStatRow({
  label,
  value,
  valueColor = "primary",
  unit,
  isProgress = false,
  max = 100,
  tone = "neutral",
  hint,
  asLink = false,
  onClick,
  className,
  direction = "horizontal",
  compact = false,
  mono = true,
}: NdStatRowProps) {
  const isHorizontal = direction === "horizontal";
  const gap = compact ? 4 : 12;

  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity",
        isHorizontal ? "flex-row" : "flex-col",
        className,
      )}
      style={{
        gap,
        opacity: 1,
      }}
    >
      <NdLabel color="secondary">{label}</NdLabel>

      {isProgress ? (
        <NdProgressBar
          value={typeof value === "number" ? value : Number(value)}
          max={max}
          tone={tone as "neutral" | "good" | "moderate" | "over"}
          size="md"
          showValue={true}
          unit={unit}
        />
      ) : (
        <NdValue
          color={valueColor}
          unit={unit}
          asLink={asLink}
          onClick={onClick}
        >
          {value}
        </NdValue>
      )}

      {hint && (
        <span
          className="nd-label"
          style={{
            fontSize: 9,
            color: "var(--nd-text-disabled)",
            marginLeft: 4,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}