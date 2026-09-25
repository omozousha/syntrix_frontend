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
import { SquarePen, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreateModeDialogEntityType = "ODP" | "ODC" | "OLT" | "OTB" | "POP" | "Customer";

export type CreateModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults to single create form. */
  onSingleMode?: () => void;
  entityType: CreateModeDialogEntityType;
};

const ENTITY_CONFIG: Record<
  CreateModeDialogEntityType,
  { kind: string; title: string; createLabel: string; singleDescription: string; bulkDescription: string }
> = {
  ODP: {
    kind: "device&type=ODP",
    title: "Pilih Mode Tambah ODP",
    createLabel: "ODP",
    singleDescription: "Isi form satu ODP, lengkapi detail & relasi topologi.",
    bulkDescription: "Unggah file CSV/Excel hingga 2.000 baris. Cocok untuk rollout area luas.",
  },
  ODC: {
    kind: "device&type=ODC",
    title: "Pilih Mode Tambah ODC",
    createLabel: "ODC",
    singleDescription: "Isi form satu ODC, lengkapi detail & relasi topologi.",
    bulkDescription: "Unggah file CSV/Excel hingga 2.000 baris. Cocok untuk rollout area luas.",
  },
  OLT: {
    kind: "device&type=OLT",
    title: "Pilih Mode Tambah OLT",
    createLabel: "OLT",
    singleDescription: "Isi form satu OLT, lengkapi detail & relasi topologi.",
    bulkDescription: "Unggah file CSV/Excel hingga 2.000 baris. Cocok untuk rollout area luas.",
  },
  OTB: {
    kind: "device&type=OTB",
    title: "Pilih Mode Tambah OTB",
    createLabel: "OTB",
    singleDescription: "Isi form satu OTB, lengkapi detail & relasi topologi.",
    bulkDescription: "Unggah file CSV/Excel hingga 2.000 baris. Cocok untuk rollout area luas.",
  },
  POP: {
    kind: "pop",
    title: "Pilih Mode Tambah POP",
    createLabel: "POP",
    singleDescription: "Isi form satu POP, lengkapi data lokasi & relasi.",
    bulkDescription: "Unggah file CSV/Excel untuk import POP massal dalam satu waktu.",
  },
  Customer: {
    kind: "customer",
    title: "Pilih Mode Tambah Customer",
    createLabel: "Customer",
    singleDescription: "Isi form satu customer, lengkapi data pelanggan & layanan.",
    bulkDescription: "Unggah file CSV/Excel untuk import customer massal dalam satu waktu.",
  },
};

function buildImportPath(entityType: CreateModeDialogEntityType): string {
  const slug = entityType.toLowerCase();
  return `/data-management/import/${slug}`;
}

export function CreateModeDialog({
  open,
  onOpenChange,
  onSingleMode,
  entityType,
}: CreateModeDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<"single" | "bulk" | null>(null);

  const config = ENTITY_CONFIG[entityType];

  function handleSingle() {
    if (onSingleMode) {
      onSingleMode();
    } else {
      router.push(`/data-management/create?kind=${config.kind}`);
    }
    onOpenChange(false);
  }

  function handleBulk() {
    router.push(buildImportPath(entityType));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg rounded-2xl border border-border/60 bg-card shadow-xs glass-inset">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pilih cara menambah data {config.createLabel}: satu per satu via form, atau banyak
            sekaligus via file Excel/CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <OptionCard
            value="single"
            icon={<SquarePen className="size-5" />}
            title={`Tambah ${config.createLabel} Tunggal`}
            description={config.singleDescription}
            selected={selected === "single"}
            onSelect={() => setSelected("single")}
          />
          <OptionCard
            value="bulk"
            icon={<Upload className="size-5" />}
            title={`Impor Massal ${config.createLabel}`}
            description={config.bulkDescription}
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
        "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
        selected
          ? "border-primary/60 bg-primary/5 shadow-xs"
          : "border-border/60 bg-background/80 dark:bg-white/[0.03] glass-inset",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-muted text-muted-foreground dark:bg-white/10",
        )}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.12em]",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground dark:bg-white/10 dark:text-white/70",
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
