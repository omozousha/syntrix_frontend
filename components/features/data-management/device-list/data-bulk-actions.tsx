"use client";

import { Download, Filter, RotateCcw, Trash2 } from "lucide-react";
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm shadow-xs dark:bg-muted/10">
      <span className="text-muted-foreground">
        <span className="font-mono tabular-nums font-medium text-foreground">{selectedCount}</span> item terpilih
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {onFilterBySelection && selectedCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFilterBySelection}
            disabled={actionLoading}
          >
            <Filter className="mr-1 size-4" />
            Add to Filter
          </Button>
        ) : null}
        {supportsQrBulkDownload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadQr}
            disabled={selectedDownloadCount === 0 || downloadingQr || actionLoading}
          >
            <Download className="mr-1 size-4" />
            {downloadingQr ? "Membuat QR..." : "Download QR Selected"}
          </Button>
        ) : null}
        {canWrite && selectedCount > 0 ? (
          <>
            {canRestoreSelected ? (
              <Button type="button" variant="outline" size="sm" onClick={onRestore} disabled={actionLoading}>
                <RotateCcw className="mr-1 size-4" />
                Restore Selected
              </Button>
            ) : null}
            {canBulkToggleStatus ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={onActivate} disabled={actionLoading}>
                  Activate
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onDeactivate} disabled={actionLoading}>
                  Deactivate
                </Button>
              </>
            ) : null}
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={actionLoading}>
              <Trash2 className="mr-1 size-4" />
              {isSoftDeleteResource ? "Bulk Archive" : "Bulk Delete"}
            </Button>
          </>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection} disabled={selectedCount === 0 || actionLoading}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
