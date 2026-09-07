"use client";

import { ShieldCheck, User, Calendar, CheckCircle2, AlertTriangle, XCircle, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mapValidationStatus } from "@/lib/validation-status";

type ValidationRecordItem = {
  id: string;
  validation_id?: string | null;
  status?: string | null;
  request_status?: string | null;
  validated_at?: string | null;
  created_at?: string | null;
  findings?: string | null;
  validator_name?: string | null;
  validator_email?: string | null;
  validator_user_code?: string | null;
  adminregion_actor_name?: string | null;
  adminregion_review_note?: string | null;
  adminregion_action_at?: string | null;
  superadmin_actor_name?: string | null;
  superadmin_review_note?: string | null;
  superadmin_action_at?: string | null;
};

type DeviceBentoValidationHistoryTileProps = {
  deviceTypeLabel?: string;
  records: ValidationRecordItem[];
  loading?: boolean;
};

export function DeviceBentoValidationHistoryTile({
  deviceTypeLabel = "Perangkat",
  records = [],
  loading = false,
}: DeviceBentoValidationHistoryTileProps) {
  function formatDate(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs glass-inset transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Riwayat Validasi Lapangan</h2>
              <p className="text-xs text-muted-foreground">
                Daftar audit fisik, pemeriksaan teknis, dan keputusan approval tim operasional.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 font-mono text-[10px] tabular-nums">
            {records.length} riwayat
          </Badge>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Memuat riwayat validasi...
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-3">
            {records.map((rec, index) => {
              const statusUi = mapValidationStatus(rec.request_status || rec.status);
              return (
                <div
                  key={rec.id || index}
                  className="rounded-xl border border-border/60 bg-muted/15 p-4 shadow-2xs space-y-3 transition-colors hover:bg-muted/25"
                >
                  {/* Record Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {rec.validation_id || `Validasi #${index + 1}`}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatDate(rec.validated_at || rec.created_at)}
                      </span>
                    </div>
                    <Badge variant="outline" className={`rounded-full font-mono text-[10px] uppercase ${statusUi.className}`}>
                      {statusUi.label}
                    </Badge>
                  </div>

                  {/* Actor Timeline Chips */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded-lg bg-background/60 p-2 border border-border/40 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
                        <User className="size-3" />
                        <span>Validator</span>
                      </div>
                      <p className="font-medium text-foreground truncate">{rec.validator_name || "-"}</p>
                    </div>

                    <div className="rounded-lg bg-background/60 p-2 border border-border/40 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
                        <ShieldCheck className="size-3 text-sky-500" />
                        <span>Admin Region</span>
                      </div>
                      <p className="font-medium text-foreground truncate">{rec.adminregion_actor_name || "-"}</p>
                    </div>

                    <div className="rounded-lg bg-background/60 p-2 border border-border/40 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
                        <ShieldCheck className="size-3 text-emerald-500" />
                        <span>Superadmin</span>
                      </div>
                      <p className="font-medium text-foreground truncate">{rec.superadmin_actor_name || "-"}</p>
                    </div>
                  </div>

                  {/* Notes / Findings */}
                  {rec.findings || rec.adminregion_review_note || rec.superadmin_review_note ? (
                    <div className="rounded-lg bg-muted/30 p-2.5 border border-border/30 text-xs space-y-1">
                      {rec.findings ? (
                        <p className="text-foreground leading-relaxed">
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">Catatan Validator: </span>
                          {rec.findings}
                        </p>
                      ) : null}
                      {rec.adminregion_review_note ? (
                        <p className="text-foreground leading-relaxed">
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">Catatan Adminregion: </span>
                          {rec.adminregion_review_note}
                        </p>
                      ) : null}
                      {rec.superadmin_review_note ? (
                        <p className="text-foreground leading-relaxed">
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">Catatan Superadmin: </span>
                          {rec.superadmin_review_note}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-semibold text-foreground">Belum ada riwayat validasi</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
              Perangkat ini belum pernah diajukan atau disetujui dalam workflow validasi lapangan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
