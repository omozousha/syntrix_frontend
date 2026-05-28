"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookMarked, ChevronRight, Database, FolderTree, LayoutDashboard, Layers3, Map, Network, ShieldCheck, Trash2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarSmartTip } from "@/components/sidebar-smart-tip";
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
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-primary/15 bg-primary/10 p-1.5 text-primary shadow-inner">
              <Network className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">Syntrix</p>
              <p className="mt-1 truncate text-[11px] text-sidebar-foreground/70">Synchronization & Validation Matrix</p>
            </div>
          </div>
          <Badge variant="secondary" className="mt-3 w-fit rounded-md text-[10px]">
            Ops Console
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-2 py-1.5">
            <SidebarGroupLabel className="text-[10px] tracking-wide">{section.label}</SidebarGroupLabel>
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
                        className="h-9 rounded-lg px-2.5 text-sm transition-colors hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                      >
                        <Link href={item.url}>
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
                          isActive={itemIsActive || subItemIsActive}
                          className="h-9 rounded-lg px-2.5 text-sm transition-colors hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                        >
                          {item.icon ? <item.icon className="size-4" /> : null}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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

      <SidebarSeparator />

      <SidebarFooter className="px-3 pb-3 pt-2">
        <SidebarSmartTip pathname={pathname} menus={menus} />
      </SidebarFooter>
    </Sidebar>
  );
}
