"use client";

import { cn } from "@/lib/utils";
import { getPortStatusClass } from "./port-tray-types";
import { useTranslate } from "@/lib/use-locale";

export function PortTrayBadge({
  totalPorts,
  usedCount,
  idleCount,
  reservedCount,
  downCount,
  className,
}: {
  totalPorts: number;
  usedCount: number;
  idleCount: number;
  reservedCount: number;
  downCount?: number;
  className?: string;
}) {
  const { t } = useTranslate();
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground", className)}>
      <LegendDot className="bg-emerald-500" count={usedCount} label={t("portTray.used")} />
      <LegendDot className="bg-slate-300" count={idleCount} label={t("portTray.idle")} />
      {reservedCount > 0 && <LegendDot className="bg-amber-400" count={reservedCount} label={t("portTray.reserved")} />}
      {(downCount ?? 0) > 0 && <LegendDot className="bg-rose-500" count={downCount ?? 0} label={t("portTray.down")} />}
      <span className="ml-1 font-medium text-foreground">
        {t("portTray.totalCount", { count: totalPorts })}
      </span>
    </div>
  );
}

function LegendDot({
  className,
  count,
  label,
}: {
  className: string;
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-2 rounded-full", className)} />
      {count} {label}
    </span>
  );
}
