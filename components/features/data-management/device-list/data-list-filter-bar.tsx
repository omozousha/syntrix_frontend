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
}: {
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
}) {
  const cell = "flex flex-col gap-1 rounded-xl border border-border/60 bg-background/50 p-1.5";
  const label = "font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground";

  return (
    <div className={filterGridClass}>
      <div className={cell}>
        <span className={label}>Cari</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder={categoryResource === "cities" ? "Cari city..." : "Cari data..."}
            className="rounded-lg border-border/60 bg-background pl-8 pr-2.5 text-[11px] shadow-2xs"
          />
        </div>
      </div>

      {supportsPopFilter ? (
        <div className={cell}>
          <span className={label}>POP</span>
          <Combobox
            value={popFilterValue}
            onValueChange={onPopFilterChange}
            placeholder={popFilterLoading ? "Memuat..." : "Filter POP"}
            searchPlaceholder="Cari POP..."
            emptyText={hasRegionScope ? "Tidak ada POP." : "Tidak ada POP."}
            disabled={popFilterLoading}
            options={[
              { value: "__all", label: hasRegionScope ? "Semua POP" : "Semua POP" },
              ...popFilterOptions
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label, "id"))
                .map((option) => ({ value: option.id, label: option.label })),
            ]}
          />
        </div>
      ) : null}

      {supportsProjectFilter ? (
        <div className={cell}>
          <span className={label}>Project</span>
          <Combobox
            value={projectFilterValue}
            onValueChange={onProjectFilterChange}
            placeholder={projectFilterLoading ? "Memuat..." : "Filter Project"}
            searchPlaceholder="Cari project..."
            emptyText={hasRegionScope ? "Tidak ada project." : "Tidak ada project."}
            disabled={projectFilterLoading}
            options={[
              { value: "__all", label: hasRegionScope ? "Semua project" : "Semua project" },
              ...projectFilterOptions
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label, "id"))
                .map((option) => ({ value: option.id, label: option.label })),
            ]}
          />
        </div>
      ) : null}

      {supportsValidationFilter ? (
        <div className={cell}>
          <span className={label}>Validasi</span>
          <Combobox
            value={validationStatusFilter}
            onValueChange={onValidationStatusFilterChange}
            placeholder="Status"
            searchPlaceholder="Cari status..."
            options={[
              { value: "__all", label: "Semua" },
              { value: "valid", label: "Validated" },
              { value: "__unvalidated__", label: "Belum Valid" },
              { value: "pending_async", label: "Pending Super" },
              { value: "ongoing_validated", label: "Ongoing Admin" },
              { value: "rejected_by_adminregion", label: "Rejected Admin" },
              { value: "rejected_by_superadmin", label: "Rejected Super" },
              { value: "warning", label: "Warning" },
              { value: "invalid", label: "Invalid" },
            ]}
          />
        </div>
      ) : null}

      {categoryResource === "cities" ? (
        <div className={cell}>
          <span className={label}>Province</span>
          <Combobox
            value={provinceFilter}
            onValueChange={onProvinceFilterChange}
            placeholder="Filter province"
            searchPlaceholder="Cari..."
            options={[
              { value: "__all", label: "Semua" },
              ...provinceOptions.map((option) => ({ value: option.id, label: option.label })),
            ]}
          />
        </div>
      ) : null}

      {categoryResource === "topologyRelationRules" ? (
        <div className={cell}>
          <span className={label}>Direction</span>
          <Combobox
            value={directionFilter}
            onValueChange={onDirectionFilterChange}
            placeholder="Filter"
            options={[
              { value: "__all", label: "Semua" },
              { value: "front", label: "Front" },
              { value: "rear", label: "Rear" },
            ]}
          />
        </div>
      ) : null}

      {isSoftDeleteResource ? (
        <div className={cell}>
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
      ) : null}

      <div className={cell}>
        <span className={label}>Limit</span>
        <Combobox
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          placeholder="Rows"
          options={[
            { value: "10", label: "10 / hal" },
            { value: "20", label: "20 / hal" },
            { value: "50", label: "50 / hal" },
          ]}
        />
      </div>

      <div className={cell}>
        <span className={label}>Aksi</span>
        <Button
          type="button"
          variant="outline"
          onClick={onResetFilters}
          className="h-8 rounded-full border-border/60 px-3 font-mono text-[10px] uppercase tracking-[0.06em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
