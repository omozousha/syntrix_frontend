"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ResponseDialogVariant = "success" | "error" | "destructive" | "warning" | "info";

type ResponseDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  variant?: ResponseDialogVariant;
  actionLabel?: string;
  onAction?: () => void;
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
  showAction?: boolean;
};

const VARIANT_META: Record<ResponseDialogVariant, { icon: typeof CheckCircle2; mediaClassName: string; actionClassName?: string }> = {
  success: {
    icon: CheckCircle2,
    mediaClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  error: {
    icon: AlertCircle,
    mediaClassName: "bg-destructive/10 text-destructive",
    actionClassName: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  destructive: {
    icon: AlertCircle,
    mediaClassName: "bg-destructive/10 text-destructive",
    actionClassName: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    icon: TriangleAlert,
    mediaClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  info: {
    icon: Info,
    mediaClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
};

export function ResponseDialog({
  open,
  title,
  description,
  variant = "info",
  actionLabel = "OK",
  onAction,
  onOpenChange,
  loading = false,
  showAction = true,
}: ResponseDialogProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className={cn("mx-auto mb-2 flex size-12 items-center justify-center rounded-xl", meta.mediaClassName)}>
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
          </div>
          <AlertDialogTitle className="text-center">{title || "Response"}</AlertDialogTitle>
          {description ? <AlertDialogDescription className="text-center">{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {showAction ? (
          <AlertDialogFooter>
            <AlertDialogAction className={cn("w-full", meta.actionClassName)} onClick={onAction}>
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
