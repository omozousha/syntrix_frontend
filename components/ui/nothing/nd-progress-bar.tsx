import * as React from "react";
import { cn } from "@/lib/utils";

export type NdProgressTone = "neutral" | "good" | "moderate" | "over";

const TONE_VAR: Record<NdProgressTone, string> = {
  neutral: "var(--nd-text-display)",
  good: "var(--nd-success)",
  moderate: "var(--nd-warning)",
  over: "var(--nd-accent)",
};

/**
 * Segmented Progress Bar — signature Nothing data visualization.
 * Discrete blocks with gaps, mechanical instrument-like appearance.
 */
export function NdProgressBar({
  value,
  max = 100,
  tone = "neutral",
  size = "md",
  showValue = true,
  unit,
  className,
}: {
  value: number;
  max?: number;
  tone?: NdProgressTone;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  unit?: string;
  className?: string;
}) {
  const clampedValue = Math.max(0, Math.min(max, value));
  const percentage = max > 0 ? Math.min(1, clampedValue / max) : 0;

  const sizes = {
    sm: { height: 4, segmentWidth: 6, gap: 1 },
    md: { height: 8, segmentWidth: 10, gap: 2 },
    lg: { height: 16, segmentWidth: 16, gap: 2 },
  };

  const { height, segmentWidth, gap } = sizes[size];
  const segmentCount = 20;
  const filledSegments = Math.round(percentage * segmentCount);
  const fillColor = TONE_VAR[tone];
  return (
    <div className={cn("flex items-end gap-1", className)}>
      <div
        className="flex items-end"
        style={{ height, width: "100%", gap }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Progress ${Math.round(percentage * 100)}%`}
      >
        {Array.from({ length: segmentCount }, (_, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              width: segmentWidth,
              height: i < filledSegments ? "100%" : "25%",
              background:
                i < filledSegments ? fillColor : "var(--nd-border)",
              borderRadius: 0,
              transition: "height 150ms ease-out, background 150ms ease-out",
            }}
          />
        ))}
      </div>

      {showValue && (
        <div
          className="flex items-baseline gap-1 ml-2"
          style={{ flexShrink: 0 }}
        >
          <span
            style={{
              fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
              color: fillColor,
              fontWeight: 400,
            }}
          >
            {clampedValue}
          </span>
          {unit && (
            <span
              style={{
                fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "var(--nd-text-disabled)",
                textTransform: "uppercase",
              }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
