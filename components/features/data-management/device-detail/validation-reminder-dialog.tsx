"use client";

import { BellRing } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

type ValidatorOption = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  user_code?: string | null;
};

export function ValidationReminderDialog({
  open,
  validators,
  loadingValidators,
  sendingReminder,
  selectedValidatorId,
  error,
  deviceTypeLabel = "Perangkat",
  onOpenChange,
  onSelectedValidatorChange,
  onSend,
}: {
  open: boolean;
  validators: ValidatorOption[];
  loadingValidators: boolean;
  sendingReminder: boolean;
  selectedValidatorId: string;
  error: string;
  deviceTypeLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSelectedValidatorChange: (validatorId: string) => void;
  onSend: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl border-border/60 shadow-lg glass-inset p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-4" />
          </div>
          <div>
            <AlertDialogTitle className="text-base font-semibold">Kirim Reminder Validasi</AlertDialogTitle>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{deviceTypeLabel}</p>
          </div>
        </div>

        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
          Pilih validator di region perangkat ini. Notifikasi pengingat akan dikirim langsung ke aplikasi mobile Syntrix-One validator terkait.
        </AlertDialogDescription>

        <div className="space-y-2 py-2">
          <Label className="text-xs font-medium">Pilih Validator</Label>
          <Combobox
            value={selectedValidatorId || "__none__"}
            onValueChange={(value) => onSelectedValidatorChange(value === "__none__" ? "" : value)}
            disabled={loadingValidators || sendingReminder}
            placeholder={loadingValidators ? "Memuat validator..." : "Pilih validator"}
            searchPlaceholder="Cari validator..."
            emptyText="Tidak ada validator aktif pada region ini."
            options={[
              { value: "__none__", label: loadingValidators ? "Memuat validator..." : "Pilih validator" },
              ...validators.map((validator) => ({
                value: validator.id,
                label: [validator.full_name, validator.user_code || validator.email].filter(Boolean).join(" - ") || "Validator tidak tersedia",
              })),
            ]}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/60 text-xs hover:bg-muted/40 active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
            disabled={sendingReminder}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            onClick={onSend}
            disabled={!selectedValidatorId || sendingReminder}
          >
            {sendingReminder ? "Mengirim..." : "Kirim Reminder"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
