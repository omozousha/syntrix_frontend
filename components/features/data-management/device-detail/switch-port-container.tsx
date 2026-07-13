"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AppLoading } from "@/components/app-loading-new";
import {
  type DevicePort,
  type PortConnection,
  type TrayLayoutConfig,
  groupPortsByTray,
  generateSwitchLayout,
} from "./port-tray-types";
import { SwitchPortCard } from "./switch-port-card";
import { PortTrayBadge } from "./port-tray-badge";

export function SwitchPortContainer({
  devicePorts,
  connections,
  totalPorts,
  accessPortCount,
  uplinkPortCount,
  loading = false,
  onPortClick,
  className,
}: {
  devicePorts: DevicePort[];
  connections?: PortConnection[];
  /** Jumlah total port device (access + uplink). */
  totalPorts?: number;
  /** Jumlah port access RJ45 (optional, auto-compute dari totalPorts). */
  accessPortCount?: number;
  /** Jumlah port uplink SFP+ (optional, default 4). */
  uplinkPortCount?: number;
  loading?: boolean;
  onPortClick?: (port: DevicePort) => void;
  className?: string;
}) {
  const layoutConfig: TrayLayoutConfig = useMemo(
    () => generateSwitchLayout(totalPorts || 48, accessPortCount, uplinkPortCount),
    [totalPorts, accessPortCount, uplinkPortCount],
  );

  const groupedPorts = useMemo(
    () => groupPortsByTray(devicePorts, layoutConfig),
    [devicePorts, layoutConfig],
  );

  if (loading) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Port Switch</p>
        <AppLoading label="Memuat port switch..." />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-md border p-3", className)}>
      <p className="text-sm font-medium">Port Switch</p>

      {layoutConfig.trays.map((tray, trayIndex) => {
        const portsInTray = groupedPorts.get(tray.id) || [];
        const totalInTray = tray.portRange[1] - tray.portRange[0] + 1;
        const usedCount = portsInTray.filter(
          (p) => p.status === "up" || p.status === "active" || p.status === "used",
        ).length;
        const idleCount = portsInTray.filter(
          (p) => !p.status || p.status === "idle",
        ).length;
        const reservedCount = portsInTray.filter(
          (p) => p.status === "reserved",
        ).length;
        const downCount = portsInTray.filter(
          (p) => p.status === "down" || p.status === "faulty" || p.status === "error",
        ).length;

        const sortedPorts = [...portsInTray].sort(
          (a, b) => a.port_index - b.port_index,
        );

        const portLookup = new Map<number, DevicePort>();
        for (const p of sortedPorts) {
          portLookup.set(p.port_index, p);
        }

        const allSlots: Array<{ port: DevicePort; isPlaceholder: boolean }> = [];
        for (let i = tray.portRange[0]; i <= tray.portRange[1]; i++) {
          const existingPort = portLookup.get(i);
          if (existingPort) {
            allSlots.push({ port: existingPort, isPlaceholder: false });
          } else {
            allSlots.push({
              port: {
                id: `placeholder-${tray.id}-${i}`,
                port_index: i,
                port_label: String(i),
                port_type: tray.id === "uplink" ? "SFP+" : "RJ45",
                status: null,
              } as DevicePort,
              isPlaceholder: true,
            });
          }
        }

        const placeholderCount = totalInTray - portsInTray.length;
        const isUplink = tray.id === "uplink";

        return (
          <div
            key={tray.id}
            className={`space-y-2 rounded-lg border-l-4 p-3 ${
              isUplink
                ? "border-l-amber-500 bg-amber-50/50"
                : "border-l-sky-500 bg-sky-50/50"
            }`}
          >
            {/* Group header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-xs font-semibold ${
                  isUplink ? "text-amber-800" : "text-sky-800"
                }`}
              >
                {isUplink ? "🔗" : "🔌"} {tray.label}
              </p>
              <PortTrayBadge
                totalPorts={totalInTray}
                usedCount={usedCount}
                idleCount={idleCount + placeholderCount}
                reservedCount={reservedCount}
                downCount={downCount}
              />
            </div>

            {/* Port grid — compact grid for high-density switch ports */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(48px,1fr))] gap-1">
              {allSlots.map(({ port, isPlaceholder }) => (
                <SwitchPortCard
                  key={port.id}
                  port={port}
                  onClick={onPortClick}
                  size="sm"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
