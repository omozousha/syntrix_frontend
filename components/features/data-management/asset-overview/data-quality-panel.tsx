import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";

type DataQualityKpi = {
  key: string;
  label: string;
  value: number;
  note: string;
};

type DataQualityIssue = {
  key: string;
  label: string;
  value: number;
  severity: "high" | "medium" | "low";
  note: string;
  href: string;
};

export function DataQualityPanel({
  regionOptions,
  qualityRegionId,
  qualityLoading,
  qualityError,
  kpis,
  issues,
  onRegionChange,
  onRefresh,
}: {
  regionOptions: Array<{ value: string; label: string }>;
  qualityRegionId: string;
  qualityLoading: boolean;
  qualityError: string;
  kpis: DataQualityKpi[];
  issues: DataQualityIssue[];
  onRegionChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Data Quality KPI</h3>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <Combobox value={qualityRegionId} onValueChange={onRegionChange} options={regionOptions} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={qualityLoading}>
            <RefreshCcw className={`mr-1 size-4 ${qualityLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {qualityError ? (
        <AppLoading label={qualityError} variant="error" />
      ) : qualityLoading && kpis.length === 0 ? (
        <QualityLoading />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <Card key={kpi.key}>
                <CardHeader className="px-3 py-2">
                  <CardTitle className="text-sm font-semibold">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{kpi.note}</p>
                </CardContent>
              </Card>
            ))}
            {!kpis.length ? (
              <Card className="sm:col-span-2 xl:col-span-3">
                <CardContent className="p-0">
                  <OperationalState title="Belum ada KPI" description="Data quality belum tersedia untuk filter region ini." />
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card>
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-sm font-semibold">ODP Quality Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 pt-0">
              {issues.length ? (
                issues.map((issue) => (
                  <div key={issue.key} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "secondary" : "outline"}>
                          {issue.severity}
                        </Badge>
                        <p className="text-sm font-medium">{issue.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{issue.note}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="justify-between sm:min-w-32">
                      <Link href={issue.href}>
                        <span>{issue.value}</span>
                        <span>Open</span>
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <OperationalState title="Tidak ada issue ODP" description="Belum ada issue ODP untuk filter yang sedang dipilih." />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

function QualityLoading() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="px-3 py-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-3 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
