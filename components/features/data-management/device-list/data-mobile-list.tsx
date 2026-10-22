"use client";

import { Eye, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/lib/use-locale";

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
  allCurrentPageSelected,
  onSelectAllPage,
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
  allCurrentPageSelected?: boolean;
  onSelectAllPage?: () => void;
}) {
  const { t } = useTranslate();

  return (
    <div className="space-y-2 md:hidden">
      {rows.length > 0 && onSelectAllPage ? (
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs glass-inset">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(allCurrentPageSelected)}
              onChange={onSelectAllPage}
              className="size-4 cursor-pointer rounded border-input bg-background text-primary"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-medium text-foreground">
              {allCurrentPageSelected
                ? t("deviceList.bulk.clearPage")
                : t("deviceList.bulk.selectAllPage", { count: String(rows.length) })}
            </span>
          </label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {selectedIds.size} {t("deviceList.bulk.selected")}
          </span>
        </div>
      ) : null}

      {rows.map((row) => {
        const validation = getValidationBadge(row);
        const primaryName = getPrimaryName(row);
        const primaryCode = getPrimaryCode(row);
        const isSelected = selectedIds.has(row.id);

        return (
          <div
            key={row.id}
            className={`rounded-2xl border bg-card p-3 shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              isSelected ? "border-primary/60 bg-primary/5" : "border-border/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection(row)}
                  aria-label={t("deviceList.mobile.selectRow", { name: primaryName || row.id })}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input bg-background text-primary"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-semibold">{primaryName || "-"}</p>
                  <p className="truncate font-mono text-[10px] tabular-nums text-muted-foreground">{primaryCode || "-"}</p>
                </div>
              </div>
              {showValidationBadge && validation ? (
                <span title={validation.title} className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] leading-tight ${validation.className}`}>
                  {validation.label}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono text-[9px] uppercase tracking-[0.08em]">
                {t("deviceList.mobile.status")} <span className="font-semibold text-foreground">{getStatus(row) || "-"}</span>
              </span>
              <span className="font-mono text-[10px] tabular-nums">{getUpdatedAt(row)}</span>
            </div>
            {supportsPopFilter ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {t("deviceList.mobile.pop")} <span className="text-foreground">{getPopLabel(row) || "-"}</span>
              </p>
            ) : null}
            <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/40 pt-2">
              {canTraceTopology ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenTrace(row)}
                  className="h-7 rounded-full font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <Waypoints className="mr-1 size-3" />
                  {t("deviceList.mobile.trace")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenDetail(row)}
                className="h-7 rounded-full font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <Eye className="mr-1 size-3" />
                {t("deviceList.mobile.detail")}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
