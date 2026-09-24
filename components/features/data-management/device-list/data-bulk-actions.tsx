"use client";

import { Download, Filter, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-2.5 shadow-xs glass-inset">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="font-mono text-[11px] tabular-nums font-semibold text-foreground">{selectedCount}</span> terpilih
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onFilterBySelection && selectedCount > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={onFilterBySelection} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            <Filter className="mr-1.5 size-3.5" />
            Add to Filter
          </Button>
        ) : null}
        {supportsQrBulkDownload ? (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadQr} disabled={selectedDownloadCount === 0 || downloadingQr || actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            <Download className="mr-1.5 size-3.5" />
            {downloadingQr ? "QR..." : "Download QR"}
          </Button>
        ) : null}
        {canWrite && selectedCount > 0 ? (
          <>
            {canRestoreSelected ? (
              <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                <RotateCcw className="mr-1.5 size-3.5" />
                Restore
              </Button>
            ) : null}
            {canBulkToggleStatus ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={onActivate} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  Activate
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onDeactivate} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  Deactivate
                </Button>
              </>
            ) : null}
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={actionLoading} className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              <Trash2 className="mr-1.5 size-3.5" />
              {isSoftDeleteResource ? "Archive" : "Delete"}
            </Button>
          </>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection} disabled={selectedCount === 0 || actionLoading} className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
