"use client";

import { Download, RotateCcw, Trash2 } from "lucide-react";
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
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Item terpilih: {selectedCount}</span>
      <div className="flex flex-wrap items-center gap-2">
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
