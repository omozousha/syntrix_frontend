"use client";

import Link from "next/link";
import { Cable, ExternalLink, Network, Radio, Router } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type ServicePortItem = {
  id: string;
  port_index: number;
  port_label?: string | null;
  status?: string | null;
  speed_profile?: string | null;
  port_type?: string | null;
  device_id?: string | null;
  ont_device_id?: string | null;
  odpDevice?: {
    id: string;
    device_name?: string | null;
    device_id?: string | null;
    device_type_key?: string | null;
    status?: string | null;
  } | null;
};

type CustomerBentoConnectionTileProps = {
  ports: ServicePortItem[];
  loading?: boolean;
};

export function CustomerBentoConnectionTile({
  ports,
  loading = false,
}: CustomerBentoConnectionTileProps) {
  const hasConnections = Array.isArray(ports) && ports.length > 0;

  return (
    <Card className="flex flex-col justify-between rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-4 flex flex-col justify-between h-full">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Network className="size-4 text-emerald-500" />
              <span>Koneksi Jaringan &amp; Port ODP</span>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider">
              {ports.length} Port Terhubung
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <span className="font-mono text-xs">Memuat relasi koneksi...</span>
            </div>
          ) : !hasConnections ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-6 px-4 text-center">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2">
                <Cable className="size-4" />
              </div>
              <p className="text-xs font-medium text-foreground">Belum Terhubung ke Port ODP</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                Hubungkan pelanggan ini ke port drop/distribution melalui halaman Detail ODP.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ports.map((port) => {
                const odp = port.odpDevice;
                const portLabel = port.port_label || `Port ${port.port_index}`;
                const odpName = odp?.device_name || "ODP";
                const odpCode = odp?.device_id;

                return (
                  <div
                    key={port.id}
                    className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-3 hover:border-border/80 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Radio className="size-3.5" />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            ODP Terhubung
                          </span>
                          {odp ? (
                            <Link
                              href={`/data-management/list/device/${odp.id}`}
                              className="font-semibold text-xs text-foreground hover:text-primary flex items-center gap-1"
                            >
                              <span>{odpName}</span>
                              {odpCode && (
                                <span className="font-mono text-[10px] text-muted-foreground">({odpCode})</span>
                              )}
                              <ExternalLink className="size-3 opacity-60" />
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-foreground">ODP ID: {port.device_id}</span>
                          )}
                        </div>
                      </div>

                      <Badge variant="secondary" className="font-mono text-[10px] tracking-tight tabular-nums">
                        {portLabel}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30 text-[11px]">
                      <div className="flex items-center gap-2">
                        {port.speed_profile && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {port.speed_profile}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] uppercase tracking-wider py-0 px-1.5"
                        >
                          {port.status || "active"}
                        </Badge>
                      </div>

                      {port.ont_device_id && (
                        <Link
                          href={`/data-management/list/device/${port.ont_device_id}`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
                        >
                          <Router className="size-3" />
                          <span>ONT Device</span>
                          <ExternalLink className="size-2.5 opacity-60" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
