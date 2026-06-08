"use client";

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
  onOpenChange: (open: boolean) => void;
  onSelectedValidatorChange: (validatorId: string) => void;
  onSend: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogTitle>Kirim Reminder Validasi</AlertDialogTitle>
        <AlertDialogDescription>
          Pilih validator sesuai region ODP. Notifikasi akan muncul di Syntrix-One sebagai reminder persistent.
        </AlertDialogDescription>
        <div className="space-y-2">
          <Label>Validator</Label>
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sendingReminder}>
            Batal
          </Button>
          <Button type="button" onClick={onSend} disabled={!selectedValidatorId || sendingReminder}>
            {sendingReminder ? "Mengirim..." : "Kirim Reminder"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
