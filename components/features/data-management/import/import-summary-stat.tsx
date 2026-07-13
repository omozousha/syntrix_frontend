"use client";

import * as React from "react";
import { NdLabel, NdValue, NdProgressBar, NdTextColor } from "@/components/ui/nothing";

export type ImportSummaryStatProps = {
  label: string;
  value: number;
  total?: number;
  tone?: NdTextColor;
};

/**
 * Stat summary for import step — label Space Mono ALL CAPS,
 * value numeric with status color, optional progress bar when total is given.
 */
export function ImportSummaryStat({
  label,
  value,
  total,
  tone = "primary",
}: ImportSummaryStatProps) {
  const hasProgress = typeof total === "number";
  const ratio = hasProgress && total > 0 ? value / total : 0;
  const progressTone: "neutral" | "good" | "moderate" | "over" =
    label.toLowerCase().includes("error") || label.toLowerCase().includes("gagal")
      ? ratio >= 0.5
        ? "over"
        : ratio >= 0.2
          ? "moderate"
          : "good"
      : "good";

  return (
    <div
      className="flex flex-col gap-2 rounded-md border p-4"
      style={{
        background: "var(--nd-surface)",
        borderColor: "var(--nd-border-visible)",
        minWidth: 160,
      }}
    >
      <NdLabel color="secondary">{label}</NdLabel>
      <NdValue size="lg" color={tone}>
        {value}
        {hasProgress ? (
          <span style={{ marginLeft: 4, color: "var(--nd-text-disabled)" }}>
            / {total}
          </span>
        ) : null}
      </NdValue>
      {hasProgress ? (
        <NdProgressBar
          value={value}
          max={total ?? 100}
          tone={progressTone}
          showValue={false}
          size="sm"
        />
      ) : null}
    </div>
  );
}
