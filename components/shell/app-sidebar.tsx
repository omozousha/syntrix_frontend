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

export type AppSidebarMenuItem = {
  href: string;
  label: string;
};

type NavSubItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

type NavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: NavSubItem[];
};

type NavSection = {
  label: string;
  items: NavMainItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Assets",
    items: [
    {
      title: "Data Management",
      url: "/data-management",
      icon: Database,
      items: [
        { title: "Asset Overview", url: "/data-management", icon: FolderTree },
        { title: "List ODP", url: "/data-management/list/odp", icon: Workflow },
      ],
    },
    ],
  },
  {
    label: "Validation",
    items: [
      { title: "Requests", url: "/requests", icon: ShieldCheck },
      { title: "Audit Trail", url: "/audit-trail", icon: ShieldCheck },
    ],
  },
  {
    label: "Network",
    items: [
      { title: "Maps", url: "/maps", icon: Map },
      { title: "Topology Management", url: "/data-management/topology", icon: Network },
      { title: "As-Built Documents", url: "/data-management/as-built-documents", icon: BookMarked },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Master Data", url: "/master-data", icon: BookMarked },
      { title: "Account Management", url: "/account-management", icon: Layers3 },
      { title: "Trash", url: "/trash", icon: Trash2 },
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
            <p className="mt-1 text-[10px] leading-snug text-sidebar-foreground/70">Ops Console</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-2 py-1.5">
            <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/60">{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                const hasSubItems = Boolean(item.items?.length);
                const itemIsActive = isActive(item.url);
                const subItemIsActive = item.items?.some((subItem) => isActive(subItem.url)) || false;
                const isOpen = itemIsActive || subItemIsActive;

                if (!hasSubItems) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={itemIsActive}
                        className="relative h-9 rounded-lg px-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                      >
                        <Link href={item.url}>
                          {itemIsActive ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" /> : null}
                          {item.icon ? <item.icon className="size-4" /> : null}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={itemIsActive}
                          className="relative h-9 rounded-lg px-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                        >
                          {itemIsActive ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" /> : null}
                          {item.icon ? <item.icon className="size-4" /> : null}
                          <span>{item.title}</span>
                          <ChevronRight className={`ml-auto size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? "rotate-90 text-primary" : "text-muted-foreground"}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isActive(subItem.url)} className="h-8 text-xs data-[active=true]:font-medium data-[active=true]:text-primary">
                                <Link href={subItem.url}>
                                  {subItem.icon ? <subItem.icon className="size-4" /> : null}
                                  <span>{subItem.title}</span>
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
