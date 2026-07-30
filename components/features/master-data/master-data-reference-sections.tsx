"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
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
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataCategory } from "@/lib/data-management-config";

export type MasterDataSectionConfig = {
  title: string;
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

const SECTION_COLORS: Record<string, string> = {
  "Referensi Topologi": "text-blue-600 dark:text-blue-400",
  "Referensi Perangkat": "text-emerald-600 dark:text-emerald-400",
  "Referensi Vendor & Tenant": "text-violet-600 dark:text-violet-400",
  "Referensi Lokasi": "text-amber-600 dark:text-amber-400",
};

const SECTION_BG: Record<string, string> = {
  "Referensi Topologi": "bg-blue-50 dark:bg-blue-950/30",
  "Referensi Perangkat": "bg-emerald-50 dark:bg-emerald-950/30",
  "Referensi Vendor & Tenant": "bg-violet-50 dark:bg-violet-950/30",
  "Referensi Lokasi": "bg-amber-50 dark:bg-amber-950/30",
};

const ICON_MAP: Record<string, LucideIcon> = {
  Regions: Globe, "POP Types": Network, "Route Types": CircleDot, "Service Types": LibraryBig,
  "Device Types": Boxes, "ODP Types": Cable, "Installation Types": HardDrive, Models: HardDrive,
  "Cable Types": Cable, "Closure Types": Split, "Core Capacities Cable": Cable,
  "Core Capacities Passive Device": HardDrive, "Splitter Profiles": Split,
  Tenants: Building2, Manufacturers: Building2, Brands: Building2,
  Provinces: MapPinned, Cities: MapPinned,
};

export function MasterDataReferenceSections({
  sections, categories, summaryBySlug, failedCatalogs,
}: Props) {
  const [search, setSearch] = useState("");

  const flatItems = useMemo(() => {
    const items: Array<{
      slug: string; label: string; description: string; count: number; failed: boolean; failedReason: string;
      sectionTitle: string;
    }> = [];
    for (const section of sections) {
      for (const category of categories.filter((c) => section.slugs.includes(c.slug))) {
        const failed = failedCatalogs.find((f) => f.slug === category.slug);
        const count = summaryBySlug[category.slug] ?? 0;
        items.push({
          slug: category.slug, label: category.label, description: category.description,
          count: failed ? 0 : count,
          failed: Boolean(failed), failedReason: failed?.reason || "", sectionTitle: section.title,
        });
      }
    }
    return items;
  }, [sections, categories, summaryBySlug, failedCatalogs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return flatItems.filter((i) => i.label.toLowerCase().includes(q) || i.sectionTitle.toLowerCase().includes(q));
  }, [search, flatItems]);

  const renderCards = (items: typeof flatItems) => (
    <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
      {items.map((item) => {
        const Icon = ICON_MAP[item.label] ?? HardDrive;
        const color = SECTION_COLORS[item.sectionTitle];
        const bg = SECTION_BG[item.sectionTitle];
        const isEmpty = !item.failed && item.count === 0;
        if (item.failed) {
          return (
            <div key={item.slug} className="flex flex-col items-center gap-1 rounded-lg border border-dashed bg-muted/20 p-2 opacity-50">
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <span className="truncate text-[11px] font-medium leading-tight">{item.label}</span>
              <Badge variant="outline" className="text-[9px] px-1 h-4">!</Badge>
            </div>
          );
        }
        return (
            <Tooltip key={item.slug}>
              <TooltipTrigger asChild>
                <Link href={`/master-data/list/${item.slug}`}
                  className={`group flex flex-col items-center gap-1 rounded-lg border bg-card p-2 text-center transition-all hover:shadow-sm hover:ring-1 hover:ring-primary/30 ${isEmpty ? "opacity-55" : ""}`}>
                  <div className={`rounded-md p-1.5 ${bg ?? "bg-muted"} ${color ?? "text-muted-foreground"} transition-transform group-hover:scale-110`}>
                    <Icon className="size-4" />
                  </div>
                  <span className="truncate text-[11px] font-medium leading-tight">{item.label}</span>
                  <Badge variant={isEmpty ? "outline" : "secondary"} className="text-[10px] tabular-nums px-1.5 h-4 min-w-[1.5rem]">
                    {item.count}
                  </Badge>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-60 text-xs">
                <p className="font-medium">{item.label}</p>
                <p className="text-muted-foreground">{item.description}</p>
              </TooltipContent>
            </Tooltip>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider>
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari..." className="h-8 pl-8 text-xs" />
      </div>

      {filtered ? (
        filtered.length > 0 ? renderCards(filtered) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Search className="size-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Tidak ada &ldquo;{search}&rdquo;</p>
          </div>
        )
      ) : (
        sections.map((section) => {
          const cats = flatItems.filter((i) => i.sectionTitle === section.title);
          if (cats.length === 0) return null;
          return (
            <div key={section.title}>
              <h3 className={`mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${SECTION_COLORS[section.title] ?? "text-muted-foreground"}`}>
                <section.icon className="size-3.5" />
                {section.title}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {cats.reduce((acc, c) => acc + c.count, 0)}
                </span>
              </h3>
              {renderCards(cats)}
            </div>
          );
        })
      )}
    </div>
    </TooltipProvider>
  );
}
