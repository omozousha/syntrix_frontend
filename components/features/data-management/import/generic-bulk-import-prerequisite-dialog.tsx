"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { InlineLoader } from "@/components/app-loading-new";
import { cn } from "@/lib/utils";

export interface PrerequisiteCheck {
  hasData: boolean;
  count: number;
  message: string;
  entityLabel: string;
}

export type BulkImportPrerequisiteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  checkResult: PrerequisiteCheck | null;
  isChecking: boolean;
  onCheck: () => Promise<PrerequisiteCheck | null>;
  entityLabel: string;
  storageKey: string;
  prerequisites?: string[];
};

export function BulkImportPrerequisiteDialog({
  open,
  onOpenChange,
  onProceed,
  checkResult,
  isChecking,
  onCheck,
  entityLabel,
  storageKey,
  prerequisites = [`Data ${entityLabel} harus tersedia sebelum import.`],
}: BulkImportPrerequisiteDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted = localStorage.getItem(storageKey);
      if (persisted === "true") {
        setDontShowAgain(true);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (open && !hasCheckedOnMount && !checkResult) {
      void onCheck();
      setHasCheckedOnMount(true);
    }
  }, [open, hasCheckedOnMount, checkResult, onCheck]);

  const handleDismiss = (persist: boolean) => {
    if (persist && dontShowAgain) {
      localStorage.setItem(storageKey, "true");
    }
    onOpenChange(false);
  };

  const handleProceed = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, "true");
    }
    onOpenChange(false);
    onProceed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-500" aria-hidden />
            <DialogTitle className="text-lg font-semibold">
              Prasyarat Import Massal {entityLabel}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Sebelum melanjutkan, pastikan data pendukung sudah tersedia.
            {prerequisites.map((p, i) => (
              <span key={i}> {p}</span>
            ))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isChecking && (
            <div className="flex items-center justify-center py-3">
              <InlineLoader label={`Memeriksa ketersediaan data ${entityLabel}...`} />
            </div>
          )}

          {checkResult && !isChecking && (
            <div
              className={cn(
                "rounded-lg border p-3",
                checkResult.hasData
                  ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30",
              )}
            >
              <div className="flex items-center gap-2">
                {checkResult.hasData ? (
                  <CheckCircle2
                    className="size-4 text-green-600 dark:text-green-400"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle
                    className="size-4 text-red-600 dark:text-red-400"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    checkResult.hasData
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300",
                  )}
                >
                  {checkResult.count > 0
                    ? `Ditemukan ${checkResult.count} data ${entityLabel}`
                    : `Belum ada data ${entityLabel}`}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 text-xs",
                  checkResult.hasData
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {checkResult.message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              aria-label="Jangan tampilkan notifikasi ini lagi"
            />
            <Label
              htmlFor="dont-show-again"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Jangan tampilkan notifikasi ini lagi
            </Label>
          </div>
        </div>

        <DialogFooter className="pt-2 sm:flex-col sm:space-y-2">
          {checkResult?.hasData ? (
            <Button
              type="button"
              onClick={handleProceed}
              disabled={isChecking}
              className="w-full"
            >
              Lanjutkan ke Import
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDismiss(false)}
              className="w-full"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Memeriksa...
                </>
              ) : checkResult?.count === 0 ? (
                "Tutup untuk buat data"
              ) : (
                "Tutup"
              )}
            </Button>
          )}
          {!checkResult?.hasData && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleDismiss(true)}
              className="w-full"
            >
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
