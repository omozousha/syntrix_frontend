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
  getPrimaryName,
  getPrimaryCode,
  getStatus,
  getUpdatedAt,
  getPopLabel,
  getValidationBadge,
  onOpenDetail,
  onOpenTrace,
}: {
  rows: GenericItem[];
  showValidationBadge: boolean;
  supportsPopFilter: boolean;
  canTraceTopology: boolean;
  getPrimaryName: (row: GenericItem) => string;
  getPrimaryCode: (row: GenericItem) => string;
  getStatus: (row: GenericItem) => string;
  getUpdatedAt: (row: GenericItem) => string;
  getPopLabel: (row: GenericItem) => string;
  getValidationBadge: (row: GenericItem) => ValidationBadge;
  onOpenDetail: (row: GenericItem) => void;
  onOpenTrace: (row: GenericItem) => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => {
        const validation = getValidationBadge(row);
        const primaryName = getPrimaryName(row);
        const primaryCode = getPrimaryCode(row);

        return (
          <div key={row.id} className="rounded-md border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-semibold">{primaryName || "-"}</p>
                <p className="truncate text-xs text-muted-foreground">{primaryCode || "-"}</p>
              </div>
              {showValidationBadge && validation ? (
                <span title={validation.title} className={`inline-flex rounded border px-2 py-0.5 text-[11px] ${validation.className}`}>
                  {validation.label}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Status: {getStatus(row) || "-"}</span>
              <span>{getUpdatedAt(row)}</span>
            </div>
            {supportsPopFilter ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">POP: {getPopLabel(row)}</p>
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
