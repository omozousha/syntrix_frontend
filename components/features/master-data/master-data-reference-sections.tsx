"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {sections.map((section) => {
        const SectionIcon = section.icon;
        const sectionCategories = categories.filter((item) => section.slugs.includes(item.slug));
        return (
          <Card key={section.title} className="border-border/70">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <SectionIcon className="size-4" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {sectionCategories.map((category) => {
                const failedItem = failedCatalogs.find((item) => item.slug === category.slug);
                const count = summaryBySlug[category.slug] ?? 0;
                const isEmpty = !failedItem && count === 0;
                return (
                  <Link
                    key={category.slug}
                    href={failedItem ? "#" : `/data-management/list/${category.slug}`}
                    aria-disabled={Boolean(failedItem)}
                    className={[
                      "group flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors",
                      failedItem ? "pointer-events-none border-dashed bg-muted/30 opacity-75" : "hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={["truncate text-sm font-semibold", isEmpty ? "text-muted-foreground" : "text-foreground"].join(" ")}>
                          {category.label}
                        </p>
                        {isEmpty ? <AlertTriangle className="size-3.5 shrink-0 text-amber-500" /> : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {failedItem ? `Error: ${failedItem.reason}` : category.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={failedItem ? "outline" : isEmpty ? "outline" : "secondary"} className="tabular-nums">
                        {failedItem ? "N/A" : count}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
