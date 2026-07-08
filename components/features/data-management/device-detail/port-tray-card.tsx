"use client";

import { cn } from "@/lib/utils";
import {
  type DevicePort,
  type PortConnection,
  type FiberColor,
  getPortStatusClass,
  getPortStatusLabel,
  getConnectionLabel,
  getFiberColor,
  getFiberCoreNumber,
} from "./port-tray-types";

export function PortTrayCard({
  port,
  connection,
  fiberColor,
  onClick,
  size = "md",
  disabled = false,
  className,
}: {
  port: DevicePort;
  connection?: PortConnection | null;
  /** TIA/EIA-598 fiber color for stripe visual. Jika tidak di-provide, auto-compute dari port_index. */
  fiberColor?: FiberColor;
  onClick?: (port: DevicePort) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const status = port.status || "idle";
  const isIdle = status === "idle";
  const isConnected = !!connection;

  // Resolve fiber color from prop or auto-compute
  const fiber = fiberColor || getFiberColor(port.port_index);
  const fiberCoreNum = getFiberCoreNumber(port.port_index);

  const tooltipLines = [
    `Port ${port.port_label || `#${port.port_index}`}`,
    `Status: ${getPortStatusLabel(status)}`,
    `Fiber #${fiberCoreNum}: ${fiber.name}`,
  ];
  if (isConnected && connection) {
    tooltipLines.push(`Koneksi: ${getConnectionLabel(connection)}`);
  }
  if (port.notes) {
    tooltipLines.push(`Catatan: ${port.notes}`);
  }
  if (isIdle) {
    tooltipLines.push("Klik untuk assign");
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick?.(port)}
      title={tooltipLines.join(" · ")}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border bg-background p-1.5 text-center transition-all",
        // Fiber color stripe on the left via box-shadow or pseudo-element
        "hover:border-foreground/30 hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-default disabled:opacity-60",
        isIdle && "border-dashed border-muted-foreground/30",
        !isIdle && "border-solid",
        size === "sm" ? "min-h-[48px] min-w-[48px]" : "min-h-[56px] min-w-[56px]",
        className,
      )}
    >
      {/* TIA/EIA-598 Fiber color stripe — left side */}
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[5px]",
          fiber.tailwindClass,
        )}
      />

      {/* Status dot */}
      <span
        className={cn(
          "absolute right-1 top-1 size-2 rounded-full",
          getPortStatusClass(status),
          isConnected && "ring-1 ring-offset-[0.5px] ring-foreground/20",
        )}
      />

      {/* Fiber core number (small badge) */}
      <span className="absolute left-1.5 bottom-1 text-[7px] font-medium leading-none text-muted-foreground/50">
        #{fiberCoreNum}
      </span>

      {/* Port label */}
      <span className="text-[10px] font-semibold leading-tight text-foreground">
        {port.port_label || `#${port.port_index}`}
      </span>

      {/* Status label */}
      <span
        className={cn(
          "text-[8px] leading-tight uppercase tracking-wide",
          status === "used" && "text-emerald-600",
          status === "reserved" && "text-amber-600",
          status === "down" && "text-rose-600",
          isIdle && "text-muted-foreground/60",
        )}
      >
        {getPortStatusLabel(status)}
      </span>

      {/* Hover indicator for idle ports */}
      {isIdle && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-foreground/5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-[9px] font-medium text-foreground/70">Assign</span>
        </span>
      )}
    </button>
  );
}
