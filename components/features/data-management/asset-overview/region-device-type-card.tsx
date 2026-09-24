import { ChevronRight, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RegionDeviceTypeCard({
  label,
  deviceTypeKey,
  count,
  onOpen,
}: {
  label: string;
  deviceTypeKey: string;
  count?: number;
  onOpen: () => void;
}) {
  const disabled = count === 0;

  return (
    <button
      type="button"
      className="group/btn block w-full rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onOpen}
      disabled={disabled}
    >
      <Card className="rounded-2xl border border-border/60 bg-card shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/45 hover:bg-muted/15 active:scale-[0.98]">
        <CardContent className="flex min-h-24 items-center gap-3 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 shadow-2xs dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400">
            <Database className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{label}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{deviceTypeKey}</p>
            {count === undefined ? <Skeleton className="mt-1.5 h-5 w-16" /> : <p className="mt-1 text-lg font-bold leading-none font-mono tabular-nums">{count.toLocaleString("id-ID")}</p>}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        </CardContent>
      </Card>
    </button>
  );
}
