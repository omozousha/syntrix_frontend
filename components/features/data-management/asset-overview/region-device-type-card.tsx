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
      className="block w-full rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onOpen}
      disabled={disabled}
    >
      <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
        <CardContent className="flex min-h-24 items-center gap-3 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-blue-50 text-blue-700">
            <Database className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{label}</p>
            <p className="truncate text-[11px] text-muted-foreground">{deviceTypeKey}</p>
            {count === undefined ? <Skeleton className="mt-1.5 h-5 w-16" /> : <p className="mt-1 text-lg font-semibold leading-none">{count.toLocaleString("id-ID")}</p>}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </button>
  );
}
