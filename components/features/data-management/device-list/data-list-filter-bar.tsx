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
  const filterGroupClass = "flex flex-col gap-1.5";
  const filterLabelClass = "font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground";

  return (
    <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
      <div className="rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-4">
        <div className={filterGridClass}>
          <div className={filterGroupClass}>
            <span className={filterLabelClass}>Cari</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                placeholder={categoryResource === "cities" ? "Cari city..." : "Cari data..."}
                className="rounded-full border-border/60 bg-background pl-9 pr-4 text-xs shadow-2xs glass-inset"
              />
            </div>
          </div>

          {supportsPopFilter ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>POP</span>
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
            </div>
          ) : null}

          {supportsProjectFilter ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>Project</span>
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
            </div>
          ) : null}

          {supportsValidationFilter ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>Validasi</span>
              <Combobox
                value={validationStatusFilter}
                onValueChange={onValidationStatusFilterChange}
                placeholder="Filter Status Validasi"
                searchPlaceholder="Cari status..."
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
            </div>
          ) : null}

          {categoryResource === "cities" ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>Province</span>
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
            </div>
          ) : null}

          {categoryResource === "topologyRelationRules" ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>Direction</span>
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
            </div>
          ) : null}

          {isSoftDeleteResource ? (
            <div className={filterGroupClass}>
              <span className={filterLabelClass}>Arsip</span>
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
            </div>
          ) : null}

          <div className={filterGroupClass}>
            <span className={filterLabelClass}>Limit</span>
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
          </div>

          <div className={filterGroupClass}>
            <span className={filterLabelClass}>Aksi</span>
            <Button
              type="button"
              variant="outline"
              onClick={onResetFilters}
              className="rounded-full border-border/60 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
