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
  const displayLabel = translateFieldLabel(label, t);
  const resolvedTooltip = tooltip ?? getDefaultTooltip(label, t);
  const labelContent = (
    <>
      {displayLabel}
      {required ? <span className="text-destructive ml-0.5">*</span> : null}
    </>
  );

  if (!resolvedTooltip) {
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
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={t("createForm.fieldInfo", { label: displayLabel })}>
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {resolvedTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {badge}
    </div>
  );
}

export function AutoFilledBadge({ label }: { label?: string }) {
  const { t } = useTranslate();
  const resolved = !label || label === "Auto-filled" || label === "Auto-fill" ? t("fieldLabel.autoFilled") : label;
  return (
    <Badge variant="outline" className="h-4 rounded px-1.5 text-[9px] font-medium uppercase tracking-normal text-blue-700 dark:text-blue-300">
      {resolved}
    </Badge>
  );
}

export function validateCid(value: string, t: TFn): ValidationState {
  if (!value.trim()) return { state: "idle", message: "" };
  if (/^\d{8}$/.test(value)) return { state: "valid", message: t("fieldLabel.eightDigits") };
  return { state: "invalid", message: t("fieldTip.cidInvalid") };
}

export function validateCoordinateFormat(value: string, kind: "longitude" | "latitude", t: TFn): ValidationState {
  const text = value.trim();
  if (!text) return { state: "idle", message: "" };
  const pattern = kind === "latitude" ? /^-\d{1,2}\.\d{6,}$/ : /^\d{3}\.\d{6,}$/;
  if (pattern.test(text)) return { state: "valid", message: t("fieldLabel.formatOk") };
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

export function translateFieldLabel(label: string, t: TFn): string {
  const map: Record<string, string> = {
    "Route Name": t("fieldLabel.routeName"),
    "Route Type": t("fieldLabel.routeType"),
    "Distance (meters)": t("fieldLabel.distanceMeters"),
    "Project Name": t("fieldLabel.projectName"),
    "Vendor Name": t("fieldLabel.vendorName"),
    "BAST Number": t("fieldLabel.bastNumber"),
    "SPK Number": t("fieldLabel.spkNumber"),
    Description: t("fieldLabel.description"),
    "Start Date": t("fieldLabel.startDate"),
    "End Date": t("fieldLabel.endDate"),
    "Budget Value": t("fieldLabel.budgetValue"),
    "POP Name": t("fieldLabel.popName"),
    "POP Code (3 huruf)": t("fieldLabel.popCode"),
    "POP Type": t("fieldLabel.popType"),
    "Tanggal POP Aktif": t("fieldLabel.popActiveDate"),
    "PLN CID Number": t("fieldLabel.plnCidNumber"),
    "PLN Payment Method": t("fieldLabel.plnPaymentMethod"),
    "PLN Phase": t("fieldLabel.plnPhase"),
    "PLN Wattage": t("fieldLabel.plnWattage"),
    "Tags (comma separated)": t("fieldLabel.tagsComma"),
    "Tags (CSV)": t("fieldLabel.tagsCsv"),
    Manufacturer: t("fieldLabel.manufacturer"),
    Brand: t("fieldLabel.brand"),
    Model: t("fieldLabel.model"),
    "Serial Number": t("fieldLabel.serialNumber"),
    "Installation Date": t("fieldLabel.installationDate"),
    "Validation Status": t("fieldLabel.validationStatus"),
    "Validation Date": t("fieldLabel.validationDate"),
    "Tipe ODP": t("fieldLabel.odpType"),
    "Jenis Instalasi": t("fieldLabel.installationType"),
    Address: t("fieldLabel.address"),
    "Province (Master)": t("fieldLabel.provinceMaster"),
    Province: t("fieldLabel.province"),
    "City/Kabupaten (Master)": t("fieldLabel.cityMaster"),
    "City/Kabupaten": t("fieldLabel.cityKabupaten"),
    City: t("fieldLabel.city"),
    "Capacity Core": t("fieldLabel.capacityCore"),
    "Kapasitas Core": t("fieldLabel.capacityCore"),
    "Used Core": t("fieldLabel.usedCore"),
    "Total Ports": t("fieldLabel.totalPorts"),
    "Total Port": t("fieldLabel.totalPorts"),
    "Used Ports": t("fieldLabel.usedPorts"),
    "Splitter Ratio": t("fieldLabel.splitterRatio"),
    "Rasio Splitter": t("fieldLabel.splitterRatio"),
    "Splitter Profile": t("fieldLabel.splitterProfile"),
    "Kapasitas Splitter ODP": t("fieldLabel.odpSplitterCapacity"),
    "Tipe Kabel": t("fieldLabel.cableType"),
    "Panjang Kabel (meter)": t("fieldLabel.cableLengthMeters"),
    "Nama Rute / Segmen": t("fieldLabel.routeSegmentName"),
    "Customer Name": t("fieldLabel.customerName"),
    "Customer Reference (opsional)": t("fieldLabel.customerRefOptional"),
    "Project Reference": t("fieldLabel.projectReference"),
    "Device Type": t("fieldLabel.deviceType"),
    "Device Name": t("fieldLabel.deviceName"),
    "Device ID": t("fieldLabel.deviceId"),
    "Asset Group": t("fieldLabel.assetGroup"),
    "Feeder Port Count": t("fieldLabel.feederPortCount"),
    "Distribution Port Count": t("fieldLabel.distributionPortCount"),
    "Management IP": t("fieldLabel.managementIp"),
    "Image Attachments": t("fieldLabel.imageAttachments"),
    "Support Documents": t("fieldLabel.supportDocuments"),
    "Document Attachments": t("fieldLabel.documentAttachments"),
    "From Device": t("fieldLabel.fromDevice"),
    "From Port": t("fieldLabel.fromPort"),
    "To Device": t("fieldLabel.toDevice"),
    "To Port": t("fieldLabel.toPort"),
    "Uplink Device": t("fieldLabel.uplinkDevice"),
    "From Cable": t("fieldLabel.fromCable"),
    "To Cable": t("fieldLabel.toCable"),
    "Core Start": t("fieldLabel.coreStart"),
    "Core End": t("fieldLabel.coreEnd"),
    "Splice Tray Count": t("fieldLabel.spliceTrayCount"),
    "Upstream Device (OTB)": t("fieldLabel.upstreamDeviceOtb"),
    "Upstream Cable": t("fieldLabel.upstreamCable"),
    "Koneksi Backbone": t("fieldLabel.backboneConnection"),
    "Uplink Switch": t("fieldLabel.uplinkSwitch"),
    "Uplink Router": t("fieldLabel.uplinkRouter"),
    "Source ODP": t("fieldLabel.sourceOdp"),
    "ODP Port": t("fieldLabel.odpPort"),
    "Source OLT": t("fieldLabel.sourceOlt"),
    "Source ODC": t("fieldLabel.sourceOdc"),
    "ODC Port": t("fieldLabel.odcPort"),
    "Cable Distribusi": t("fieldLabel.distributionCable"),
    "Distribution Core Start": t("fieldLabel.distCoreStart"),
    "Distribution Core End": t("fieldLabel.distCoreEnd"),
    Customer: t("fieldLabel.customer"),
    "Service Type": t("fieldLabel.serviceType"),
    "Contact Name": t("fieldLabel.contactName"),
    "Contact Phone": t("fieldLabel.contactPhone"),
    Title: t("fieldLabel.title"),
    "Field Key": t("fieldLabel.fieldKey"),
    "Options (CSV)": t("fieldLabel.optionsCsv"),
    "Help Text": t("fieldLabel.helpText"),
    Tenant: t("fieldLabel.tenant"),
    Route: t("fieldLabel.route"),
    Rack: t("fieldLabel.rack"),
    Status: t("fieldLabel.status"),
    Latitude: t("fieldLabel.latitude"),
    Longitude: t("fieldLabel.longitude"),
  };
  return map[label] || label;
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
    "Kapasitas Core": t("fieldTip.capacityCore"),
    "Used Core": t("fieldTip.usedCore"),
    "Total Ports": t("fieldTip.totalPorts"),
    "Total Port": t("fieldTip.totalPorts"),
    "Used Ports": t("fieldTip.usedPorts"),
    "Splitter Ratio": t("fieldTip.splitterRatio"),
    "Rasio Splitter": t("fieldTip.splitterRatio"),
    "Splitter Profile": t("fieldTip.splitterRatio"),
    "Kapasitas Splitter ODP": t("fieldTip.splitterRatio"),
    "Tipe ODP": t("createForm.odpTypeTip"),
    "Jenis Instalasi": t("createForm.installationTip"),
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
