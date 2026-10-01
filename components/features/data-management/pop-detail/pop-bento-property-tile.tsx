"use client";

import { useState } from "react";
import { FileText, Copy, Check, Calendar, Landmark, User, Phone, ShieldAlert, AlertCircle, Clock, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslate, type TFn } from "@/lib/use-locale";

export type PopSitePropertyData = {
  pbb_nop?: string | null;
  building_status?: string | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  annual_lease_cost?: string | number | null;
  landlord_name?: string | null;
  landlord_contact?: string | null;
  permit_number?: string | null;
  legal_notes?: string | null;
};

type PopBentoPropertyTileProps = {
  property?: PopSitePropertyData | null;
};

function formatRupiah(val?: string | number | null) {
  if (!val) return "-";
  const num = Number(val);
  if (!Number.isFinite(num) || num === 0) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

const BUILDING_STATUS_MAP: Record<string, string> = {
  "sewa lahan / ruko": "Land / Building Lease",
  "milik sendiri": "Owned",
  sewa: "Lease",
  owned: "Owned",
  own: "Owned",
};

function formatPropertyStatus(status: string | null | undefined, locale: string, t: TFn): string {
  if (!status) return t("propertyTile.defaultStatus");
  if (locale !== "en") return status;
  return BUILDING_STATUS_MAP[status.toLowerCase()] ?? status;
}

function formatDate(val?: string | null) {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return val;
  }
}

function getLeaseRemainingDays(endDateStr?: string | null, t?: TFn): { days: number; text: string; tone: "ok" | "warning" | "expired" } | null {
  if (!endDateStr) return null;
  try {
    const end = new Date(endDateStr);
    if (Number.isNaN(end.getTime())) return null;
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return { days, text: t ? t("propertyTile.expired") : "Kontrak Kadaluarsa", tone: "expired" };
    if (days <= 60) return { days, text: t ? t("propertyTile.daysRemaining", { days }) : `Sisa ${days} Hari (Mendekati Jatuh Tempo)`, tone: "warning" };
    return { days, text: t ? t("propertyTile.daysOk", { days }) : `Sisa ${days} Hari`, tone: "ok" };
  } catch {
    return null;
  }
}

export function PopBentoPropertyTile({ property }: PopBentoPropertyTileProps) {
  const { t, locale } = useTranslate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const pbbNop = property?.pbb_nop || "";
  const rawBuildingStatus = property?.building_status || "Sewa Lahan / Ruko";
  const buildingStatus = formatPropertyStatus(rawBuildingStatus, locale, t);
  const isOwned = rawBuildingStatus.toLowerCase().includes("milik") || rawBuildingStatus.toLowerCase().includes("owned");
  const leaseEnd = property?.lease_end_date;
  const leaseStatus = isOwned ? null : getLeaseRemainingDays(leaseEnd, t);

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <Landmark className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t("propertyTile.title")}</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t("propertyTile.eyebrow")}</p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`font-mono text-[10px] uppercase tracking-wide rounded-full px-2.5 py-0.5 ${
              isOwned
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : leaseStatus?.tone === "expired"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : leaseStatus?.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
            }`}
          >
            {isOwned ? t("propertyTile.owned") : leaseStatus?.text || buildingStatus}
          </Badge>
        </div>

        {/* 4 Primary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* PBB / NOP */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">PBB / NOP</span>
              {pbbNop ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-4 p-0 rounded-sm hover:bg-muted"
                  onClick={() => copyText(pbbNop, "nop")}
                  title={t("propertyTile.copyNop")}
                >
                  {copiedKey === "nop" ? <Check className="size-2.5 text-emerald-500" /> : <Copy className="size-2.5 text-muted-foreground" />}
                </Button>
              ) : null}
            </div>
            <p className="font-mono tabular-nums text-sm font-bold text-foreground truncate">
              {pbbNop || t("propertyTile.unregistered")}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("propertyTile.nopCaption")}</p>
          </div>

          {/* Periode Kontrak Sewa */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.leasePeriod")}</span>
            <p className="font-mono tabular-nums text-sm font-bold text-foreground truncate">
              {property?.lease_end_date ? formatDate(property.lease_end_date) : isOwned ? t("propertyTile.permanent") : "-"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {property?.lease_start_date ? t("propertyTile.leaseStart", { date: formatDate(property.lease_start_date) }) : t("propertyTile.leaseExpiry")}
            </p>
          </div>

          {/* Pemilik Lahan (Landlord) */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.landlord")}</span>
            <p className="text-sm font-bold text-foreground truncate" title={property?.landlord_name || "-"}>
              {property?.landlord_name || "-"}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground truncate">
              {property?.landlord_contact ? t("propertyTile.contact", { phone: property.landlord_contact }) : t("propertyTile.contactEmpty")}
            </p>
          </div>

          {/* Biaya Sewa Tahunan */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.leaseCost")}</span>
            <p className="font-mono tabular-nums text-sm font-bold text-foreground truncate">
              {isOwned ? t("propertyTile.ownedCost") : formatRupiah(property?.annual_lease_cost)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("propertyTile.leaseCostCaption")}</p>
          </div>
        </div>

        {/* Secondary Info: Status Lahan & Izin PBG/IMB */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
          <div className="space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.landStatus")}</p>
            <p className="font-semibold text-foreground truncate">{buildingStatus}</p>
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.permit")}</p>
            <p className="font-mono tabular-nums font-semibold text-foreground truncate">
              {property?.permit_number || "-"}
            </p>
          </div>

          <div className="space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("propertyTile.legalNotes")}</p>
            <p className="text-muted-foreground truncate italic">
              {property?.legal_notes || t("propertyTile.legalNotesEmpty")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
