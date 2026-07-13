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
import { NdLabel, NdHero, NdDivider } from "@/components/ui/nothing";
import { FileUp, SquarePen } from "lucide-react";

export type OdpCreateModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback for single-create; if absent, navigates to /data-management/create?device_type_key=ODP */
  onSingleMode?: () => void;
};

/**
 * Dialog selection between:
 * - **Tambah ODP Tunggal** (single create form)
 * - **Impor Massal ODP** (bulk import page)
 *
 * Redesigned to show in the center using Dialog instead of Sheet.
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
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader className="space-y-3">
          <NdLabel color="secondary">MODE</NdLabel>
          <DialogTitle>
            <NdHero size="md">MODE TAMBAH ODP</NdHero>
          </DialogTitle>
          <DialogDescription>
            Pilih cara menambah data ODP: satu per satu via form, atau banyak sekaligus via file Excel/CSV.
          </DialogDescription>
        </DialogHeader>

        <NdDivider />

        <div className="flex flex-col gap-4 py-2">
          <OptionCard
            icon={<SquarePen className="size-5" />}
            tag="01"
            title="TAMBAH ODP TUNGGAL"
            description="Isi form satu ODP, lengkapi detail & relasi topologi."
            selected={selected === "single"}
            onSelect={() => setSelected("single")}
          />
          <OptionCard
            icon={<FileUp className="size-5" />}
            tag="02"
            title="IMPOR MASSAL ODP"
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
            className="rounded-full"
            style={{
              fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 13,
            }}
          >
            BATAL
          </Button>
          <Button
            type="button"
            onClick={() => (selected === "bulk" ? handleBulk() : handleSingle())}
            disabled={!selected}
            className="rounded-full"
            style={{
              fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 13,
              background: selected ? "var(--nd-text-display)" : "var(--nd-surface-raised)",
              color: selected ? "var(--nd-black)" : "var(--nd-text-disabled)",
            }}
          >
            {selected === "bulk" ? "LANJUT IMPOR" : selected === "single" ? "LANJUT FORM" : "PILIH MODE"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionCard({
  icon,
  tag,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors"
      style={{
        background: selected
          ? "var(--nd-surface-raised)"
          : "var(--nd-surface)",
        borderColor: selected
          ? "var(--nd-text-display)"
          : "var(--nd-border)",
        borderStyle: selected ? "solid" : "dashed",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border"
        style={{
          borderColor: selected ? "var(--nd-text-display)" : "var(--nd-border-visible)",
          color: selected ? "var(--nd-text-display)" : "var(--nd-text-secondary)",
        }}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <NdLabel color="secondary">OPTION {tag}</NdLabel>
          {selected ? (
            <span
              className="nd-label"
              style={{ fontSize: 9, color: "var(--nd-success)" }}
            >
              TERPILIH
            </span>
          ) : null}
        </div>
        <h3
          style={{
            fontFamily: "var(--font-nd-body), 'Space Grotesk', sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--nd-text-display)",
            letterSpacing: 0,
          }}
        >
          {title}
        </h3>
        <p
          className="nd-body"
          style={{ fontSize: 13, color: "var(--nd-text-secondary)" }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
