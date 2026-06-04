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
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onResubmit} disabled={acting}>
          <RefreshCw className="mr-2 size-4" />
          Resubmit ke Superadmin
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={onApprove} disabled={acting}>
        <Check className="mr-2 size-4" />
        {approveLabel}
      </Button>
      <Button type="button" variant="destructive" onClick={onReject} disabled={acting}>
        <X className="mr-2 size-4" />
        {rejectLabel}
      </Button>
    </div>
  );
}
