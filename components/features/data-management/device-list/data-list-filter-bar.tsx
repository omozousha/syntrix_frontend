"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@/lib/use-locale";

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
  const { t } = useTranslate();
  const cell = "flex flex-col gap-0.5 rounded-lg border border-border/60 bg-background/80 dark:bg-background/50 px-2 py-1.5";
  const label = "font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground leading-none";

  const filters = [
    supportsPopFilter && (
      <div key="pop" className={cell}>
        <span className={label}>{t("deviceList.filter.pop")}</span>
        <Combobox
          value={popFilterValue}
          onValueChange={onPopFilterChange}
          placeholder={popFilterLoading ? "..." : t("deviceList.filter.pop")}
          searchPlaceholder={t("deviceList.filter.search")}
          emptyText={t("deviceList.filter.noOption")}
          disabled={popFilterLoading}
          options={[
            { value: "__all", label: t("deviceList.filter.all") },
            ...popFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label, "id")).map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    supportsProjectFilter && (
      <div key="project" className={cell}>
        <span className={label}>{t("deviceList.filter.project")}</span>
        <Combobox
          value={projectFilterValue}
          onValueChange={onProjectFilterChange}
          placeholder={projectFilterLoading ? "..." : t("deviceList.filter.project")}
          searchPlaceholder={t("deviceList.filter.search")}
          emptyText={t("deviceList.filter.noOption")}
          disabled={projectFilterLoading}
          options={[
            { value: "__all", label: t("deviceList.filter.all") },
            ...projectFilterOptions.slice().sort((a, b) => a.label.localeCompare(b.label, "id")).map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    supportsValidationFilter && (
      <div key="validation" className={cell}>
        <span className={label}>{t("deviceList.filter.validation")}</span>
        <Combobox
          value={validationStatusFilter}
          onValueChange={onValidationStatusFilterChange}
          placeholder={t("deviceList.filter.status")}
          emptyText={t("deviceList.filter.noOption")}
          options={[
            { value: "__all", label: t("deviceList.filter.all") },
            { value: "valid", label: t("deviceList.filter.valid") },
            { value: "__unvalidated__", label: t("deviceList.filter.unvalidated") },
            { value: "pending_async", label: t("deviceList.filter.pending") },
            { value: "ongoing_validated", label: t("deviceList.filter.ongoing") },
            { value: "rejected_by_adminregion", label: t("deviceList.filter.rejectedByAdmin") },
            { value: "rejected_by_superadmin", label: t("deviceList.filter.rejectedBySuper") },
            { value: "warning", label: t("deviceList.filter.warning") },
            { value: "invalid", label: t("deviceList.filter.invalid") },
          ]}
        />
      </div>
    ),
    categoryResource === "cities" && (
      <div key="province" className={cell}>
        <span className={label}>{t("deviceList.filter.province")}</span>
        <Combobox
          value={provinceFilter}
          onValueChange={onProvinceFilterChange}
          placeholder={t("deviceList.filter.provincePlaceholder")}
          emptyText={t("deviceList.filter.noOption")}
          options={[
            { value: "__all", label: t("deviceList.filter.all") },
            ...provinceOptions.map((o) => ({ value: o.id, label: o.label })),
          ]}
        />
      </div>
    ),
    categoryResource === "topologyRelationRules" && (
      <div key="direction" className={cell}>
        <span className={label}>{t("deviceList.filter.direction")}</span>
        <Combobox
          value={directionFilter}
          onValueChange={onDirectionFilterChange}
          placeholder={t("deviceList.filter.directionPlaceholder")}
          emptyText={t("deviceList.filter.noOption")}
          options={[
            { value: "__all", label: t("deviceList.filter.all") },
            { value: "front", label: t("deviceList.filter.front") },
            { value: "rear", label: t("deviceList.filter.rear") },
          ]}
        />
      </div>
    ),
    isSoftDeleteResource && (
      <div key="archive" className={cell}>
        <span className={label}>{t("deviceList.filter.archive")}</span>
        <Combobox
          value={archiveView}
          onValueChange={(value) => {
            if (!value || (value !== "active" && value !== "archived" && value !== "all")) return;
            onArchiveViewChange(value);
          }}
          options={[
            { value: "active", label: t("deviceList.filter.viewActive") },
            { value: "archived", label: t("deviceList.filter.viewArchived") },
            { value: "all", label: t("deviceList.filter.viewAll") },
          ]}
        />
      </div>
    ),
    (
      <div key="limit" className={cell}>
        <span className={label}>{t("deviceList.filter.limit")}</span>
        <Combobox
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          placeholder={t("deviceList.filter.rows")}
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
        <span className={label}>{t("deviceList.filter.actions")}</span>
        <Button
          type="button"
          variant="outline"
          onClick={onResetFilters}
          className="h-7 w-full rounded-full border-border/60 px-2 font-mono text-[9px] uppercase tracking-[0.06em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          {t("deviceList.filter.reset")}
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
            placeholder={
              categoryResource === "cities"
                ? t("deviceList.filter.search")
                : t("deviceList.filter.searchData")
            }
            className="h-8 rounded-lg border-border/60 bg-background pl-8 pr-2.5 text-[11px] shadow-2xs"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8 shrink-0 rounded-full px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          {t("deviceList.filter.reset")}
        </Button>
      </div>
      <div className={filterGridClass}>
        {filters}
      </div>
    </div>
  );
}
