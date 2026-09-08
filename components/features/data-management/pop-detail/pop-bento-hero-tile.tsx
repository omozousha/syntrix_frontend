"use client";

import { useState } from "react";
import { Copy, Check, Building2, Zap, Calendar, ShieldCheck, Tag, Radio, CreditCard, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapValidationStatus } from "@/lib/validation-status";

type PopBentoHeroTileProps = {
  popName: string;
  popCode: string;
  popType?: string | null;
  regionName?: string | null;
  statusPop?: string | null;
  validationStatus?: string | null;
  tanggalPopAktif?: string | null;
  tenant?: string | null;
  plnCidNumber?: string | null;
  plnPaymentMethod?: string | null;
  plnPhase?: string | null;
  plnWattage?: string | number | null;
  updatedAt?: string | null;
  tags?: string[] | null;
};

export function PopBentoHeroTile({
  popName,
  popCode,
  popType,
  regionName,
  statusPop = "active",
  validationStatus = "unvalidated",
  tanggalPopAktif,
  tenant,
  plnCidNumber,
  plnPaymentMethod,
  plnPhase,
  plnWattage,
  updatedAt,
  tags,
}: PopBentoHeroTileProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  const valUi = mapValidationStatus(validationStatus || "unvalidated");
  const statusLower = (statusPop || "active").toLowerCase();
  const statusColorClass =
    statusLower === "active"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
      : statusLower === "maintenance"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : statusLower === "planning"
      ? "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400"
      : "bg-muted text-muted-foreground border-border/60";

  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider border-primary/40 bg-primary/10 text-primary"
            >
              <Building2 className="mr-1.5 size-3.5" />
              {popType || "Point of Presence"}
            </Badge>
            <Badge
              variant="outline"
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide border ${statusColorClass}`}
            >
              <span
                className={`mr-1.5 size-1.5 rounded-full ${
                  statusLower === "active"
                    ? "bg-emerald-500 animate-pulse"
                    : statusLower === "maintenance"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              />
              {statusPop || "Active"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {updatedAt ? (
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                Update: {formatDate(updatedAt)}
              </span>
            ) : null}
            <Badge variant="outline" className={`rounded-full font-mono text-[10px] uppercase tracking-wider ${valUi.className}`}>
              <ShieldCheck className="mr-1 size-3" />
              {valUi.label}
            </Badge>
          </div>
        </div>

        {/* Title / Name */}
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">POP Site Center</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
            {popName || "Unnamed POP"}
          </h1>
        </div>

        {/* Technical IDs (POP Code) & Tanggal Aktif */}
        <div className="flex flex-wrap items-center gap-2">
          {popCode ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Code:</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{popCode}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 rounded-md hover:bg-muted"
                onClick={() => copyText(popCode, "code")}
                title="Salin POP Code"
              >
                {copiedKey === "code" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
              </Button>
            </div>
          ) : null}

          {regionName ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Region:</span>
              <span className="font-semibold text-foreground">{regionName}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
            <Calendar className="size-3 text-muted-foreground" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Aktif:</span>
            <span className="font-mono tabular-nums font-medium text-foreground">
              {tanggalPopAktif ? formatDate(tanggalPopAktif) : "-"}
            </span>
          </div>

          {tenant ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Tenant:</span>
              <span className="font-medium text-foreground">{tenant}</span>
            </div>
          ) : null}
        </div>

        {/* Tags if present */}
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <Tag className="size-3 text-muted-foreground mr-1" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* PLN / Power Infrastructure Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
              <Zap className="size-3.5" />
              <span>Infrastruktur Daya PLN</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {plnPaymentMethod || "Pasca/Pra-bayar"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-500/20 text-[11px]">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Nomor CID</p>
              <div className="flex items-center gap-1">
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {plnCidNumber || "-"}
                </span>
                {plnCidNumber ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-4 p-0 rounded-sm hover:bg-amber-500/20"
                    onClick={() => copyText(plnCidNumber, "cid")}
                    title="Salin CID"
                  >
                    {copiedKey === "cid" ? <Check className="size-2.5 text-emerald-500" /> : <Copy className="size-2.5 text-muted-foreground" />}
                  </Button>
                ) : null}
              </div>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Daya Wattage</p>
              <p className="font-mono tabular-nums font-semibold text-foreground">
                {plnWattage ? `${plnWattage} VA` : "-"}
              </p>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Phase Daya</p>
              <p className="font-semibold text-foreground">
                {plnPhase ? `${plnPhase} Phase` : "1 Phase"}
              </p>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Metode Bayar</p>
              <p className="font-semibold text-foreground truncate">
                {plnPaymentMethod || "-"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
