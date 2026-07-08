"use client";

import { useMemo } from "react";
import { AppLoading } from "@/components/app-loading-new";
import {
  type DevicePort,
  type PortConnection,
  type TrayLayoutConfig,
  groupPortsByTray,
  buildConnectionMap,
  resolveTrayLayout,
  getFiberColor,
} from "./port-tray-types";
import { PortTrayCard } from "./port-tray-card";
import { PortTrayBadge } from "./port-tray-badge";

export function PortTrayContainer({
  devicePorts,
  connections,
  totalPorts,
  deviceTypeKey,
  deviceTypeLabel,
  layoutConfig: layoutConfigProp,
  loading = false,
  onPortClick,
  className,
}: {
  devicePorts: DevicePort[];
  connections?: PortConnection[];
  /** Jumlah total port device (untuk auto-generate layout OTB). */
  totalPorts?: number;
  /** Device type key untuk resolve layout rules. */
  deviceTypeKey?: string;
  deviceTypeLabel?: string;
  /**
   * Layout config opsional. Jika tidak di-provide, akan di-resolve
   * otomatis dari deviceTypeKey + totalPorts.
   */
  layoutConfig?: TrayLayoutConfig;
  loading?: boolean;
  onPortClick?: (port: DevicePort) => void;
  className?: string;
}) {
  // Resolve layout config: prefer explicit, otherwise auto-generate
  const layoutConfig: TrayLayoutConfig | null = useMemo(() => {
    if (layoutConfigProp) return layoutConfigProp;
    if (deviceTypeKey) return resolveTrayLayout(deviceTypeKey, totalPorts);
    return null;
  }, [layoutConfigProp, deviceTypeKey, totalPorts]);

  const connectionMap = useMemo(
    () => buildConnectionMap(connections || []),
    [connections],
  );

  const groupedPorts = useMemo(
    () => (layoutConfig ? groupPortsByTray(devicePorts, layoutConfig) : new Map<string, DevicePort[]>()),
    [devicePorts, layoutConfig],
  );

  if (loading) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">
          Port {deviceTypeLabel || "Device"}
        </p>
        <AppLoading label="Memuat port..." />
      </div>
    );
  }

  if (!layoutConfig) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">
          Port {deviceTypeLabel || "Device"}
        </p>
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tampilan tray tidak tersedia untuk device type ini.
        </div>
      </div>
    );
  }

  if (!devicePorts.length) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">
          Port {deviceTypeLabel || "Device"}
        </p>
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Belum ada port untuk device ini.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Port {deviceTypeLabel || "Device"}
        </p>
      </div>

      {layoutConfig.trays.map((tray) => {
        const portsInTray = groupedPorts.get(tray.id) || [];
        const totalInTray = tray.portRange[1] - tray.portRange[0] + 1;
        const usedCount = portsInTray.filter((p) => p.status === "used").length;
        const idleCount = portsInTray.filter(
          (p) => !p.status || p.status === "idle",
        ).length;
        const reservedCount = portsInTray.filter(
          (p) => p.status === "reserved",
        ).length;
        const downCount = portsInTray.filter(
          (p) => p.status === "down" || p.status === "maintenance" || p.status === "faulty",
        ).length;

        // Sort ports by port_index for consistent display
        const sortedPorts = [...portsInTray].sort(
          (a, b) => a.port_index - b.port_index,
        );

        return (
          <div key={tray.id} className="space-y-2">
            {/* Tray header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                🖥 {tray.label} (Port {tray.portRange[0]}–
                {tray.portRange[1]})
              </p>
              <PortTrayBadge
                totalPorts={totalInTray}
                usedCount={usedCount}
                idleCount={idleCount}
                reservedCount={reservedCount}
                downCount={downCount}
              />
            </div>

            {/* Port grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5">
              {sortedPorts.map((port) => (
                <PortTrayCard
                  key={port.id}
                  port={port}
                  connection={connectionMap.get(port.id) || null}
                  fiberColor={getFiberColor(port.port_index)}
                  onClick={onPortClick}
                  size="md"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
