"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookMarked, ChevronRight, Database, FolderTree, LayoutDashboard, Layers3, Map, Network, ShieldCheck, Trash2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarSmartTip } from "@/components/shell/sidebar-smart-tip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useTranslate } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

export type AppSidebarMenuItem = {
  href: string;
  label: string;
};

type NavSubItem = {
  titleKey: MessageKey;
  url: string;
  icon?: LucideIcon;
};

type NavMainItem = {
  titleKey: MessageKey;
  url: string;
  icon?: LucideIcon;
  items?: NavSubItem[];
};

type NavSection = {
  labelKey: MessageKey;
  items: NavMainItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "sidebar.workspace",
    items: [{ titleKey: "sidebar.dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "sidebar.assets",
    items: [
    {
      titleKey: "sidebar.dataManagement",
      url: "/data-management",
      icon: Database,
      items: [
        { titleKey: "sidebar.assetOverview", url: "/data-management", icon: FolderTree },
        { titleKey: "sidebar.listOdp", url: "/data-management/list/odp", icon: Workflow },
      ],
    },
    ],
  },
  {
    labelKey: "sidebar.validation",
    items: [
      { titleKey: "sidebar.requests", url: "/requests", icon: ShieldCheck },
      { titleKey: "sidebar.auditTrail", url: "/audit-trail", icon: ShieldCheck },
    ],
  },
  {
    labelKey: "sidebar.network",
    items: [
      { titleKey: "sidebar.maps", url: "/maps", icon: Map },
    ],
  },
  {
    labelKey: "sidebar.administration",
    items: [
      { titleKey: "sidebar.masterData", url: "/master-data", icon: BookMarked },
      { titleKey: "sidebar.accountManagement", url: "/account-management", icon: Layers3 },
      { titleKey: "sidebar.trash", url: "/trash", icon: Trash2 },
    ],
  },
];

export function AppSidebar({
  pathname,
  menus,
}: {
  pathname: string;
  menus: AppSidebarMenuItem[];
}) {
  const { t } = useTranslate();
  const allowedHrefs = useMemo(() => new Set(menus.map((menu) => menu.href)), [menus]);
  const sections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => allowedHrefs.has(item.url))
        .map((item) => ({
          ...item,
          items: item.items?.filter((subItem) => allowedHrefs.has(subItem.url)),
        })),
    })).filter((section) => section.items.length > 0);
  }, [allowedHrefs]);

  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary shadow-inner">
            <Network className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-none tracking-tight">Syntrix</p>
            <p className="mt-1 text-[10px] leading-snug text-sidebar-foreground/70">{t("sidebar.opsConsole")}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.labelKey} className="px-2 py-1.5">
            <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/60">{t(section.labelKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                const hasSubItems = Boolean(item.items?.length);
                const itemIsActive = isActive(item.url);
                const subItemIsActive = item.items?.some((subItem) => isActive(subItem.url)) || false;
                const isOpen = itemIsActive || subItemIsActive;

                if (!hasSubItems) {
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton
                        asChild
                        isActive={itemIsActive}
                        className="relative h-9 rounded-lg px-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                      >
                        <Link href={item.url} prefetch={false}>
                          {itemIsActive ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" /> : null}
                          {item.icon ? <item.icon className="size-4" /> : null}
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.titleKey}
                    asChild
                    defaultOpen={isOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={t(item.titleKey)}
                          isActive={itemIsActive}
                          className="relative h-9 rounded-lg px-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                        >
                          {itemIsActive ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" /> : null}
                          {item.icon ? <item.icon className="size-4" /> : null}
                          <span>{t(item.titleKey)}</span>
                          <ChevronRight className={`ml-auto size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "rotate-90 text-primary" : "text-muted-foreground"}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.titleKey}>
                              <SidebarMenuSubButton asChild isActive={isActive(subItem.url)} className="h-8 text-xs data-[active=true]:font-medium data-[active=true]:text-primary">
                                <Link href={subItem.url} prefetch={false}>
                                  {subItem.icon ? <subItem.icon className="size-4" /> : null}
                                  <span>{t(subItem.titleKey)}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3 pt-2">
        <SidebarSmartTip pathname={pathname} menus={menus} />
      </SidebarFooter>
    </Sidebar>
  );
}
