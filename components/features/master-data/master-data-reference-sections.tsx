"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Cable,
  CircleDot,
  Globe,
  HardDrive,
  LibraryBig,
  MapPinned,
  Network,
  Search,
  Split,
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

type Props = {
  sections: MasterDataSectionConfig[];
  categories: DataCategory[];
  summaryBySlug: Record<string, number>;
  failedCatalogs: FailedCatalog[];
};

const SECTION_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Referensi Topologi": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
  "Referensi Perangkat": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
  "Referensi Vendor & Tenant": { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-200 dark:ring-violet-800" },
  "Referensi Lokasi": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-800" },
};

const ICON_MAP: Record<string, LucideIcon> = {
  Regions: Globe,
  "POP Types": Network,
  "Route Types": CircleDot,
  "Service Types": LibraryBig,
  "Device Types": HardDrive,
  "ODP Types": Cable,
  "Installation Types": HardDrive,
  Models: HardDrive,
  "Cable Types": Cable,
  "Closure Types": Split,
  "Core Capacities Cable": Cable,
  "Core Capacities Passive Device": HardDrive,
  "Splitter Profiles": Split,
  Tenants: Building2,
  Manufacturers: Building2,
  Brands: Building2,
  Provinces: MapPinned,
  Cities: MapPinned,
};

export function MasterDataReferenceSections({
  sections,
  categories,
  summaryBySlug,
  failedCatalogs,
}: Props) {
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
      for (const category of categories.filter((c) => section.slugs.includes(c.slug))) {
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
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.sectionTitle.toLowerCase().includes(q),
    );
  }, [search, flatItems]);

  if (filtered) {
    return (
      <div className="space-y-3">
        <SearchField value={search} onChange={setSearch} />
        <p className="text-xs text-muted-foreground">
          {filtered.length} hasil untuk &ldquo;{search}&rdquo;
        </p>
        {filtered.length > 0 ? (
          <CardGrid items={filtered} />
        ) : (
          <EmptyState q={search} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchField value={search} onChange={setSearch} />
      {sections.map((section) => {
        const cats = flatItems.filter((i) => i.sectionTitle === section.title);
        if (cats.length === 0) return null;
        const color = SECTION_COLORS[section.title];
        return (
          <div key={section.title}>
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"}`}>
                <section.icon className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{section.title}</h2>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
            </div>
            <CardGrid items={cats} />
          </div>
        );
      })}
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari master data..."
        className="h-10 pl-9"
      />
    </div>
  );
}

function CardGrid({ items }: { items: Array<any> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = ICON_MAP[item.label] ?? HardDrive;
        const color = SECTION_COLORS[item.sectionTitle];
        const isEmpty = !item.failed && item.count === 0;
        if (item.failed) {
          return (
            <div
              key={item.slug}
              className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-xl border border-dashed bg-muted/20 p-3 opacity-50"
            >
              <AlertTriangle className="size-5 text-destructive" />
              <span className="truncate text-center text-xs font-medium">{item.label}</span>
              <Badge variant="outline" className="text-[10px]">Error</Badge>
            </div>
          );
        }
        return (
          <Link
            key={item.slug}
            href={`/data-management/list/${item.slug}`}
            className={`group flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center transition-all hover:shadow-md hover:ring-2 ${color?.ring ?? "ring-primary"} ${isEmpty ? "opacity-60" : ""}`}
          >
            <div className={`rounded-lg p-2 ${color?.bg ?? "bg-muted"} ${color?.text ?? "text-muted-foreground"} transition-transform group-hover:scale-110`}>
              <Icon className="size-6" />
            </div>
            <span className="truncate text-xs font-medium leading-tight">{item.label}</span>
            <span className="truncate text-[10px] text-muted-foreground">{item.description}</span>
            <Badge
              variant={isEmpty ? "outline" : "secondary"}
              className="mt-auto text-[11px] tabular-nums"
            >
              {item.count}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Search className="size-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Tidak ada master data &ldquo;{q}&rdquo;</p>
    </div>
  );
}
