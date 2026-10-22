"use client";

import { CheckSquare, Download, Filter, Loader2, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/lib/use-locale";

export function DataBulkActions({
  selectedCount,
  selectedDownloadCount,
  supportsQrBulkDownload,
  downloadingQr,
  actionLoading,
  canWrite,
  canRestoreSelected,
  canBulkToggleStatus,
  isSoftDeleteResource,
  onDownloadQr,
  onRestore,
  onActivate,
  onDeactivate,
  onDelete,
  onClearSelection,
  onFilterBySelection,
  totalCount = 0,
  currentPageCount = 0,
  allCurrentPageSelected = false,
  allDatasetSelected = false,
  isSelectingAllDataset = false,
  onSelectCurrentPage,
  onSelectAllDataset,
}: {
  selectedCount: number;
  selectedDownloadCount: number;
  supportsQrBulkDownload: boolean;
  downloadingQr: boolean;
  actionLoading: boolean;
  canWrite: boolean;
  canRestoreSelected: boolean;
  canBulkToggleStatus: boolean;
  isSoftDeleteResource: boolean;
  onDownloadQr: () => void;
  onRestore: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onFilterBySelection?: () => void;
  totalCount?: number;
  currentPageCount?: number;
  allCurrentPageSelected?: boolean;
  allDatasetSelected?: boolean;
  isSelectingAllDataset?: boolean;
  onSelectCurrentPage?: () => void;
  onSelectAllDataset?: () => void;
}) {
  const { t } = useTranslate();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-2.5 shadow-xs glass-inset">
        {/* Left: Info and Select-All controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="font-mono text-[11px] tabular-nums font-semibold text-foreground">{selectedCount}</span>{" "}
              {t("deviceList.bulk.selected")}
            </span>
            {totalCount > 0 ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">
                / <span className="tabular-nums font-medium text-muted-foreground">{totalCount}</span>
              </span>
            ) : null}
          </div>

          {/* Quick select buttons */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/60">
            {onSelectCurrentPage && currentPageCount > 0 ? (
              <Button
                type="button"
                variant={allCurrentPageSelected ? "secondary" : "outline"}
                size="sm"
                onClick={onSelectCurrentPage}
                disabled={actionLoading || isSelectingAllDataset}
                title={allCurrentPageSelected ? t("deviceList.bulk.clearPage") : t("deviceList.bulk.selectAllPage", { count: String(currentPageCount) })}
                className="h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <CheckSquare className="mr-1 size-3" />
                {allCurrentPageSelected
                  ? t("deviceList.bulk.clearPage")
                  : t("deviceList.bulk.selectAllPage", { count: String(currentPageCount) })}
              </Button>
            ) : null}

            {onSelectAllDataset && totalCount > currentPageCount ? (
              <Button
                type="button"
                variant={allDatasetSelected ? "secondary" : "outline"}
                size="sm"
                onClick={onSelectAllDataset}
                disabled={actionLoading || isSelectingAllDataset || allDatasetSelected}
                title={allDatasetSelected ? t("deviceList.bulk.allDataSelected", { count: String(totalCount) }) : t("deviceList.bulk.selectAllData", { count: String(totalCount) })}
                className="h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                {isSelectingAllDataset ? (
                  <>
                    <Loader2 className="mr-1 size-3 animate-spin" />
                    {t("deviceList.bulk.selectingAll")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 size-3 text-primary" />
                    {allDatasetSelected
                      ? t("deviceList.bulk.allDataSelected", { count: String(totalCount) })
                      : t("deviceList.bulk.selectAllData", { count: String(totalCount) })}
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onFilterBySelection && selectedCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFilterBySelection}
              disabled={actionLoading}
              className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              <Filter className="mr-1.5 size-3.5" />
              {t("deviceList.bulk.addToFilter")}
            </Button>
          ) : null}
          {supportsQrBulkDownload ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadQr}
              disabled={selectedDownloadCount === 0 || downloadingQr || actionLoading}
              className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              <Download className="mr-1.5 size-3.5" />
              {downloadingQr ? t("deviceList.bulk.qrDownloading") : t("deviceList.bulk.downloadQr")}
            </Button>
          ) : null}
          {canWrite && selectedCount > 0 ? (
            <>
              {canRestoreSelected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRestore}
                  disabled={actionLoading}
                  className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  {t("deviceList.bulk.restore")}
                </Button>
              ) : null}
              {canBulkToggleStatus ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onActivate}
                    disabled={actionLoading}
                    className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  >
                    {t("deviceList.bulk.activate")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDeactivate}
                    disabled={actionLoading}
                    className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  >
                    {t("deviceList.bulk.deactivate")}
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={actionLoading}
                className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                {isSoftDeleteResource ? t("deviceList.bulk.archive") : t("deviceList.bulk.delete")}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={selectedCount === 0 || actionLoading}
            className="rounded-full border border-border/60 font-mono text-[10px] uppercase tracking-[0.06em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <X className="mr-1.5 size-3.5" />
            {t("deviceList.bulk.clear")}
          </Button>
        </div>
      </div>

      {/* Select all dataset banner prompt */}
      {allCurrentPageSelected && totalCount > currentPageCount && !allDatasetSelected && onSelectAllDataset ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-foreground glass-inset">
          <span className="font-mono text-[10px]">
            {t("deviceList.bulk.allPageSelected", { count: String(currentPageCount) })}{" "}
            <span className="text-muted-foreground font-normal">
              {t("deviceList.bulk.allPageSelectedQuestion") || "Ingin memilih semua data dalam filter?"}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelectAllDataset}
            disabled={isSelectingAllDataset}
            className="h-6 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-primary hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {isSelectingAllDataset ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
            {t("deviceList.bulk.selectAllMatching", { count: String(totalCount) })}
          </Button>
        </div>
      ) : null}

      {/* All dataset selected confirmation banner */}
      {allDatasetSelected && totalCount > currentPageCount ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-foreground glass-inset">
          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ {t("deviceList.bulk.allDataSelected", { count: String(totalCount) })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {t("deviceList.bulk.clear")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
