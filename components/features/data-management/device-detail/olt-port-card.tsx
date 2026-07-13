"use client";

import { cn } from "@/lib/utils";
import { type DevicePort } from "./port-tray-types";

/**
 * Status visual helpers untuk active device (OLT/SWITCH).
 * Menggunakan up/down, bukan used/idle seperti passive device.
 */
export function getActivePortStatusClass(status?: string | null): string {
  const s = String(status || "").toLowerCase();
  if (s === "up" || s === "active" || s === "used") return "bg-emerald-500";
  if (s === "down" || s === "faulty" || s === "error") return "bg-rose-500";
  if (s === "disabled" || s === "shutdown") return "bg-slate-400";
  return "bg-slate-300";
}

export function getActivePortStatusLabel(status?: string | null): string {
  const s = String(status || "").toLowerCase();
  if (s === "up" || s === "active" || s === "used") return "up";
  if (s === "down" || s === "faulty" || s === "error") return "down";
  if (s === "disabled" || s === "shutdown") return "disabled";
  return "idle";
}

export function OltPortCard({
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

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick?.(port)}
      title={`${port.port_label || `#${port.port_index}`} · Status: ${statusLabel}${port.notes ? ` · ${port.notes}` : ""}`}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border bg-background p-1.5 text-center transition-all",
        "hover:border-foreground/30 hover:shadow-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-default disabled:opacity-60",
        isIdle && "border-dashed border-muted-foreground/30",
        !isIdle && "border-solid",
        size === "sm" ? "min-h-[48px] min-w-[48px]" : "min-h-[60px] min-w-[60px]",
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

      {/* Port label - center */}
      <span className="text-[10px] font-semibold leading-tight text-foreground">
        {port.port_label || `#${port.port_index}`}
      </span>

      {/* Status label - bottom */}
      <span
        className={cn(
          "text-[8px] leading-tight uppercase tracking-wide",
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
