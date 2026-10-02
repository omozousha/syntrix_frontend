"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslate, type TFn } from "@/lib/use-locale";

type ValidationState = {
  state: "idle" | "valid" | "invalid";
  message: string;
};

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  tooltip,
  containerClassName,
  badge,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  tooltip?: string;
  containerClassName?: string;
  badge?: ReactNode;
  required?: boolean;
}) {
  const { t } = useTranslate();
  return (
    <div className={`space-y-1.5 ${containerClassName || ""}`}>
      <FieldLabel label={label} tooltip={tooltip || getDefaultTooltip(label, t)} badge={badge} required={required} />
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function CidField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslate();
  const validation = validateCid(value, t);

  return (
    <div className="space-y-1.5">
      <FieldLabel label="CID" tooltip={t("fieldTip.cidFormat")} />
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        value={value}
        onChange={(event) => onChange(normalizeCidInput(event.target.value))}
        placeholder="12345678"
      />
      <ValidationBadge validation={validation} />
    </div>
  );
}

export function CoordinateField({
  label,
  value,
  onChange,
  kind,
  badge,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "longitude" | "latitude";
  badge?: ReactNode;
}) {
  const { t } = useTranslate();
  const validation = validateCoordinateFormat(value, kind, t);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label={label}
        badge={badge}
        tooltip={
          kind === "latitude"
            ? t("fieldTip.latitudeFormat")
            : t("fieldTip.longitudeFormat")
        }
      />
      <Input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <ValidationBadge validation={validation} />
    </div>
  );
}

export function FieldLabel({ label, tooltip, badge, required }: { label: string; tooltip?: string | null; badge?: ReactNode; required?: boolean }) {
  const { t } = useTranslate();
  const labelContent = (
    <>
      {label}
      {required ? <span className="text-destructive ml-0.5">*</span> : null}
    </>
  );

  if (!tooltip) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Label>{labelContent}</Label>
        {badge}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Label>{labelContent}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={t("createForm.fieldInfo", { label })}>
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {badge}
    </div>
  );
}

export function AutoFilledBadge({ label = "Auto-filled" }: { label?: string }) {
  return (
    <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] font-medium uppercase tracking-normal text-blue-700 dark:text-blue-300">
      {label}
    </Badge>
  );
}

export function validateCid(value: string, t: TFn): ValidationState {
  if (!value.trim()) return { state: "idle", message: "" };
  if (/^\d{8}$/.test(value)) return { state: "valid", message: "8 digit" };
  return { state: "invalid", message: t("fieldTip.cidInvalid") };
}

export function validateCoordinateFormat(value: string, kind: "longitude" | "latitude", t: TFn): ValidationState {
  const text = value.trim();
  if (!text) return { state: "idle", message: "" };
  const pattern = kind === "latitude" ? /^-\d{1,2}\.\d{6,}$/ : /^\d{3}\.\d{6,}$/;
  if (pattern.test(text)) return { state: "valid", message: "Format OK" };
  return {
    state: "invalid",
    message: kind === "latitude" ? t("fieldTip.latInvalid") : t("fieldTip.lngInvalid"),
  };
}

function ValidationBadge({ validation }: { validation: ValidationState }) {
  if (validation.state === "idle") return null;
  return (
    <Badge
      variant="outline"
      className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}
    >
      {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
      {validation.message}
    </Badge>
  );
}

function normalizeCidInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function getDefaultTooltip(label: string, t: TFn) {
  const map: Record<string, string> = {
    "POP Name": t("fieldTip.popName"),
    "POP Code (3 huruf)": t("fieldTip.popCode"),
    "Device Name": t("fieldTip.deviceName"),
    "Customer Name": t("fieldTip.customerName"),
    CID: t("fieldTip.cid"),
    "Service Type": t("fieldTip.serviceType"),
    "Contact Name": t("fieldTip.contactName"),
    "Contact Phone": t("fieldTip.contactPhone"),
    "BAST Number": t("fieldTip.bastNumber"),
    "SPK Number": t("fieldTip.spkNumber"),
    "Validation Date": t("fieldTip.validationDate"),
    Tenant: t("fieldTip.tenant"),
    "PLN CID Number": t("fieldTip.plnCid"),
    "PLN Payment Method": t("fieldTip.plnPayment"),
    "PLN Phase": t("fieldTip.plnPhase"),
    "PLN Wattage": t("fieldTip.plnWattage"),
    "POP Type": t("fieldTip.popType"),
    "Tanggal POP Aktif": t("fieldTip.popActiveDate"),
    "Tags (comma separated)": t("fieldTip.tags"),
    "Capacity Core": t("fieldTip.capacityCore"),
    "Used Core": t("fieldTip.usedCore"),
    "Total Ports": t("fieldTip.totalPorts"),
    "Used Ports": t("fieldTip.usedPorts"),
    "Splitter Ratio": t("fieldTip.splitterRatio"),
    Address: t("fieldTip.address"),
    City: t("fieldTip.city"),
    Province: t("fieldTip.province"),
    Longitude: t("fieldTip.longitude"),
    Latitude: t("fieldTip.latitude"),
    Title: t("fieldTip.title"),
    "Field Key": t("fieldTip.fieldKey"),
    "Options (CSV)": t("fieldTip.optionsCsv"),
    "Help Text": t("fieldTip.helpText"),
  };
  return map[label] || "";
}
