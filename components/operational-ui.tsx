import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OperationalKpiCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  icon?: LucideIcon;
  badge?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
};

const KPI_TONE_CLASS: Record<NonNullable<OperationalKpiCardProps["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-50 text-slate-700 border-slate-100",
};

export function OperationalKpiCard({
  label,
  value,
  caption,
  icon: Icon = Database,
  badge,
  tone = "blue",
}: OperationalKpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${KPI_TONE_CLASS[tone]}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            {badge ? (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="text-xl font-semibold leading-tight">{value}</p>
          {caption ? <p className="truncate text-[11px] text-muted-foreground">{caption}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

type OperationalStateProps = {
  title: string;
  description?: string;
  variant?: "empty" | "error" | "loading";
  actionLabel?: string;
  onAction?: () => void;
};

export function OperationalState({
  title,
  description,
  variant = "empty",
  actionLabel,
  onAction,
}: OperationalStateProps) {
  const Icon = variant === "error" ? AlertTriangle : variant === "loading" ? Loader2 : Database;

  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground">
        <Icon className={`size-5 ${variant === "loading" ? "animate-spin" : ""}`} />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

