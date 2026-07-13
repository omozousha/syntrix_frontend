"use client";

import { useMemo } from "react";
import { AppLoading } from "@/components/app-loading-new";
import {
  type DevicePort,
  type PortConnection,
  type TrayLayoutConfig,
  groupPortsByTray,
  buildConnectionMap,
  generateOltLayout,
} from "./port-tray-types";
import { OltPortCard } from "./olt-port-card";
import { PortTrayBadge } from "./port-tray-badge";

export function OltPortContainer({
  devicePorts,
  connections,
  totalPorts,
  ponPortCount,
  uplinkPortCount,
  loading = false,
  onPortClick,
  className,
}: {
  devicePorts: DevicePort[];
  connections?: PortConnection[];
  /** Jumlah total port device (PON + uplink). */
  totalPorts?: number;
  /** Jumlah port PON (optional, auto-compute dari totalPorts). */
  ponPortCount?: number;
  /** Jumlah port uplink (optional, default 4). */
  uplinkPortCount?: number;
  loading?: boolean;
  onPortClick?: (port: DevicePort) => void;
  className?: string;
}) {
  const layoutConfig: TrayLayoutConfig = useMemo(
    () => generateOltLayout(totalPorts || 24, ponPortCount, uplinkPortCount),
    [totalPorts, ponPortCount, uplinkPortCount],
  );

  const connectionMap = useMemo(
    () => buildConnectionMap(connections || []),
    [connections],
  );

  const groupedPorts = useMemo(
    () => groupPortsByTray(devicePorts, layoutConfig),
    [devicePorts, layoutConfig],
  );

  if (loading) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Port OLT</p>
        <AppLoading label="Memuat port OLT..." />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Port OLT</p>

      {layoutConfig.trays.map((tray) => {
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
            {/* Line card header */}
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

            {/* Port grid — lebih padat untuk OLT (banyak port) */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(56px,1fr))] gap-1.5">
              {allSlots.map(({ port, isPlaceholder }) => (
                <OltPortCard
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
