"use client";

import Link from "next/link";
import { ArrowRight, CircleDot, Database, Split, Users } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PopDetailSummaryStripProps = {
  popId: string;
  totalDevices: number;
  totalOdp: number;
  totalPorts: number;
  totalCustomers: number;
  loading?: boolean;
};

export function PopDetailSummaryStrip({
  popId,
  totalDevices,
  totalOdp,
  totalPorts,
  totalCustomers,
  loading = false,
}: PopDetailSummaryStripProps) {
  const customerListHref = `/data-management/list/customer?pop_id=${encodeURIComponent(popId)}`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <OperationalKpiCard
        label="Total Device"
        value={loading ? "..." : totalDevices.toLocaleString("id-ID")}
        caption="Perangkat aktif terpasang"
        icon={Database}
        tone="blue"
        compact
      />

      <OperationalKpiCard
        label="Total ODP"
        value={loading ? "..." : totalOdp.toLocaleString("id-ID")}
        caption="Optical Distribution Point"
        icon={Split}
        tone="blue"
        compact
      />

      <OperationalKpiCard
        label="Total Port"
        value={loading ? "..." : totalPorts.toLocaleString("id-ID")}
        caption="Kapasitas port perangkat"
        icon={CircleDot}
        tone="slate"
        compact
      />

      <Card className="rounded-2xl border border-border/60 bg-card shadow-2xs glass-inset transition-all duration-300 hover:border-emerald-500/40 hover:bg-muted/15 active:scale-[0.98]">
        <CardContent className="flex flex-col items-stretch justify-between gap-1.5 p-2.5 h-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                <Users className="size-3.5" />
              </div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground leading-tight">
                Total Customer
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Link href={customerListHref} title="Buka Daftar Pelanggan POP">
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
          <div>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground leading-tight">
              {loading ? "..." : totalCustomers.toLocaleString("id-ID")}
            </p>
            <Link
              href={customerListHref}
              className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
            >
              <span>Pelanggan terhubung</span>
              <ArrowRight className="size-2.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
