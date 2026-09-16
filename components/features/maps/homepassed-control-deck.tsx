"use client";

import * as React from "react";
import { Sliders, Download, Layers, ShieldCheck, PieChart, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { HomepassedCalculationConfig, HomepassedCalculationResult } from "@/lib/gis/homepassed-calculator";

type HomepassedControlDeckProps = {
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  config: HomepassedCalculationConfig;
  onConfigChange: (config: HomepassedCalculationConfig) => void;
  result: HomepassedCalculationResult | null;
  className?: string;
};

export function HomepassedControlDeck({
  enabled,
  onToggleEnabled,
  config,
  onConfigChange,
  result,
  className,
}: HomepassedControlDeckProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleExportGeoJson = () => {
    if (!result?.mergedPolygonFeature) return;
    const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.mergedPolygonFeature, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `syntrix-homepassed-coverage-${dateStr}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={cn("z-10 w-full transition-all duration-300", className)}>
      {/* Outer Double-Bezel Wrapper */}
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs backdrop-blur-md dark:bg-white/[0.02] glass-inset">
        {/* Inner Card Container */}
        <div className="rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-background/80 p-3 shadow-xs backdrop-blur-xl glass-inset">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                enabled ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]" : "border-border/60 bg-muted/30 text-muted-foreground"
              )}>
                <PieChart className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block truncate">
                    GIS Coverage & Homepassed
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[8px] font-bold text-emerald-500 uppercase tracking-wider">
                    Anti-Double Count
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground truncate">
                  Kalkulator Cakupan Area SPASIAL
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {enabled && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Sliders className="size-3 text-primary" />
                  <span>{isExpanded ? "Ringkas" : "Atur Radius"}</span>
                </button>
              )}

              {/* Toggle Switch */}
              <Switch
                checked={enabled}
                onCheckedChange={onToggleEnabled}
                aria-label="Toggle Layer Homepassed"
              />
            </div>
          </div>

          {/* Active Statistics Overview Pill Bar */}
          {enabled && result && (
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-2 text-left">
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Luas Coverage (Union)
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-foreground mt-0.5 block">
                  {result.totalCoverageAreaKm2} <span className="text-[10px] font-normal text-muted-foreground">km²</span>
                </span>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-left">
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-cyan-500 block">
                  Est. Homepassed
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-foreground mt-0.5 block">
                  {result.estimatedHomepassedCount.toLocaleString("id-ID")} <span className="text-[10px] font-normal text-muted-foreground">Unit</span>
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-left">
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-500 block">
                  Deduplikasi Irisan
                </span>
                <span className="font-mono tabular-nums text-sm font-bold text-emerald-500 mt-0.5 block">
                  +{result.overlapSavingsPercentage}% <span className="text-[9px] font-normal text-muted-foreground">Bebas Ganda</span>
                </span>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/20 p-2 text-left flex items-center justify-between">
                <div>
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Sumber Terhubung
                  </span>
                  <span className="font-mono tabular-nums text-xs font-semibold text-foreground mt-0.5 block">
                    {result.activeDeviceCount} ODP • {result.activeRouteCount} Kabel
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportGeoJson}
                  disabled={!result.mergedPolygonFeature}
                  className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-card text-foreground hover:bg-muted active:scale-95 disabled:opacity-40 transition-all"
                  title="Export GeoJSON Polygon"
                >
                  <Download className="size-3.5 text-primary" />
                </button>
              </div>
            </div>
          )}

          {/* Expanded Configuration Controls */}
          {enabled && isExpanded && (
            <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* ODP Radius Slider */}
                <div className="space-y-1.5 rounded-xl border border-border/50 bg-card/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={config.includeOdp}
                        onChange={(e) => onConfigChange({ ...config, includeOdp: e.target.checked })}
                        className="rounded border-border/60 text-primary focus:ring-primary/20"
                      />
                      <span>Radius ODP / Device</span>
                    </label>
                    <span className="font-mono tabular-nums text-xs font-bold text-primary">
                      {config.odpRadiusMeters}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={25}
                    disabled={!config.includeOdp}
                    value={config.odpRadiusMeters}
                    onChange={(e) => onConfigChange({ ...config, odpRadiusMeters: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Cable Corridor Radius Slider */}
                <div className="space-y-1.5 rounded-xl border border-border/50 bg-card/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={config.includeCables}
                        onChange={(e) => onConfigChange({ ...config, includeCables: e.target.checked })}
                        className="rounded border-border/60 text-primary focus:ring-primary/20"
                      />
                      <span>Koridor Kabel (Backbone/Feeder)</span>
                    </label>
                    <span className="font-mono tabular-nums text-xs font-bold text-primary">
                      {config.cableRadiusMeters}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={25}
                    disabled={!config.includeCables}
                    value={config.cableRadiusMeters}
                    onChange={(e) => onConfigChange({ ...config, cableRadiusMeters: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Density Config & Preset Options */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Faktor Densitas Bangunan:
                  </span>
                  <span className="font-mono tabular-nums text-xs font-bold text-foreground">
                    {(config.densityPerSqMeter * 10000).toFixed(0)} unit / hektar
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onConfigChange({ ...config, densityPerSqMeter: 0.002 })}
                    className={cn(
                      "rounded-lg px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider border transition-colors",
                      config.densityPerSqMeter === 0.002 ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground"
                    )}
                  >
                    Suburban (20/ha)
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfigChange({ ...config, densityPerSqMeter: 0.003 })}
                    className={cn(
                      "rounded-lg px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider border transition-colors",
                      config.densityPerSqMeter === 0.003 ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground"
                    )}
                  >
                    Standard (30/ha)
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfigChange({ ...config, densityPerSqMeter: 0.005 })}
                    className={cn(
                      "rounded-lg px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider border transition-colors",
                      config.densityPerSqMeter === 0.005 ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground"
                    )}
                  >
                    Urban (50/ha)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
