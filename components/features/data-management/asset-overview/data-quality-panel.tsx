"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, Network, RefreshCcw, ShieldCheck } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type DataQualityIssueGroup = {
  key: string;
  title: string;
  description: string;
  issues: DataQualityIssue[];
};

type DataQualityHealth = {
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  topologyIssues: number;
  coreIssues: number;
};

type DataQualityIntegrityIssue = {
  key: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  actionHint: string;
  entityType: string;
  entityId: string;
};

type SeverityFilter = "all" | "critical" | "warning" | "info";

export function DataQualityPanel({
  regionOptions,
  qualityRegionId,
  qualityLoading,
  qualityError,
  kpis,
  issues,
  issueGroups,
  health,
  integrityIssues,
  onRegionChange,
  onRefresh,
}: {
  regionOptions: Array<{ value: string; label: string }>;
  qualityRegionId: string;
  qualityLoading: boolean;
  qualityError: string;
  kpis: DataQualityKpi[];
  issues: DataQualityIssue[];
  issueGroups?: DataQualityIssueGroup[];
  health?: DataQualityHealth | null;
  integrityIssues?: DataQualityIntegrityIssue[];
  onRegionChange: (value: string) => void;
  onRefresh: () => void;
}) {
  const groups = useMemo(
    () => (issueGroups?.length
      ? issueGroups
      : [{ key: "odp", title: "ODP Operations", description: "Kesiapan ODP, port, assignment, dan validasi.", issues }]),
    [issueGroups, issues],
  );
  const visibleIssueTotal = health?.totalIssues ?? groups.flatMap((group) => group.issues).reduce((sum, issue) => sum + issue.value, 0);
  const criticalTotal = health?.criticalIssues ?? groups.flatMap((group) => group.issues).filter((issue) => issue.severity === "high").reduce((sum, issue) => sum + issue.value, 0);
  const warningTotal = health?.warningIssues ?? groups.flatMap((group) => group.issues).filter((issue) => issue.severity === "medium").reduce((sum, issue) => sum + issue.value, 0);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const filteredGroups = useMemo(
    () => groups.map((group) => ({
      ...group,
      issues: group.issues.filter((issue) => matchesSeverityFilter(mapIssueSeverity(issue.severity), severityFilter)),
    })),
    [groups, severityFilter],
  );
  const filteredIntegrityIssues = useMemo(
    () => (integrityIssues || []).filter((issue) => matchesSeverityFilter(issue.severity, severityFilter)),
    [integrityIssues, severityFilter],
  );
  const filteredIssueTotal = filteredGroups.flatMap((group) => group.issues).reduce((sum, issue) => sum + issue.value, 0)
    + filteredIntegrityIssues.length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between dark:bg-muted/5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 border-border/60 bg-background/50">
              <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
              Quality Center
            </Badge>
            <Badge variant={criticalTotal ? "destructive" : visibleIssueTotal ? "secondary" : "outline"} className="font-mono text-[10px]">
              {visibleIssueTotal ? `${visibleIssueTotal} issue aktif` : "Sehat"}
            </Badge>
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Data Quality & Topology Integrity</h3>
            <p className="text-xs text-muted-foreground">
              Pantau kelengkapan asset, ODP operations, port connection, fiber core, dan readiness topology.
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] lg:w-[38rem]">
          <Combobox value={qualityRegionId} onValueChange={onRegionChange} options={regionOptions} />
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
            <SelectTrigger size="sm" className="w-full h-9 rounded-xl border-border/60">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={qualityLoading} className="justify-center h-9 rounded-xl border-border/60">
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              label="Critical"
              value={criticalTotal}
              note="Butuh tindakan sebelum topology dianggap sehat."
              tone={criticalTotal ? "critical" : "good"}
            />
            <HealthCard
              label="Warning"
              value={warningTotal}
              note="Perlu dibersihkan agar trace dan As-Built konsisten."
              tone={warningTotal ? "warning" : "good"}
            />
            <HealthCard
              label="Topology"
              value={health?.topologyIssues ?? 0}
              note="Connection, route, dan legacy link readiness."
              tone={health?.topologyIssues ? "warning" : "good"}
            />
            <HealthCard
              label="Core"
              value={health?.coreIssues ?? 0}
              note="Occupancy, warna core, damaged core, attenuation."
              tone={health?.coreIssues ? "warning" : "good"}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <Card key={kpi.key} className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-2xl font-bold font-mono tabular-nums leading-tight">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{kpi.note}</p>
                </CardContent>
              </Card>
            ))}
            {!kpis.length ? (
              <Card className="rounded-2xl border-border/60 shadow-xs sm:col-span-2 xl:col-span-3">
                <CardContent className="p-0">
                  <OperationalState title="Belum ada KPI" description="Data quality belum tersedia untuk filter region ini." />
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredGroups.map((group) => (
              <IssueGroupCard key={group.key} group={group} />
            ))}
          </div>

          <IntegrityFindingsCard issues={filteredIntegrityIssues} severityFilter={severityFilter} filteredIssueTotal={filteredIssueTotal} />
        </div>
      )}
    </section>
  );
}

function HealthCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: "good" | "warning" | "critical";
}) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "critical" ? AlertTriangle : DatabaseZap;
  
  // High-agency calibrated subtle card tones (dark mode compliant)
  const toneClass = tone === "critical"
    ? "border-red-200 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
      : "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";

  return (
    <Card className={`rounded-2xl border-border/60 shadow-xs ${toneClass}`}>
      <CardContent className="flex items-start gap-3.5 p-4">
        <div className="rounded-xl border border-current/15 bg-background/80 p-2 shadow-2xs">
          <Icon className="size-4 shrink-0" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
          <p className="text-2xl font-bold leading-tight font-mono tabular-nums">{value}</p>
          <p className="text-[11px] leading-snug opacity-75">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueGroupCard({ group }: { group: DataQualityIssueGroup }) {
  const issueTotal = group.issues.reduce((sum, issue) => sum + issue.value, 0);

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs">
      <CardHeader className="space-y-1.5 px-4 py-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Network className="size-4 text-muted-foreground" />
              {group.title}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
          </div>
          <Badge variant={issueTotal ? "secondary" : "outline"} className="font-mono text-xs">
            {issueTotal}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-3">
        {group.issues.length ? (
          group.issues.map((issue) => (
            <div
              key={issue.key}
              className="grid gap-3 rounded-xl border border-border/60 bg-muted/5 p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:bg-muted/2"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "secondary" : "outline"} className="font-mono text-[9px] uppercase tracking-wider h-5 px-1.5">
                    {issue.severity}
                  </Badge>
                  <p className="text-sm font-medium tracking-tight text-foreground">{issue.label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">{issue.note}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full justify-between sm:w-32 rounded-xl border-border/60">
                <Link href={issue.href}>
                  <span className="font-mono font-semibold">{issue.value}</span>
                  <span className="text-xs">Open</span>
                </Link>
              </Button>
            </div>
          ))
        ) : (
          <OperationalState title="Tidak ada issue" description="Belum ada issue untuk kelompok quality ini." />
        )}
      </CardContent>
    </Card>
  );
}

function IntegrityFindingsCard({
  issues,
  severityFilter,
  filteredIssueTotal,
}: {
  issues: DataQualityIntegrityIssue[];
  severityFilter: SeverityFilter;
  filteredIssueTotal: number;
}) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-xs">
      <CardHeader className="space-y-1.5 px-4 py-4 border-b border-border/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Integrity Findings</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Detail issue dari backend topology integrity. Filter aktif menampilkan <span className="font-mono font-medium text-foreground">{filteredIssueTotal}</span> item/indikator.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-border/60 bg-background/50 text-[10px]">
              {severityFilter === "all" ? "Semua severity" : severityFilter}
            </Badge>
            <Badge variant={issues.length ? "secondary" : "outline"} className="font-mono text-[10px]">
              {issues.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-3">
        {issues.length ? (
          issues.map((issue) => (
            <div key={issue.key} className="rounded-xl border border-border/60 bg-muted/5 p-3.5 dark:bg-muted/2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={issue.severity === "critical" ? "destructive" : issue.severity === "warning" ? "secondary" : "outline"} className="font-mono text-[9px] uppercase tracking-wider h-5 px-1.5">
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline" className="font-mono border-border/60 text-[9px] h-5 px-1.5 bg-background">{issue.type}</Badge>
                  </div>
                  <p className="text-sm font-semibold tracking-tight leading-tight">{issue.title}</p>
                  <p className="text-xs text-muted-foreground leading-normal">{issue.message}</p>
                </div>
                <div className="grid min-w-0 gap-0.5 text-left text-[11px] sm:w-56 sm:text-right">
                  <span className="font-semibold text-foreground">{issue.entityType}</span>
                  <span className="truncate text-muted-foreground font-mono">{issue.entityId}</span>
                </div>
              </div>
              <div className="mt-2.5 rounded-lg bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground leading-normal border border-border/40">
                {issue.actionHint}
              </div>
            </div>
          ))
        ) : (
          <OperationalState title="Tidak ada integrity finding" description="Tidak ada issue detail yang cocok dengan filter severity ini." />
        )}
      </CardContent>
    </Card>
  );
}

function mapIssueSeverity(severity: DataQualityIssue["severity"]): SeverityFilter {
  if (severity === "high") return "critical";
  if (severity === "medium") return "warning";
  return "info";
}

function matchesSeverityFilter(severity: SeverityFilter, filter: SeverityFilter) {
  return filter === "all" || severity === filter;
}

function QualityLoading() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="rounded-2xl border-border/60 shadow-xs">
          <CardHeader className="px-4 py-3">
            <Skeleton className="h-3 w-32 rounded" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            <Skeleton className="h-7 w-14 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
