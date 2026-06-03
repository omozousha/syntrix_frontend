"use client";

import { Download, ImagePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ValidationEvidenceAction({
  evidenceCount,
  onDownload,
}: {
  evidenceCount: number;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/80 p-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ImagePlus className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Evidence validasi</p>
          <p className="text-[11px] text-muted-foreground">Terpisah dari galeri resmi device.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-md tabular-nums">
          {evidenceCount}
        </Badge>
        <Button type="button" variant="outline" size="sm" disabled={!evidenceCount} onClick={onDownload}>
          <Download className="mr-1.5 size-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}
