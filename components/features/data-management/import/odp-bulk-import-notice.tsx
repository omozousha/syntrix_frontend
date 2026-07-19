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
import { cn } from "@/lib/utils";

export const NOTICE_DISMISSED_KEY = "odp-bulk-import-notice-dismissed";

export interface PopPrerequisiteCheck {
  hasPop: boolean;
  popCount: number;
  message: string;
}

export type OdpBulkImportNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  popCheck: PopPrerequisiteCheck | null;
  isChecking: boolean;
  onCheckPops: () => Promise<void>;
};

/**
 * Interactive notice dialog shown on first visit / when POPs are missing.
 * - Shows prerequisite requirement for POP data before allowing ODP import
 * - Includes "don't show again" checkbox with localStorage persistence
 * - Displays POP availability status
 */
export function OdpBulkImportNoticeDialog({
  open,
  onOpenChange,
  onProceed,
  popCheck,
  isChecking,
  onCheckPops,
}: OdpBulkImportNoticeDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted = localStorage.getItem(NOTICE_DISMISSED_KEY);
      if (persisted === "true") {
        setDontShowAgain(true);
      }
    }
  }, []);

  // Trigger POP check on dialog open if not yet checked
  useEffect(() => {
    if (open && !hasCheckedOnMount && !popCheck) {
      void onCheckPops();
      setHasCheckedOnMount(true);
    }
  }, [open, hasCheckedOnMount, popCheck, onCheckPops]);

  const handleDismiss = (persist: boolean) => {
    if (persist && dontShowAgain) {
      localStorage.setItem(NOTICE_DISMISSED_KEY, "true");
    }
    onOpenChange(false);
  };

  const handleProceed = () => {
    if (dontShowAgain) {
      localStorage.setItem(NOTICE_DISMISSED_KEY, "true");
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
              Prasyarat Import Massal ODP
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Sebelum melanjutkan, pastikan data POP (Point of Presence) sudah
            tersedia di region Anda. Setiap ODP harus terhubung ke POP yang
            valid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <Info
                className="size-5 text-amber-600 mt-0.5 flex-shrink-0"
                aria-hidden
              />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Prasyarat: Data POP harus tersedia
                </p>
                <p className="text-amber-800 dark:text-amber-300 text-sm">
                  Setiap ODP harus terhubung ke POP yang valid. Jika belum
                  ada data POP, silakan buat terlebih dahulu di menu
                  <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/50 font-mono text-xs">
                    +(Add) → POP
                  </code>.
                </p>
              </div>
            </div>
          </div>

          {isChecking && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              <span className="text-sm text-muted-foreground">
                Memeriksa ketersediaan data POP...
              </span>
            </div>
          )}

          {popCheck && !isChecking && (
            <div
              className={cn(
                "rounded-lg border p-3",
                popCheck.hasPop
                  ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30",
              )}
            >
              <div className="flex items-center gap-2">
                {popCheck.hasPop ? (
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
                    popCheck.hasPop
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300",
                  )}
                >
                  {popCheck.popCount > 0
                    ? `Ditemukan ${popCheck.popCount} data POP`
                    : "Belum ada data POP"}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 text-xs",
                  popCheck.hasPop
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {popCheck.message}
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
          {popCheck?.hasPop ? (
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
              ) : popCheck?.popCount === 0 ? (
                "Tutup untuk buat POP"
              ) : (
                "Tutup"
              )}
            </Button>
          )}
          {!popCheck?.hasPop && (
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

/**
 * Helper hook to integrate notice dialog state into the bulk import page.
 */
export function useBulkImportNoticeDismissed(): boolean {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted = localStorage.getItem(NOTICE_DISMISSED_KEY);
      if (persisted === "true") {
        setDismissed(true);
      }
    }
  }, []);

  return dismissed;
}
