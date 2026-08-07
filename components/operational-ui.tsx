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
  /**
   * Tampilan ringkas untuk grid padat (mis. strip 3-kolom di mobile).
   * Saat `true`: icon di-stack di atas, label/caption tidak dipotong.
   */
  compact?: boolean;
};

const KPI_TONE_CLASS: Record<NonNullable<OperationalKpiCardProps["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
  amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  rose: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
  slate: "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30",
};

export function OperationalKpiCard({
  label,
  value,
  caption,
  icon: Icon = Database,
  badge,
  tone = "blue",
  compact = false,
}: OperationalKpiCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:border-muted-foreground/30 hover:shadow-sm">
      <CardContent className={compact ? "flex flex-col items-stretch gap-1.5 p-2.5" : "flex items-center gap-3 p-3"}>
        <div className={`flex shrink-0 items-center justify-center rounded-md border ${KPI_TONE_CLASS[tone]} ${compact ? "size-7 self-start" : "size-9"}`}>
          <Icon className={compact ? "size-3.5" : "size-4"} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={`font-semibold uppercase tracking-wide text-muted-foreground ${compact ? "text-[10px] leading-tight" : "truncate text-[11px]"}`}>{label}</p>
            {badge ? (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className={`font-semibold leading-tight font-mono tabular-nums ${compact ? "text-lg" : "text-xl"}`}>{value}</p>
          {caption ? (
            <p className={`text-muted-foreground ${compact ? "text-[10px] leading-snug line-clamp-2" : "truncate text-[11px]"}`}>{caption}</p>
          ) : null}
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

