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
      <AlertDialogContent className="rounded-2xl border border-border/60 shadow-lg glass-inset">
        <AlertDialogHeader>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            MASTER DATA / RENAME
          </p>
          <AlertDialogTitle className="text-base font-semibold">
            Rename {categoryLabel}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            Perbarui nama data tanpa keluar dari halaman list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={`Masukkan ${label}`}
          className="h-9 rounded-xl border-border/60 bg-card text-xs shadow-2xs glass-inset"
        />
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={actionLoading}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={actionLoading}
            onClick={onConfirm}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            {actionLoading ? "Menyimpan..." : "Simpan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
