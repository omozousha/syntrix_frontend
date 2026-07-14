"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, SquarePen, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type OdpCreateModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback for single-create; if absent, navigates to /data-management/create?device_type_key=ODP */
  onSingleMode?: () => void;
};

/**
 * Centered dialog offering two ODP provisioning modes:
 * - **Tambah ODP Tunggal** (single create form)
 * - **Impor Massal ODP** (bulk import page)
 *
 * Aligned with platform's standard Shadcn UI design system.
 */
export function OdpCreateModeDialog({
  open,
  onOpenChange,
  onSingleMode,
}: OdpCreateModeDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<"single" | "bulk" | null>(null);

  function handleSingle() {
    if (onSingleMode) {
      onSingleMode();
    } else {
      router.push("/data-management/create?device_type_key=ODP");
    }
    onOpenChange(false);
  }

  function handleBulk() {
    router.push("/data-management/import/odp");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">
            Pilih Mode Tambah ODP
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pilih cara menambah data ODP: satu per satu via form, atau banyak
            sekaligus via file Excel/CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <OptionCard
            value="single"
            icon={<SquarePen className="size-5" />}
            title="Tambah ODP Tunggal"
            description="Isi form satu ODP, lengkapi detail & relasi topologi."
            selected={selected === "single"}
            onSelect={() => setSelected("single")}
          />
          <OptionCard
            value="bulk"
            icon={<Upload className="size-5" />}
            title="Impor Massal ODP"
            description="Unggah file CSV/Excel hingga 2.000 baris. Cocok untuk rollout area luas."
            selected={selected === "bulk"}
            onSelect={() => setSelected("bulk")}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => (selected === "bulk" ? handleBulk() : handleSingle())}
            disabled={!selected}
          >
            {selected === "bulk"
              ? "Lanjut Impor"
              : selected === "single"
                ? "Lanjut Form"
                : "Pilih Mode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type OptionCardProps = {
  value: "single" | "bulk";
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
};

function OptionCard({
  value,
  icon,
  title,
  description,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-4 rounded-md border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium uppercase tracking-wide",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {value === "single" ? "01" : "02"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
