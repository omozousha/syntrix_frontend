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
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  "Referensi Topologi": "text-sky-500 dark:text-sky-400",
  "Referensi Perangkat": "text-emerald-500 dark:text-emerald-400",
  "Referensi Vendor & Tenant": "text-violet-500 dark:text-violet-400",
  "Referensi Lokasi": "text-amber-500 dark:text-amber-400",
};

const SECTION_ICON_BG: Record<string, string> = {
  "Referensi Topologi": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  "Referensi Perangkat": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Referensi Vendor & Tenant": "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "Referensi Lokasi": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const ICON_MAP: Record<string, LucideIcon> = {
  Regions: Globe,
  "POP Types": Network,
  "Route Types": CircleDot,
  "Service Types": LibraryBig,
  "Device Types": Boxes,
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
        });
      }
    }
    return items;
  }, [sections, categories, summaryBySlug, failedCatalogs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return flatItems.filter(
      (i) => i.label.toLowerCase().includes(q) || i.sectionTitle.toLowerCase().includes(q),
    );
  }, [search, flatItems]);

  const renderCards = (items: typeof flatItems) => (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {items.map((item) => {
        const Icon = ICON_MAP[item.label] ?? HardDrive;
        const iconBg = SECTION_ICON_BG[item.sectionTitle] ?? "bg-muted/30 text-muted-foreground border-border/50";
        const isEmpty = !item.failed && item.count === 0;

        if (item.failed) {
          return (
            <div
              key={item.slug}
              className="flex flex-col items-center justify-between gap-2 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-3 text-center shadow-2xs glass-inset"
            >
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
              </div>
              <span className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground">
                {item.label}
              </span>
              <Badge variant="destructive" className="h-4 font-mono text-[9px] uppercase tracking-[0.12em]">
                Error
              </Badge>
            </div>
          );
        }

        return (
          <Tooltip key={item.slug}>
            <TooltipTrigger asChild>
              <Link
                href={`/master-data/list/${item.slug}`}
                className={`group flex flex-col items-center justify-between gap-2.5 rounded-2xl border border-border/60 bg-card p-3.5 text-center shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/45 hover:bg-muted/15 hover:shadow-xs active:scale-[0.98] ${
                  isEmpty ? "opacity-60 hover:opacity-100" : ""
                }`}
              >
                <div
                  className={`rounded-xl border p-2 shadow-2xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 ${iconBg}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="w-full min-w-0">
                  <span className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground">
                    {item.label}
                  </span>
                </div>
                <Badge
                  variant={isEmpty ? "outline" : "secondary"}
                  className={`h-4 min-w-[2rem] px-2 font-mono text-[9px] font-semibold tabular-nums tracking-[0.12em] ${
                    isEmpty ? "border-border/60 text-muted-foreground" : "bg-muted/50 text-foreground"
                  }`}
                >
                  {item.count}
                </Badge>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64 rounded-xl border border-border/60 bg-popover p-2.5 text-xs shadow-xs">
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="mt-0.5 text-muted-foreground">{item.description}</p>
              <div className="mt-1.5 flex items-center justify-between border-t border-border/40 pt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>{item.sectionTitle}</span>
                <span className="font-semibold text-foreground tabular-nums">{item.count} item</span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kategori referensi master data..."
            className="h-9 rounded-full border-border/60 bg-card pl-9.5 pr-9 text-xs shadow-2xs glass-inset transition-colors duration-200 focus-visible:border-primary/50"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2 rounded-full p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>

        {/* Categories Presentation */}
        {filtered ? (
          filtered.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  Hasil Pencarian ({filtered.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="h-5 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
                >
                  Reset Filter
                </Button>
              </div>
              {renderCards(filtered)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
              <Search className="size-8 text-muted-foreground/30" />
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Tidak ada kategori cocok dengan &ldquo;{search}&rdquo;
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-1 rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                Hapus Pencarian
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-5">
            {sections.map((section) => {
              const cats = flatItems.filter((i) => i.sectionTitle === section.title);
              if (cats.length === 0) return null;
              const sectionTotal = cats.reduce((acc, c) => acc + c.count, 0);

              return (
                <div key={section.title} className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-2">
                      <section.icon className={`size-3.5 ${SECTION_COLORS[section.title] ?? "text-muted-foreground"}`} />
                      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
                        {section.title}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-4.5 rounded-full border-border/50 px-2 font-mono text-[9px] font-semibold tabular-nums tracking-[0.12em] text-muted-foreground"
                    >
                      {sectionTotal} ITEM
                    </Badge>
                  </div>
                  {renderCards(cats)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
