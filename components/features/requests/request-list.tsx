"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
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
  children: ReactNode;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-base">Daftar Request</CardTitle>
        <CardDescription>{filteredCount} dari {totalCount} request ditampilkan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {summarySlot}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search request, device, atau region..."
            className="pl-8"
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Filter jenis request" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis Request</SelectItem>
              <SelectItem value="create_asset">Create</SelectItem>
              <SelectItem value="update_asset">Update</SelectItem>
              <SelectItem value="archive_asset">Archive</SelectItem>
              <SelectItem value="field_validation">Field Validation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger size="sm" className="w-full">
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
        {children}
      </CardContent>
    </Card>
  );
}
