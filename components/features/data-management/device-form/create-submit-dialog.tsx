"use client";

import { ResponseDialog } from "@/components/response-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type CreateApprovalNotice = {
  title: string;
  description: string;
  redirectTo: string;
};

export type CreateResponseDialogState = {
  title: string;
  description: string;
  variant: "success" | "destructive";
  actionLabel: string;
  redirectTo?: string;
};

export function CreateApprovalDialog({
  notice,
  onClose,
}: {
  notice: CreateApprovalNotice | null;
  onClose: (target: string) => void;
}) {
  return (
    <AlertDialog open={Boolean(notice)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{notice?.title || "Request approval terkirim"}</AlertDialogTitle>
          <AlertDialogDescription>{notice?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onClose(notice?.redirectTo || "/data-management")}>
            Kembali ke list
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CreateResponseDialog({
  state,
  onClose,
  onAction,
}: {
  state: CreateResponseDialogState | null;
  onClose: () => void;
  onAction: (target?: string) => void;
}) {
  return (
    <ResponseDialog
      open={Boolean(state)}
      title={state?.title || "Response"}
      description={state?.description}
      variant={state?.variant}
      actionLabel={state?.actionLabel}
      onOpenChange={(open) => {
        if (open) return;
        if (state?.variant === "destructive") {
          onClose();
        }
      }}
      onAction={() => onAction(state?.redirectTo)}
    />
  );
}
