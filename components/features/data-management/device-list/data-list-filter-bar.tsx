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
  return (
    <div className={`grid grid-cols-1 gap-3 ${filterGridClass}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder={categoryResource === "cities" ? "Cari city..." : "Cari data..."}
          className="pl-8"
        />
      </div>
      {categoryResource === "cities" ? (
        <Combobox
          value={provinceFilter}
          onValueChange={onProvinceFilterChange}
          placeholder="Filter province"
          searchPlaceholder="Cari province..."
          options={[
            { value: "__all", label: "Semua province" },
            ...provinceOptions.map((option) => ({ value: option.id, label: option.label })),
          ]}
        />
      ) : null}
      {categoryResource === "topologyRelationRules" ? (
        <Combobox
          value={directionFilter}
          onValueChange={onDirectionFilterChange}
          placeholder="Filter Direction"
          options={[
            { value: "__all", label: "Semua direction" },
            { value: "front", label: "front" },
            { value: "rear", label: "rear" },
          ]}
        />
      ) : null}
      {supportsValidationFilter ? (
        <Combobox
          value={validationStatusFilter}
          onValueChange={onValidationStatusFilterChange}
          placeholder="Filter Status Validasi"
          options={[
            { value: "__all", label: "Semua status validasi" },
            { value: "valid", label: "Validated" },
            { value: "__unvalidated__", label: "Belum Valid" },
            { value: "pending_async", label: "Pending Superadmin" },
            { value: "ongoing_validated", label: "Ongoing Admin Region" },
            { value: "rejected_by_adminregion", label: "Rejected Admin Region" },
            { value: "rejected_by_superadmin", label: "Rejected Superadmin" },
            { value: "warning", label: "Warning" },
            { value: "invalid", label: "Invalid" },
          ]}
        />
      ) : null}
      {supportsPopFilter ? (
        <Combobox
          value={popFilterValue}
          onValueChange={onPopFilterChange}
          placeholder={popFilterLoading ? "Memuat POP..." : "Filter POP"}
          searchPlaceholder="Cari POP..."
          emptyText={hasRegionScope ? "Tidak ada POP pada region ini." : "Tidak ada POP."}
          disabled={popFilterLoading}
          options={[
            { value: "__all", label: hasRegionScope ? "Semua POP di region ini" : "Semua POP" },
            ...popFilterOptions
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label, "id"))
              .map((option) => ({ value: option.id, label: option.label })),
          ]}
        />
      ) : null}
      {supportsProjectFilter ? (
        <Combobox
          value={projectFilterValue}
          onValueChange={onProjectFilterChange}
          placeholder={projectFilterLoading ? "Memuat project..." : "Filter Project"}
          searchPlaceholder="Cari project..."
          emptyText={hasRegionScope ? "Tidak ada project pada region ini." : "Tidak ada project."}
          disabled={projectFilterLoading}
          options={[
            { value: "__all", label: hasRegionScope ? "Semua project di region ini" : "Semua project" },
            ...projectFilterOptions
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label, "id"))
              .map((option) => ({ value: option.id, label: option.label })),
          ]}
        />
      ) : null}
      {isSoftDeleteResource ? (
        <Combobox
          value={archiveView}
          onValueChange={(value) => {
            if (!value || (value !== "active" && value !== "archived" && value !== "all")) return;
            onArchiveViewChange(value);
          }}
          options={[
            { value: "active", label: "Active Only" },
            { value: "archived", label: "Archived Only" },
            { value: "all", label: "Active + Archived" },
          ]}
        />
      ) : null}
      <Combobox
        value={String(limit)}
        onValueChange={(value) => onLimitChange(Number(value))}
        placeholder="Rows per page"
        searchPlaceholder="Cari jumlah..."
        options={[
          { value: "10", label: "10 / halaman" },
          { value: "20", label: "20 / halaman" },
          { value: "50", label: "50 / halaman" },
        ]}
      />
      <Button type="button" variant="outline" onClick={onResetFilters}>
        Reset
      </Button>
    </div>
  );
}
