"use client";

import { useEffect, useState } from "react";
import { Server, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslate } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";
import type { RackOption } from "./pop-rack-mount-modal";

export const EIA310_RACK_HEIGHT_OPTIONS: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: "48", labelKey: "popRack.height.48" },
  { value: "45", labelKey: "popRack.height.45" },
  { value: "42", labelKey: "popRack.height.42" },
  { value: "27", labelKey: "popRack.height.27" },
  { value: "24", labelKey: "popRack.height.24" },
  { value: "18", labelKey: "popRack.height.18" },
  { value: "15", labelKey: "popRack.height.15" },
  { value: "12", labelKey: "popRack.height.12" },
  { value: "9", labelKey: "popRack.height.9" },
  { value: "6", labelKey: "popRack.height.6" },
];

export const RACK_TYPE_OPTIONS: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: "closed_cabinet", labelKey: "popRack.type.closedCabinet" },
  { value: "open_frame", labelKey: "popRack.type.openFrame" },
  { value: "outdoor_enclosure", labelKey: "popRack.type.outdoorEnclosure" },
];

type PopRackFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rack?: (RackOption & { rack_type?: string }) | null;
  defaultNextName?: string;
  onSubmit: (data: { device_name: string; rack_u_height: number; rack_type: string }) => Promise<void>;
};

export function PopRackFormDialog({
  open,
  onOpenChange,
  mode,
  rack,
  defaultNextName = "Rack 01",
  onSubmit,
}: PopRackFormDialogProps) {
  const { t } = useTranslate();
  const [name, setName] = useState(defaultNextName);
  const [uHeight, setUHeight] = useState("42");
  const [rackType, setRackType] = useState("closed_cabinet");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && rack) {
        setName(rack.device_name || "");
        setUHeight(String(rack.rack_u_height || 42));
        setRackType(rack.rack_type || "closed_cabinet");
      } else {
        setName(defaultNextName);
        setUHeight("42");
        setRackType("closed_cabinet");
      }
      setError("");
    }
  }, [open, mode, rack, defaultNextName]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("popRack.nameRequired"));
      return;
    }
    const height = parseInt(uHeight, 10);
    if (Number.isNaN(height) || height < 1 || height > 60) {
      setError(t("popRack.heightRange"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        device_name: trimmed,
        rack_u_height: height,
        rack_type: rackType,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || t("popRack.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border/60 shadow-lg glass-inset p-5 sm:p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {mode === "create" ? <Server className="size-4" /> : <Settings2 className="size-4" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {mode === "create" ? t("popRack.createTitle") : t("popRack.editTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("popRack.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("popRack.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("popRack.namePlaceholder")}
              className="h-9 rounded-xl border-border/60 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("popRack.uHeightLabel")}</Label>
            <Select value={uHeight} onValueChange={setUHeight}>
              <SelectTrigger className="h-9 rounded-xl border-border/60 font-mono text-xs">
                <SelectValue placeholder={t("popRack.uHeightPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 max-h-56">
                {EIA310_RACK_HEIGHT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("popRack.typeLabel")}</Label>
            <Select value={rackType} onValueChange={setRackType}>
              <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs">
                <SelectValue placeholder={t("popRack.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60">
                {RACK_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 space-y-1 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">{t("popRack.specTitle")}</p>
            <p>{t("popRack.specWidth")}</p>
            <p>{t("popRack.specNumbering", { u: uHeight || 0 })}</p>
          </div>

          {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/60 text-xs hover:bg-muted/40"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90"
            onClick={() => void handleConfirm()}
            disabled={submitting || !name.trim()}
          >
            {submitting ? t("common.saving") : mode === "create" ? t("popRack.createAction") : t("popRack.saveAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
