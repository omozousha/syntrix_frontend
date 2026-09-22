"use client";

import { CheckCircle2, Database, Layers, ShieldCheck, AlertTriangle } from "lucide-react";

type MasterDataStatBarProps = {
  totalItems: number;
  totalCategories?: number;
  failedCount?: number;
};

export function MasterDataStatBar({ totalItems, totalCategories = 21, failedCount = 0 }: MasterDataStatBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Item */}
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Total Item Master</p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{totalItems}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">Agregat seluruh repositori</p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
            <Database className="size-4 text-sky-500" />
          </div>
        </div>
      </div>

      {/* Kategori Referensi */}
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Kategori Referensi</p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{totalCategories}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">4 domain referensi</p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
            <Layers className="size-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Hak Akses */}
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Otoritas Kelola</p>
            <p className="mt-0.5 font-mono text-xl font-semibold text-foreground">Admin</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">Full read & write</p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Status Sinkronisasi */}
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Status Katalog</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
              {failedCount === 0 ? "100% Siap" : `${failedCount} Terkendala`}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {failedCount === 0 ? "Semua schema aktif" : "Perlu periksa backend"}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">
            {failedCount === 0 ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="size-4 text-amber-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
