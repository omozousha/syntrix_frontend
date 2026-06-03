"use client";

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
  supportsPopFilter,
  popFilterValue,
  popFilterLoading,
  popFilterOptions,
  hasRegionScope,
  isSoftDeleteResource,
  archiveView,
  limit,
  onSearchInputChange,
  onProvinceFilterChange,
  onPopFilterChange,
  onArchiveViewChange,
  onLimitChange,
  onApplyFilter,
  onResetFilters,
}: {
  filterGridClass: string;
  categoryResource: string;
  searchInput: string;
  provinceFilter: string;
  provinceOptions: FilterOption[];
  supportsPopFilter: boolean;
  popFilterValue: string;
  popFilterLoading: boolean;
  popFilterOptions: FilterOption[];
  hasRegionScope: boolean;
  isSoftDeleteResource: boolean;
  archiveView: ArchiveView;
  limit: number;
  onSearchInputChange: (value: string) => void;
  onProvinceFilterChange: (value: string) => void;
  onPopFilterChange: (value: string) => void;
  onArchiveViewChange: (value: ArchiveView) => void;
  onLimitChange: (value: number) => void;
  onApplyFilter: () => void;
  onResetFilters: () => void;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${filterGridClass}`}>
      <Input
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        placeholder={categoryResource === "cities" ? "Cari city..." : "Cari data..."}
      />
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
      <Button onClick={onApplyFilter}>Terapkan Filter</Button>
      <Button type="button" variant="outline" onClick={onResetFilters}>
        Reset
      </Button>
    </div>
  );
}
