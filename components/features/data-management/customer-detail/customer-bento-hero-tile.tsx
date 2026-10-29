"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Check, Copy, FolderKanban, Mail, Phone, Tag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CustomerBentoHeroTileProps = {
  customerName: string;
  customerNumber: string; // CID
  status?: string | null;
  serviceType?: string | null;
  popName?: string | null;
  popCode?: string | null;
  popId?: string | null;
  projectName?: string | null;
  projectId?: string | null;
  regionName?: string | null;
  regionId?: string | null;
  installationDate?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  email?: string | null;
  tags?: string[] | null;
};

export function CustomerBentoHeroTile({
  customerName,
  customerNumber,
  status = "active",
  serviceType,
  popName,
  popCode,
  popId,
  projectName,
  projectId,
  regionName,
  regionId,
  installationDate,
  contactName,
  contactPhone,
  email,
  tags,
}: CustomerBentoHeroTileProps) {
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
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  const cleanCid = (customerNumber || "CSC-XXXX").replace(/^CID:\s*/i, "").trim().toUpperCase();
  const cleanStatus = (status || "active").toLowerCase();
  const isStatusActive = cleanStatus === "active";

  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Eyebrow & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Customer Identity &amp; Service
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`font-mono text-[9px] uppercase tracking-wider ${
                isStatusActive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {cleanStatus}
            </Badge>

            {serviceType && (
              <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-wider">
                {serviceType}
              </Badge>
            )}

            {regionName && (
              <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {regionName}
              </Badge>
            )}
          </div>
        </div>

        {/* Customer Main Name & CID */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {customerName || "Customer"}
            </h2>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">CID</span>
              <span className="font-mono text-xs font-bold tracking-tight text-foreground tabular-nums">
                {cleanCid}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyText(cleanCid, "cid")}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              >
                {copiedKey === "cid" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Double-Bezel Grid Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {/* POP */}
          <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
              <Building2 className="size-3" />
              <span>POP Gateway</span>
            </div>
            <div className="mt-1">
              {popId ? (
                <Link
                  href={`/data-management/list/pop/${popId}`}
                  className="font-medium text-xs text-primary hover:underline truncate block"
                >
                  {popName || "POP"} {popCode ? `(${popCode})` : ""}
                </Link>
              ) : (
                <span className="text-xs font-medium text-foreground truncate block">
                  {popName || "-"}
                </span>
              )}
            </div>
          </div>

          {/* Project */}
          <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
              <FolderKanban className="size-3" />
              <span>Project</span>
            </div>
            <div className="mt-1">
              {projectId ? (
                <Link
                  href={`/data-management/list/projects/${projectId}${regionId ? `?region_id=${regionId}` : ""}`}
                  className="font-medium text-xs text-primary hover:underline truncate block"
                >
                  {projectName || "Project"}
                </Link>
              ) : (
                <span className="text-xs font-medium text-foreground truncate block">
                  {projectName || "-"}
                </span>
              )}
            </div>
          </div>

          {/* Tanggal Instalasi */}
          <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
            <div className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
              Tanggal Instalasi
            </div>
            <span className="mt-1 font-mono text-xs font-medium text-foreground tabular-nums">
              {formatDate(installationDate)}
            </span>
          </div>

          {/* Kontak / Telepon */}
          {(contactName || contactPhone) && (
            <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
                <Phone className="size-3" />
                <span>Kontak PIC</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {contactName && <p className="text-xs font-medium text-foreground truncate">{contactName}</p>}
                {contactPhone && <p className="font-mono text-[11px] text-muted-foreground tabular-nums">{contactPhone}</p>}
              </div>
            </div>
          )}

          {/* Email */}
          {email && (
            <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/10 p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider">
                <Mail className="size-3" />
                <span>Email</span>
              </div>
              <span className="mt-1 text-xs text-foreground truncate block" title={email}>
                {email}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {Array.isArray(tags) && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30">
            <Tag className="size-3 text-muted-foreground" />
            {tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
