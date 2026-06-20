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
    <section className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="size-3" />
              Quality Center
            </Badge>
            <Badge variant={criticalTotal ? "destructive" : visibleIssueTotal ? "secondary" : "outline"}>
              {visibleIssueTotal ? `${visibleIssueTotal} issue aktif` : "Sehat"}
            </Badge>
          </div>
          <div>
            <h3 className="text-base font-semibold">Data Quality & Topology Integrity</h3>
            <p className="text-sm text-muted-foreground">
              Pantau kelengkapan asset, ODP operations, port connection, fiber core, dan readiness topology.
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] lg:w-[38rem]">
          <Combobox value={qualityRegionId} onValueChange={onRegionChange} options={regionOptions} />
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={qualityLoading} className="justify-center">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
  const toneClass = tone === "critical"
    ? "border-red-200 bg-red-50 text-red-950"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";

  return (
    <Card className={toneClass}>
      <CardContent className="flex items-start gap-3 p-3">
        <div className="rounded-md border border-current/15 bg-white/60 p-2">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs opacity-75">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueGroupCard({ group }: { group: DataQualityIssueGroup }) {
  const issueTotal = group.issues.reduce((sum, issue) => sum + issue.value, 0);

  return (
    <Card>
      <CardHeader className="space-y-1 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Network className="size-4 text-muted-foreground" />
              {group.title}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
          </div>
          <Badge variant={issueTotal ? "secondary" : "outline"}>{issueTotal}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {group.issues.length ? (
          group.issues.map((issue) => (
            <div
              key={issue.key}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "secondary" : "outline"}>
                    {issue.severity}
                  </Badge>
                  <p className="text-sm font-medium">{issue.label}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{issue.note}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full justify-between sm:w-32">
                <Link href={issue.href}>
                  <span>{issue.value}</span>
                  <span>Open</span>
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
    <Card>
      <CardHeader className="space-y-1 px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Integrity Findings</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Detail issue dari backend topology integrity. Filter aktif menampilkan {filteredIssueTotal} item/indikator.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{severityFilter === "all" ? "Semua severity" : severityFilter}</Badge>
            <Badge variant={issues.length ? "secondary" : "outline"}>{issues.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {issues.length ? (
          issues.map((issue) => (
            <div key={issue.key} className="rounded-md border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={issue.severity === "critical" ? "destructive" : issue.severity === "warning" ? "secondary" : "outline"}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline">{issue.type}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{issue.title}</p>
                  <p className="text-xs text-muted-foreground">{issue.message}</p>
                </div>
                <div className="grid min-w-0 gap-1 text-left text-xs sm:w-56 sm:text-right">
                  <span className="font-medium">{issue.entityType}</span>
                  <span className="truncate text-muted-foreground">{issue.entityId}</span>
                </div>
              </div>
              <div className="mt-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
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
