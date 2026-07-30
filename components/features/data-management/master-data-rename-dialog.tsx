"use client";

import { Input } from "@/components/ui/input";
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

type MasterDataRenameDialogProps = {
  open: boolean;
  onClose: () => void;
  categoryLabel: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  actionLoading: boolean;
  onConfirm: () => void;
};

export function MasterDataRenameDialog({
  open,
  onClose,
  categoryLabel,
  label,
  value,
  onValueChange,
  actionLoading,
  onConfirm,
}: MasterDataRenameDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rename {categoryLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Perbarui nama data tanpa keluar dari halaman list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={`Masukkan ${label}`}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={actionLoading} onClick={onConfirm}>
            {actionLoading ? "Menyimpan..." : "Simpan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
