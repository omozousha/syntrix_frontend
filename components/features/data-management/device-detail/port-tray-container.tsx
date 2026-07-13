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
  getTubeColor,
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
  /** Konfigurasi tray dari asset_model.tray_config (master data). */
  trayConfigPayload,
  usedCore,
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
  /**
   * Konfigurasi tray dari asset_model.tray_config.
   * Langsung dari field tray_config di API response asset_models.
   */
  trayConfigPayload?: unknown;
  /** Jumlah core terpakai (khusus CABLE, dari device.used_core) */
  usedCore?: number;
  loading?: boolean;
  onPortClick?: (port: DevicePort) => void;
  className?: string;
}) {
  // Resolve layout config: prefer explicit, otherwise auto-generate
  const layoutConfig: TrayLayoutConfig | null = useMemo(() => {
    if (layoutConfigProp) return layoutConfigProp;
    if (deviceTypeKey) return resolveTrayLayout(deviceTypeKey, totalPorts, trayConfigPayload);
    return null;
  }, [layoutConfigProp, deviceTypeKey, totalPorts, trayConfigPayload]);

  const connectionMap = useMemo(
    () => buildConnectionMap(connections || []),
    [connections],
  );

  const groupedPorts = useMemo(
    () => (layoutConfig ? groupPortsByTray(devicePorts, layoutConfig) : new Map<string, DevicePort[]>()),
    [devicePorts, layoutConfig],
  );

  const isCable = deviceTypeKey?.toUpperCase() === "CABLE";
  const sectionTitle = `${isCable ? "Core" : "Port"} ${deviceTypeLabel || "Device"}`;

  if (loading) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">{sectionTitle}</p>
        <AppLoading label={`Memuat ${isCable ? "core" : "port"}...`} />
      </div>
    );
  }

  if (!layoutConfig) {
    if (isCable) {
      const totalCores = totalPorts || 0;
      const usedCores = usedCore ?? devicePorts.filter((p) => p.status === "used").length;
      const idleCores = Math.max(0, totalCores - usedCores);

      return (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTitle}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border bg-green-50/50 p-2 text-center">
              <p className="text-lg font-bold text-green-700">{totalCores}</p>
              <p className="text-[10px] text-green-600">Total Core</p>
            </div>
            <div className="rounded-md border bg-blue-50/50 p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{usedCores}</p>
              <p className="text-[10px] text-blue-600">Terpakai</p>
            </div>
            <div className="rounded-md border bg-slate-50/50 p-2 text-center">
              <p className="text-lg font-bold text-slate-600">{idleCores}</p>
              <p className="text-[10px] text-slate-500">Idle</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">{sectionTitle}</p>
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tampilan port/tube tidak tersedia untuk device type ini.
        </div>
      </div>
    );
  }

  // Jika tidak ada port records, tray tetap dirender dengan placeholder slots

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{sectionTitle}</p>
      </div>

      {layoutConfig.trays.map((tray, trayIndex) => {
        const tubeColor = getTubeColor(trayIndex);
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

        // Build lookup map for O(1) port access
        const portLookup = new Map<number, DevicePort>();
        for (const p of sortedPorts) {
          portLookup.set(p.port_index, p);
        }

        // Generate full slot list: fill gaps with placeholder ports
        // sehingga semua posisi di tray terlihat (tidak hanya yang ada di DB)
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

        // badge counts: placeholder positions counted as idle
        const placeholderCount = totalInTray - portsInTray.length;

        return (
          <div key={tray.id} className={`space-y-2 rounded-lg border-l-4 p-3 ${tubeColor.bg} ${tubeColor.border}`}>
            {/* Tray header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-xs font-semibold ${tubeColor.text}`}>
                🧪 {tray.label} (Port {tray.portRange[0]}–
                {tray.portRange[1]})
              </p>
              <PortTrayBadge
                totalPorts={totalInTray}
                usedCount={usedCount}
                idleCount={idleCount + placeholderCount}
                reservedCount={reservedCount}
                downCount={downCount}
              />
            </div>

            {/* Port grid */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-2">
              {allSlots.map(({ port, isPlaceholder }) => (
                <PortTrayCard
                  key={port.id}
                  port={port}
                  connection={isPlaceholder ? null : (connectionMap.get(port.id) || null)}
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
