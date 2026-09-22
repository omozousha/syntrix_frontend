"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";

type MasterDataQuickEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  formContent: ReactNode;
  showStatus: boolean;
  statusValue: string;
  onStatusChange: (value: string) => void;
  error: string;
  actionLoading: boolean;
  hasFieldErrors: boolean;
  onSave: () => void;
};

export function MasterDataQuickEditSheet({
  open,
  onOpenChange,
  categoryLabel,
  formContent,
  showStatus,
  statusValue,
  onStatusChange,
  error,
  actionLoading,
  hasFieldErrors,
  onSave,
}: MasterDataQuickEditSheetProps) {
  const disabled = actionLoading || hasFieldErrors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            MASTER DATA / QUICK EDIT
          </p>
          <SheetTitle className="text-base font-semibold text-foreground">
            Quick Edit {categoryLabel}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Ubah data langsung dari list tanpa meninggalkan halaman.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto thin-scrollbar px-4">
          <div className="grid gap-3">
            {formContent}
            {showStatus ? (
              <div className="space-y-1.5">
                <Label className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Status
                </Label>
                <SimpleDropdown
                  value={statusValue}
                  onValueChange={onStatusChange}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                />
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive glass-inset">
                {error}
              </div>
            ) : null}
          </div>
        </div>
        <SheetFooter className="mt-2 shrink-0 border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
