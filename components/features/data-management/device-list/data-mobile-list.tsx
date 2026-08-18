"use client";

import { Eye, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";

type GenericItem = Record<string, unknown> & {
  id: string;
};

type ValidationBadge = {
  label: string;
  className: string;
  title: string;
} | null;

export function DataMobileList({
  rows,
  showValidationBadge,
  supportsPopFilter,
  canTraceTopology,
  selectedIds,
  getPrimaryName,
  getPrimaryCode,
  getStatus,
  getUpdatedAt,
  getPopLabel,
  getValidationBadge,
  onOpenDetail,
  onOpenTrace,
  onToggleSelection,
}: {
  rows: GenericItem[];
  showValidationBadge: boolean;
  supportsPopFilter: boolean;
  canTraceTopology: boolean;
  selectedIds: Set<string>;
  getPrimaryName: (row: GenericItem) => string;
  getPrimaryCode: (row: GenericItem) => string;
  getStatus: (row: GenericItem) => string;
  getUpdatedAt: (row: GenericItem) => string;
  getPopLabel: (row: GenericItem) => string;
  getValidationBadge: (row: GenericItem) => ValidationBadge;
  onOpenDetail: (row: GenericItem) => void;
  onOpenTrace: (row: GenericItem) => void;
  onToggleSelection: (row: GenericItem) => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => {
        const validation = getValidationBadge(row);
        const primaryName = getPrimaryName(row);
        const primaryCode = getPrimaryCode(row);
        const isSelected = selectedIds.has(row.id);

        return (
          <div
            key={row.id}
            className={`rounded-xl border bg-card p-3 shadow-2xs transition-colors ${
              isSelected ? "border-primary/60 bg-primary/5" : "border-border/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection(row)}
                  aria-label={`Pilih ${primaryName || row.id}`}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input bg-background text-primary"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-semibold">{primaryName || "-"}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{primaryCode || "-"}</p>
                </div>
              </div>
              {showValidationBadge && validation ? (
                <span title={validation.title} className={`inline-flex shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] leading-tight ${validation.className}`}>
                  {validation.label}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Status: <span className="font-semibold text-foreground">{getStatus(row) || "-"}</span></span>
              <span className="font-mono text-[10px]">{getUpdatedAt(row)}</span>
            </div>
            {supportsPopFilter ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">POP: <span className="font-mono text-[10px]">{getPopLabel(row)}</span></p>
            ) : null}
            <div className={`mt-3 grid gap-2 ${canTraceTopology ? "grid-cols-2" : "grid-cols-1"}`}>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenDetail(row)}>
                <Eye className="mr-1.5 size-3.5" />
                Detail
              </Button>
              {canTraceTopology ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenTrace(row)}>
                  <Waypoints className="mr-1.5 size-3.5" />
                  Trace
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
