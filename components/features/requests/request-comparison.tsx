import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type RequestComparisonRow = {
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

export function RequestComparison({ rows }: { rows: RequestComparisonRow[] }) {
  return (
    <div className="rounded-md border p-2.5">
      <RequestComparisonHeader />
      {rows.length ? (
        <div className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 gap-1 rounded-md border px-2 py-1.5 text-xs md:grid-cols-[140px_1fr_1fr] ${
                row.changed ? "border-amber-200 bg-amber-50/50" : "bg-background"
              }`}
            >
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">Existing: {row.before}</span>
              <span>Validator: {row.after}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Tidak ada data pembanding pada snapshot request ini.</p>
      )}
    </div>
  );
}

export function RequestComparisonSkeleton() {
  return (
    <div className="rounded-md border p-2.5">
      <RequestComparisonHeader />
      <div className="mt-2 space-y-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid grid-cols-1 gap-1 rounded-md border px-2 py-1.5 md:grid-cols-[140px_1fr_1fr]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestComparisonHeader() {
  return (
    <div className="space-y-0.5">
      <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-normal">
        Compare
      </Badge>
      <div>
        <p className="text-sm font-medium">Pembanding Data</p>
        <p className="text-xs text-muted-foreground">
          Bandingkan data existing dengan hasil validasi validator sebelum mengambil keputusan.
        </p>
      </div>
    </div>
  );
}
