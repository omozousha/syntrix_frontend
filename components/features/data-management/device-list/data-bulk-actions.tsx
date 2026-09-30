"use client";

import { Download, Filter, RotateCcw, Trash2, X } from "lucide-react";
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
}) {
  const { t } = useTranslate();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-2.5 shadow-xs glass-inset">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="font-mono text-[11px] tabular-nums font-semibold text-foreground">{selectedCount}</span> {t("deviceList.bulk.selected")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onFilterBySelection && selectedCount > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={onFilterBySelection} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            <Filter className="mr-1.5 size-3.5" />
            {t("deviceList.bulk.addToFilter")}
          </Button>
        ) : null}
        {supportsQrBulkDownload ? (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadQr} disabled={selectedDownloadCount === 0 || downloadingQr || actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            <Download className="mr-1.5 size-3.5" />
            {downloadingQr ? t("deviceList.bulk.qrDownloading") : t("deviceList.bulk.downloadQr")}
          </Button>
        ) : null}
        {canWrite && selectedCount > 0 ? (
          <>
            {canRestoreSelected ? (
              <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                <RotateCcw className="mr-1.5 size-3.5" />
                {t("deviceList.bulk.restore")}
              </Button>
            ) : null}
            {canBulkToggleStatus ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={onActivate} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  {t("deviceList.bulk.activate")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onDeactivate} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  {t("deviceList.bulk.deactivate")}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              <Trash2 className="mr-1.5 size-3.5" />
              {isSoftDeleteResource ? t("deviceList.bulk.archive") : t("deviceList.bulk.delete")}
            </Button>
          </>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection} disabled={selectedCount === 0 || actionLoading} className="rounded-full border border-border/60 font-mono text-[10px] uppercase tracking-[0.06em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
          <X className="mr-1.5 size-3.5" />
          {t("deviceList.bulk.clear")}
        </Button>
      </div>
    </div>
  );
}
