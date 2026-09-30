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
import { useTranslate } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

export type OdpCreateModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback for single-create; if absent, navigates to /data-management/create?device_type_key=ODP */
  onSingleMode?: () => void;
};

const ODP_CONFIG = {
  kind: "device&type=ODP" as const,
  createLabel: "ODP" as const,
  singleDescriptionKey: "deviceCreate.desc.device" as MessageKey,
  bulkDescriptionKey: "deviceCreate.bulkDesc.device" as MessageKey,
} as const;

/**
 * Centered dialog offering two ODP provisioning modes:
 * - single create form
 * - bulk import page
 */
export function OdpCreateModeDialog({
  open,
  onOpenChange,
  onSingleMode,
}: OdpCreateModeDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<"single" | "bulk" | null>(null);
  const { t } = useTranslate();

  function handleSingle() {
    if (onSingleMode) {
      onSingleMode();
    } else {
      router.push(`/data-management/create?kind=${ODP_CONFIG.kind}`);
    }
    onOpenChange(false);
  }

  function handleBulk() {
    router.push("/data-management/import/odp");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg rounded-2xl border border-border/60 bg-card shadow-xs glass-inset">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">
            {t("deviceCreate.title", { entity: ODP_CONFIG.createLabel })}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("deviceCreate.description", { entity: ODP_CONFIG.createLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <OptionCard
            value="single"
            icon={<SquarePen className="size-5" />}
            title={t("deviceCreate.single", { entity: ODP_CONFIG.createLabel })}
            description={t(ODP_CONFIG.singleDescriptionKey, { entity: ODP_CONFIG.createLabel })}
            selected={selected === "single"}
            onSelect={() => setSelected("single")}
          />
          <OptionCard
            value="bulk"
            icon={<Upload className="size-5" />}
            title={t("deviceCreate.bulk", { entity: ODP_CONFIG.createLabel })}
            description={t(ODP_CONFIG.bulkDescriptionKey)}
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
            {t("deviceCreate.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => (selected === "bulk" ? handleBulk() : handleSingle())}
            disabled={!selected}
          >
            {selected === "bulk"
              ? t("deviceCreate.continueBulk")
              : selected === "single"
                ? t("deviceCreate.continueForm")
                : t("deviceCreate.chooseMode")}
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
