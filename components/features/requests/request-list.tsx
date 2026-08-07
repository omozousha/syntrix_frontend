"use client";

import type { ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RequestList({
  filteredCount,
  totalCount,
  searchTerm,
  typeFilter,
  statusFilter,
  summarySlot,
  checkedAll,
  onCheckedAllChange,
  bulkActionsSlot,
  children,
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
}: {
  filteredCount: number;
  totalCount: number;
  searchTerm: string;
  typeFilter: string;
  statusFilter: string;
  summarySlot: ReactNode;
  checkedAll?: boolean;
  onCheckedAllChange?: (checked: boolean) => void;
  bulkActionsSlot?: ReactNode;
  children: ReactNode;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-border/60 shadow-xs glass-inset 2xl:sticky 2xl:top-3 2xl:self-start">
      <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight">Daftar Request</CardTitle>
            <CardDescription className="text-xs">
              <span className="font-mono font-medium tabular-nums text-foreground">{filteredCount}</span> dari <span className="font-mono font-medium tabular-nums text-foreground">{totalCount}</span> request ditampilkan.
            </CardDescription>
          </div>
          <Filter className="mt-0.5 size-3.5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-2 px-2.5 py-2.5">
        {summarySlot}
        {bulkActionsSlot}
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search request, device, atau region..."
            className="h-8 min-h-8 pl-8 text-xs"
          />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 2xl:grid-cols-1">
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger size="sm" className="h-8 min-h-8 w-full text-xs">
              <SelectValue placeholder="Filter jenis request" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis Request</SelectItem>
              <SelectItem value="create_asset">Create</SelectItem>
              <SelectItem value="update_asset">Update</SelectItem>
              <SelectItem value="provision_asset">Provision Port</SelectItem>
              <SelectItem value="topology_connection">Topology Connection</SelectItem>
              <SelectItem value="archive_asset">Archive</SelectItem>
              <SelectItem value="field_validation">Field Validation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger size="sm" className="h-8 min-h-8 w-full text-xs">
              <SelectValue placeholder="Filter status workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ongoing_validated">Ongoing Validated</SelectItem>
              <SelectItem value="pending_async">Pending Async</SelectItem>
              <SelectItem value="rejected_by_adminregion">Rejected by Admin Region</SelectItem>
              <SelectItem value="rejected_by_superadmin">Rejected by Superadmin</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="unvalidated">Unvalidated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-0 overflow-hidden rounded-lg border border-border/60 bg-background shadow-2xs">
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {onCheckedAllChange && (
              <input
                type="checkbox"
                checked={checkedAll}
                onChange={(e) => onCheckedAllChange(e.target.checked)}
                className="size-4 shrink-0 cursor-pointer rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                aria-label="Pilih semua request"
              />
            )}
            <span>Request</span>
            <span className="ml-auto">Type</span>
          </div>
          <div className="max-h-[44vh] min-h-0 overflow-y-auto [scrollbar-gutter:stable] sm:max-h-[48vh] 2xl:max-h-[calc(100vh-320px)]">
          {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
