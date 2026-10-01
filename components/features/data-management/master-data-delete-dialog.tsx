"use client";

import { useTranslate } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

type UsageCheckData = {
  total: number;
  by_type: Record<string, { count: number; sample: Array<{ id: string; label: string }> }>;
};

type MasterDataDeleteDialogProps = {
  deleteTarget: unknown;
  usageCheck: UsageCheckData | null;
  usageLoading: boolean;
  actionLoading: boolean;
  isSoftDeleteResource: boolean;
  categoryLabel: string;
  onClose: () => void;
  onSubmitDelete: () => void;
  onForceDelete: () => void;
};

export function MasterDataUsageCheckDialog({
  usageCheck,
  onForceDelete,
  onClose,
}: {
  usageCheck: UsageCheckData | null;
  onForceDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  return (
    <AlertDialog open={usageCheck !== null && usageCheck.total > 0} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-2xl border border-border/60 shadow-lg glass-inset">
        <AlertDialogHeader>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            {t("masterData.usage.eyebrow")}
          </p>
          <AlertDialogTitle className="text-base font-semibold">
            {t("masterData.usage.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-3.5 dark:bg-amber-950/20 glass-inset">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                  {t("masterData.usage.count", { count: usageCheck?.total ?? 0 })}
                </p>
                {usageCheck?.by_type
                  ? Object.entries(usageCheck.by_type).map(([table, info]) => (
                      <div key={table} className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                            {table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <Badge
                            variant="outline"
                            className="border-amber-400/50 font-mono text-[9px] tabular-nums tracking-[0.12em] text-amber-700 dark:text-amber-400"
                          >
                            {info.count}
                          </Badge>
                        </div>
                        {info.sample.length > 0 ? (
                          <ul className="ml-3 list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                            {info.sample.map((item) => (
                              <li key={item.id}>{item.label}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))
                  : null}
                <p className="mt-2.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                  {t("masterData.usage.hint")}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onForceDelete()}
            className="rounded-full bg-destructive font-mono text-[10px] uppercase tracking-[0.08em] text-destructive-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-destructive/90 active:scale-[0.98]"
          >
            {t("masterData.usage.forceDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MasterDataDeleteConfirmDialog({
  deleteTarget,
  isSoftDeleteResource,
  categoryLabel,
  actionLoading,
  usageLoading,
  onSubmitDelete,
  onClose,
}: MasterDataDeleteDialogProps) {
  const { t } = useTranslate();
  return (
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-2xl border border-border/60 shadow-lg glass-inset">
        <AlertDialogHeader>
          <p className={`font-mono text-[9px] uppercase tracking-[0.18em] ${isSoftDeleteResource ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
            MASTER DATA / {isSoftDeleteResource ? t("masterData.delete.action.archive") : t("masterData.delete.action.deletePermanently")}
          </p>
          <AlertDialogTitle className="text-base font-semibold">
            {t(isSoftDeleteResource ? "masterData.delete.action.archive" : "masterData.delete.action.delete")} {categoryLabel}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            {isSoftDeleteResource
              ? t("masterData.delete.description.soft")
              : t("masterData.delete.description.permanent")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={actionLoading || usageLoading}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={actionLoading || usageLoading}
            onClick={() => void onSubmitDelete()}
            className={`rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              isSoftDeleteResource
                ? ""
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
          >
            {actionLoading
              ? t(isSoftDeleteResource ? "masterData.delete.action.archiving" : "masterData.delete.action.deleting")
              : usageLoading
                ? t("masterData.delete.action.checking")
                : t(isSoftDeleteResource ? "masterData.delete.action.archivePermanently" : "masterData.delete.action.deletePermanently")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
