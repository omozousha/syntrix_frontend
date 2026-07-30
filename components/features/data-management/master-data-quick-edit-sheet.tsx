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
          <SheetTitle>Quick Edit {categoryLabel}</SheetTitle>
          <SheetDescription>Ubah data langsung dari list.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto thin-scrollbar px-4">
          <div className="grid gap-3">
            {formContent}
            {showStatus ? (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <SimpleDropdown
                  value={statusValue}
                  onValueChange={onStatusChange}
                  options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <SheetFooter className="mt-2 shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Batal
          </Button>
          <Button type="button" onClick={onSave} disabled={disabled}>
            {actionLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
