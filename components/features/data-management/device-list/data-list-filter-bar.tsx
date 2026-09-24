"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

type ArchiveView = "active" | "archived" | "all";

type FilterOption = {
  id: string;
  label: string;
};

type DataListFilterBarProps = {
  filterGridClass: string;
  categoryResource: string;
  searchInput: string;
  provinceFilter: string;
  provinceOptions: FilterOption[];
  directionFilter: string;
  validationStatusFilter: string;
  supportsValidationFilter: boolean;
  supportsPopFilter: boolean;
  popFilterValue: string;
  popFilterLoading: boolean;
  popFilterOptions: FilterOption[];
  supportsProjectFilter: boolean;
  projectFilterValue: string;
  projectFilterLoading: boolean;
  projectFilterOptions: FilterOption[];
  hasRegionScope: boolean;
  isSoftDeleteResource: boolean;
  archiveView: ArchiveView;
  limit: number;
  onSearchInputChange: (value: string) => void;
  onProvinceFilterChange: (value: string) => void;
  onDirectionFilterChange: (value: string) => void;
  onValidationStatusFilterChange: (value: string) => void;
  onPopFilterChange: (value: string) => void;
  onProjectFilterChange: (value: string) => void;
  onArchiveViewChange: (value: ArchiveView) => void;
  onLimitChange: (value: number) => void;
  onResetFilters: () => void;
};

export function DataListFilterBar({
  filterGridClass,
  categoryResource,
  searchInput,
  provinceFilter,
  provinceOptions,
  directionFilter,
  validationStatusFilter,
  supportsValidationFilter,
  supportsPopFilter,
  popFilterValue,
  popFilterLoading,
  popFilterOptions,
  supportsProjectFilter,
  projectFilterValue,
  projectFilterLoading,
  projectFilterOptions,
  hasRegionScope,
  isSoftDeleteResource,
  archiveView,
  limit,
  onSearchInputChange,
  onProvinceFilterChange,
  onDirectionFilterChange,
  onValidationStatusFilterChange,
  onPopFilterChange,
  onProjectFilterChange,
  onArchiveViewChange,
  onLimitChange,
  onResetFilters,
}: DataListFilterBarProps) {
  const cell = "flex flex-col gap-0.5 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5";
  const label = "font-mono text-[7px] uppercase tracking-[0.1em] text-muted-foreground leading-none";

  const filters = [
    supportsPopFilter && (
      <div key="pop" className={cell}>
        <span className={label}>POP</span>
        <Combobox
          value={popFilterValue}
          onValueChange={onPopFilterChange}
          placeholder={popFilterLoading ? "..." : "POP"}
          searchPlaceholder="Cari..."
          emptyText="Tidak ada."
          disabled={popFilterLoading}
          options={[
            { value: "__all", label: "Semua" },
            ...popFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label, "id")).map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    supportsProjectFilter && (
      <div key="project" className={cell}>
        <span className={label}>Project</span>
        <Combobox
          value={projectFilterValue}
          onValueChange={onProjectFilterChange}
          placeholder={projectFilterLoading ? "..." : "Project"}
          searchPlaceholder="Cari..."
          emptyText="Tidak ada."
          disabled={projectFilterLoading}
          options={[
            { value: "__all", label: "Semua" },
            ...projectFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label, "id")).map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    supportsValidationFilter && (
      <div key="validation" className={cell}>
        <span className={label}>Validasi</span>
        <Combobox
          value={validationStatusFilter}
          onValueChange={onValidationStatusFilterChange}
          placeholder="Status"
          options={[
            { value: "__all", label: "Semua" },
            { value: "valid", label: "Valid" },
            { value: "__unvalidated__", label: "Belum" },
            { value: "pending_async", label: "Pending" },
            { value: "ongoing_validated", label: "Ongoing" },
            { value: "rejected_by_adminregion", label: "Rj. Admin" },
            { value: "rejected_by_superadmin", label: "Rj. Super" },
            { value: "warning", label: "Warning" },
            { value: "invalid", label: "Invalid" },
          ]}
        />
      </div>
    ),
    categoryResource === "cities" && (
      <div key="province" className={cell}>
        <span className={label}>Province</span>
        <Combobox
          value={provinceFilter}
          onValueChange={onProvinceFilterChange}
          placeholder="Provinsi"
          options={[
            { value: "__all", label: "Semua" },
            ...provinceOptions.map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    categoryResource === "topologyRelationRules" && (
      <div key="direction" className={cell}>
        <span className={label}>Direction</span>
        <Combobox
          value={directionFilter}
          onValueChange={onDirectionFilterChange}
          placeholder="Arah"
          options={[
            { value: "__all", label: "Semua" },
            { value: "front", label: "Front" },
            { value: "rear", label: "Rear" },
          ]}
        />
      </div>
    ),
    isSoftDeleteResource && (
      <div key="archive" className={cell}>
        <span className={label}>Arsip</span>
        <Combobox
          value={archiveView}
          onValueChange={(value) => {
            if (!value || (value !== "active" && value !== "archived" && value !== "all")) return;
            onArchiveViewChange(value);
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
    ),
    (
      <div key="limit" className={cell}>
        <span className={label}>Limit</span>
        <Combobox
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          placeholder="Rows"
          options={[
            { value: "10", label: "10" },
            { value: "20", label: "20" },
            { value: "50", label: "50" },
          ]}
        />
      </div>
    ),
    (
      <div key="reset" className={cell}>
        <span className={label}>Aksi</span>
        <Button
          type="button"
          variant="outline"
          onClick={onResetFilters}
          className="h-7 w-full rounded-full border-border/60 px-2 font-mono text-[9px] uppercase tracking-[0.06em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          Reset
        </Button>
      </div>
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder={categoryResource === "cities" ? "Cari..." : "Cari data..."}
            className="h-8 rounded-lg border-border/60 bg-background pl-8 pr-2.5 text-[11px] shadow-2xs"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8 shrink-0 rounded-lg px-2.5 font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          Reset
        </Button>
      </div>
      <div className={filterGridClass}>
        {filters}
      </div>
    </div>
  );
}
