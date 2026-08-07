"use client";

import { Check, Pencil, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({
  acting,
  showResubmit,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
  onResubmit,
  onEditAndResubmit,
}: {
  acting: boolean;
  showResubmit: boolean;
  approveLabel: string;
  rejectLabel: string;
  onApprove: () => void;
  onReject: () => void;
  onResubmit: () => void;
  onEditAndResubmit?: () => void;
}) {
  if (showResubmit) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 shadow-2xs sm:flex-row sm:justify-end">
        {onEditAndResubmit && (
          <Button type="button" variant="outline" onClick={onEditAndResubmit} disabled={acting} className="min-h-10 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:w-auto">
            <Pencil className="mr-2 size-4" />
            Koreksi Data &amp; Resubmit
          </Button>
        )}
        <Button type="button" onClick={onResubmit} disabled={acting} className="min-h-10 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:w-auto">
          <RefreshCw className="mr-2 size-4" />
          Resubmit Langsung
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 shadow-2xs sm:flex-row sm:justify-end">
      <Button type="button" onClick={onApprove} disabled={acting} className="min-h-10 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:w-auto">
        <Check className="mr-2 size-4" />
        {approveLabel}
      </Button>
      <Button type="button" variant="destructive" onClick={onReject} disabled={acting} className="min-h-10 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:w-auto">
        <X className="mr-2 size-4" />
        {rejectLabel}
      </Button>
    </div>
  );
}
