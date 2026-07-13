"use client";

import { cn } from "@/lib/utils";
import { type DevicePort } from "./port-tray-types";
import {
  getActivePortStatusClass,
  getActivePortStatusLabel,
} from "./olt-port-card";

export { getActivePortStatusClass, getActivePortStatusLabel };

/** Icon helper untuk port type SWITCH. */
function getPortTypeIcon(portType?: string | null): string {
  const t = String(portType || "").toLowerCase();
  if (t.includes("sfp") || t.includes("qsfp") || t.includes("xfp")) return "🔗";
  if (t.includes("rj") || t.includes("eth") || t.includes("lan")) return "🔌";
  if (t.includes("console") || t.includes("mgmt") || t.includes("usb")) return "⚙";
  return "🔌";
}

function getPortTypeLabel(portType?: string | null): string {
  const t = String(portType || "").toLowerCase();
  if (t.includes("qsfp28")) return "QSFP28";
  if (t.includes("qsfp")) return "QSFP+";
  if (t.includes("sfp28")) return "SFP28";
  if (t.includes("sfp")) return "SFP+";
  if (t.includes("rj45") || t.includes("10g")) return "RJ45";
  if (t.includes("eth") || t.includes("lan")) return "RJ45";
  if (t.includes("console")) return "Console";
  if (t.includes("mgmt")) return "Mgmt";
  return "RJ45";
}

export function SwitchPortCard({
  port,
  onClick,
  size = "md",
  disabled = false,
  className,
}: {
  port: DevicePort;
  onClick?: (port: DevicePort) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const status = port.status || "idle";
  const isIdle = status === "idle";
  const statusClass = getActivePortStatusClass(status);
  const statusLabel = getActivePortStatusLabel(status);
  const portTypeIcon = getPortTypeIcon(port.port_type);
  const portTypeLabel = getPortTypeLabel(port.port_type);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick?.(port)}
      title={`${port.port_label || `#${port.port_index}`} · ${portTypeLabel} · Status: ${statusLabel}${port.notes ? ` · ${port.notes}` : ""}`}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border bg-background p-1.5 text-center transition-all",
        "hover:border-foreground/30 hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-default disabled:opacity-60",
        isIdle && "border-dashed border-muted-foreground/30",
        !isIdle && "border-solid",
        size === "sm" ? "min-h-[52px] min-w-[48px]" : "min-h-[64px] min-w-[64px]",
        className,
      )}
    >
      {/* Status dot - top right */}
      <span
        className={cn(
          "absolute right-1 top-1 size-2 rounded-full",
          statusClass,
        )}
      />

      {/* Port type icon */}
      <span className="text-[10px] leading-none">{portTypeIcon}</span>

      {/* Port type label */}
      <span className={cn(
        "text-[7px] font-semibold uppercase leading-tight tracking-wide",
        portTypeLabel === "SFP+" && "text-amber-600",
        portTypeLabel === "RJ45" && "text-sky-600",
      )}>
        {portTypeLabel}
      </span>

      {/* Port label */}
      <span className="text-[10px] font-semibold leading-tight text-foreground">
        {port.port_label || `#${port.port_index}`}
      </span>

      {/* Status label */}
      <span
        className={cn(
          "text-[7px] leading-tight uppercase tracking-wide",
          statusLabel === "up" && "text-emerald-600",
          statusLabel === "down" && "text-rose-600",
          statusLabel === "disabled" && "text-slate-500",
          isIdle && "text-muted-foreground/60",
        )}
      >
        {statusLabel}
      </span>

      {/* Hover indicator for idle ports */}
      {isIdle && !disabled && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-foreground/5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="text-[9px] font-medium text-foreground/70">Assign</span>
        </span>
      )}
    </button>
  );
}
