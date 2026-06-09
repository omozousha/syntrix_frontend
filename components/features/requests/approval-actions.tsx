"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({
  acting,
  showResubmit,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
  onResubmit,
}: {
  acting: boolean;
  showResubmit: boolean;
  approveLabel: string;
  rejectLabel: string;
  onApprove: () => void;
  onReject: () => void;
  onResubmit: () => void;
}) {
  if (showResubmit) {
    return (
      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2 sm:flex-row sm:justify-end">
        <Button type="button" onClick={onResubmit} disabled={acting} className="min-h-10 w-full sm:w-auto">
          <RefreshCw className="mr-2 size-4" />
          Resubmit ke Superadmin
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2 sm:flex-row sm:justify-end">
      <Button type="button" onClick={onApprove} disabled={acting} className="min-h-10 w-full sm:w-auto">
        <Check className="mr-2 size-4" />
        {approveLabel}
      </Button>
      <Button type="button" variant="destructive" onClick={onReject} disabled={acting} className="min-h-10 w-full sm:w-auto">
        <X className="mr-2 size-4" />
        {rejectLabel}
      </Button>
    </div>
  );
}
