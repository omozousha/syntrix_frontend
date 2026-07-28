"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DataCategory } from "@/lib/data-management-config";

export type MasterDataSectionConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
  slugs: string[];
};

export type FailedCatalog = {
  slug: string;
  label: string;
  reason: string;
};

type MasterDataReferenceSectionsProps = {
  sections: MasterDataSectionConfig[];
  categories: DataCategory[];
  summaryBySlug: Record<string, number>;
  failedCatalogs: FailedCatalog[];
};

export function MasterDataReferenceSections({
  sections,
  categories,
  summaryBySlug,
  failedCatalogs,
}: MasterDataReferenceSectionsProps) {
  const [search, setSearch] = useState("");

  const flatItems = useMemo(() => {
    const items: Array<{
      slug: string;
      label: string;
      description: string;
      count: number;
      failed: boolean;
      failedReason: string;
      sectionTitle: string;
      sectionIcon: LucideIcon;
    }> = [];
    for (const section of sections) {
      const cats = categories.filter((c) => section.slugs.includes(c.slug));
      for (const category of cats) {
        const failed = failedCatalogs.find((f) => f.slug === category.slug);
        const count = summaryBySlug[category.slug] ?? 0;
        items.push({
          slug: category.slug,
          label: category.label,
          description: category.description,
          count: failed ? 0 : count,
          failed: Boolean(failed),
          failedReason: failed?.reason || "",
          sectionTitle: section.title,
          sectionIcon: section.icon,
        });
      }
    }
    return items;
  }, [sections, categories, summaryBySlug, failedCatalogs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return flatItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.sectionTitle.toLowerCase().includes(q),
    );
  }, [search, flatItems]);

  const isEmptyItem = (item: (typeof flatItems)[number]) =>
    !item.failed && item.count === 0;

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari master data..."
          className="h-10 pl-9"
        />
      </div>

      {/* Filtered results */}
      {filtered ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {filtered.length} hasil untuk &ldquo;{search}&rdquo;
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <CategoryCard
                key={item.slug}
                item={item}
                isEmpty={isEmptyItem(item)}
              />
            ))}
          </div>
        </div>
      ) : search.trim() === "" ? (
        /* Sections view */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const cats = flatItems.filter((i) => i.sectionTitle === section.title);
            return (
              <div key={section.title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <SectionIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {cats.map((item) => (
                    <CategoryCard
                      key={item.slug}
                      item={item}
                      isEmpty={isEmptyItem(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {filtered?.length === 0 && search.trim() !== "" && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Tidak ada master data &ldquo;{search}&rdquo;
          </p>
        </div>
      )}
    </>
  );
}

function CategoryCard({
  item,
  isEmpty,
}: {
  item: {
    slug: string;
    label: string;
    description: string;
    count: number;
    failed: boolean;
    failedReason: string;
    sectionTitle: string;
  };
  isEmpty: boolean;
}) {
  return (
    <Link
      href={item.failed ? "#" : `/data-management/list/${item.slug}`}
      aria-disabled={item.failed}
      className={[
        "group flex items-center gap-3 rounded-lg border p-3 transition-all",
        item.failed
          ? "pointer-events-none border-dashed bg-muted/30 opacity-60"
          : "hover:border-primary/40 hover:shadow-xs",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-medium ${
              isEmpty ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {item.label}
          </span>
          {isEmpty && (
            <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
          )}
          {item.failed && (
            <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {item.failed ? item.failedReason : item.description}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge
          variant={item.failed ? "outline" : isEmpty ? "outline" : "secondary"}
          className="tabular-nums"
        >
          {item.failed ? "Error" : item.count}
        </Badge>
        {!item.failed && (
          <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </Link>
  );
}
