"use client";

import * as React from "react";
import { Cable } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

type Option = { value: string; label: string };

export type CutMode = "none" | "connection" | "cable";

export interface FiberCutImpactData {
  active: boolean;
  summary: {
    cut_connections: number;
    affected_devices: number;
    affected_connections: number;
    affected_routes: number;
    affected_customers: number;
    affected_onts: number;
  };
  warnings?: string[];
}

export interface MapFiberCutTabProps {
  cutMode: CutMode;
  onCutModeChange: (mode: CutMode) => void;
  cutTarget: string;
  onCutTargetChange: (target: string) => void;
  cutTargetOptions: Option[];
  impactData?: FiberCutImpactData | null;
}

export function MapFiberCutTab({
  cutMode,
  onCutModeChange,
  cutTarget,
  onCutTargetChange,
  cutTargetOptions,
  impactData,
}: MapFiberCutTabProps) {
  return (
    <div className="space-y-2 text-xs">
      <div className="space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
          Mode Simulasi Cut
        </span>
        <Combobox
          value={cutMode}
          onValueChange={(val) => onCutModeChange((val as CutMode) || "none")}
          options={[
            { value: "none", label: "Tanpa Simulasi Cut" },
            { value: "connection", label: "Simulasi Per Connection" },
            { value: "cable", label: "Simulasi Per Cable" },
          ]}
          placeholder="Pilih mode..."
        />
      </div>

      {cutMode !== "none" && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground block">
            Target {cutMode === "cable" ? "Cable" : "Connection"}
          </span>
          <Combobox
            value={cutTarget}
            onValueChange={onCutTargetChange}
            options={cutTargetOptions}
            placeholder={`Pilih ${cutMode}...`}
          />
        </div>
      )}

      {impactData?.active && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-2.5 dark:border-red-900/40 dark:bg-red-950/30 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Cable className="size-3.5 text-red-600 dark:text-red-400" />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-red-800 dark:text-red-300 font-semibold block">
              Impact Summary
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono tabular-nums text-xs">
            <div className="bg-background/80 rounded-lg p-1.5 border border-red-200/50">
              <span className="text-[9px] text-muted-foreground block">Devices</span>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {impactData.summary.affected_devices}
              </span>
            </div>
            <div className="bg-background/80 rounded-lg p-1.5 border border-red-200/50">
              <span className="text-[9px] text-muted-foreground block">Customers</span>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {impactData.summary.affected_customers}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
