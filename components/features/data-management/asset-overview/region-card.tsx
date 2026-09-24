import Link from "next/link";
import { ArrowUpRight, Cable, Database, MapPin, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildRegionCardDisplay } from "@/lib/display-adapters/asset-overview-display-adapter";

export type RegionItem = {
  id: string;
  region_name?: string | null;
  region_id?: string | null;
};

export type RegionCoreSummary = {
  pops: number;
  routeDistanceMeters: number;
  cableDevices: number;
  devices: number;
  popLatestUpdatedAt: string | null;
  deviceLatestUpdatedAt: string | null;
};

export function RegionCard({
  region,
  summary,
  loading,
  onOpen,
  formatDateTime,
  formatKilometers,
  latestDate,
}: {
  region: RegionItem;
  summary?: RegionCoreSummary;
  loading: boolean;
  onOpen: () => void;
  formatDateTime: (value?: string | null) => string;
  formatKilometers: (valueMeters: number) => string;
  latestDate: (...values: Array<string | null | undefined>) => string | null;
}) {
  const display = buildRegionCardDisplay(region);
  const regionLastUpdated = latestDate(summary?.popLatestUpdatedAt, summary?.deviceLatestUpdatedAt);

  return (
    <button type="button" className="group/btn block w-full rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={onOpen}>
      <Card className="flex min-h-52 flex-col rounded-2xl border border-border/60 bg-card shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:border-primary/45 group-hover/btn:bg-muted/15 group-hover/btn:shadow-xs active:scale-[0.98]">
        <CardHeader className="space-y-1.5 px-4 pb-2 pt-4">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <CardTitle className="min-w-0 truncate text-base font-semibold tracking-tight" title={display.name}>
              {display.name}
            </CardTitle>
            {display.code ? (
              <Badge variant="outline" className="max-w-36 shrink-0 truncate rounded-md font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/30 glass-inset" title={display.code}>
                {display.code}
              </Badge>
            ) : null}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Update terakhir: {loading ? "Memuat..." : formatDateTime(regionLastUpdated)}</p>
        </CardHeader>

        <CardContent className="grid flex-1 grid-cols-2 gap-2.5 px-4 py-2">
          <Metric icon={MapPin} label="POP" value={loading ? undefined : String(summary?.pops ?? 0)} />
          <Metric icon={Database} label="Device" value={loading ? undefined : String(summary?.devices ?? 0)} />
          <Metric icon={Network} label="Route" value={loading ? undefined : formatKilometers(summary?.routeDistanceMeters ?? 0)} />
          <Metric icon={Cable} label="Cable on Route" value={loading ? undefined : String(summary?.cableDevices ?? 0)} />
        </CardContent>

        <CardFooter className="px-4 pb-4 pt-2">
          <Link
            href={`/data-management/list/pop?region_id=${encodeURIComponent(region.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-full items-center justify-between rounded-full border border-border/60 bg-background px-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98]"
          >
            List POP
            <ArrowUpRight className="size-4 text-muted-foreground group-hover/btn:text-foreground group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </CardFooter>
      </Card>
    </button>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-muted/5 px-2.5 py-2 glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:border-border/80 group-hover/btn:bg-background">
      <Icon className="size-4 shrink-0 text-muted-foreground/80" />
      <div className="min-w-0">
        <p className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1.5 h-4 w-12 rounded" />
        ) : (
          <p className="truncate text-sm font-bold font-mono tabular-nums leading-tight mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}
