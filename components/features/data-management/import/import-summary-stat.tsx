"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ImportSummaryStatProps = {
  label: string;
  value: number;
  total?: number;
  tone?: "primary" | "success" | "warning" | "destructive";
};

/**
 * Stat summary for import step — label uppercase, value numeric with status color, optional progress bar when total is given.
 */
export function ImportSummaryStat({
  label,
  value,
  total,
  tone = "primary",
}: ImportSummaryStatProps) {
  const hasProgress = typeof total === "number";
  const ratio = hasProgress && total > 0 ? value / total : 0;
  const progressPercent = Math.round(ratio * 100);

  return (
    <div className="min-w-[160px]">
      <div
        className="p-4 flex flex-col gap-2 rounded-md border bg-card"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-mono tabular-nums font-medium">{value}</span>
          {hasProgress ? (
            <span className="text-sm text-muted-foreground">/ {total}</span>
          ) : null}
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="relative h-full transition-all duration-300 bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, (value / (total || 1))) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}