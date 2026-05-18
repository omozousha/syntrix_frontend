"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import { AppSidebar, type AppSidebarMenuItem } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({
  me,
  onLogout,
  children,
}: {
  me: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const normalizedRole = normalizeRole(me.role);
  const isSuperAdmin = normalizedRole === "superadmin";
  const isAdminRegion = normalizedRole === "adminregion";
  const isValidator = normalizedRole === "validator";
  const canReviewValidation = isSuperAdmin || isAdminRegion;
  const menus: AppSidebarMenuItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/data-management", label: "Data Management" },
    ...(isAdminRegion ? [{ href: "/data-management/list/odp", label: "ODP List" }] : []),
    ...(canReviewValidation ? [{ href: "/requests", label: "Requests" }] : []),
    ...(!isValidator ? [{ href: "/data-management/as-built-documents", label: "As-Built Documents" }] : []),
    ...(isSuperAdmin ? [{ href: "/master-data", label: "Master Data" }] : []),
    ...(isSuperAdmin ? [{ href: "/audit-trail", label: "Audit Trail" }] : []),
    ...(isSuperAdmin ? [{ href: "/trash", label: "Trash" }] : []),
    { href: "/maps", label: "Maps" },
    ...(isSuperAdmin || isAdminRegion ? [{ href: "/account-management", label: "Account Management" }] : []),
  ];

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <SidebarProvider defaultOpen={true} className="h-dvh overflow-hidden">
      <AppSidebar pathname={pathname} menus={menus} />

      <SidebarInset className="h-dvh min-h-0 overflow-hidden">
        <header className="sticky top-0 z-20 shrink-0 border-b bg-card">
          <div className="flex w-full flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-xl font-bold">Syntrix App</h1>
              </div>
              <nav aria-label="Page breadcrumb" className="mt-1">
                <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {breadcrumbs.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                      {index > 0 ? <span>/</span> : null}
                      <span className={index === breadcrumbs.length - 1 ? "font-medium text-foreground" : ""}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
          </div>
          <NavUser me={me} onLogout={onLogout} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-4">
          <section className="h-full overflow-hidden rounded-lg border bg-card p-4 shadow-sm">{children}</section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function buildBreadcrumbs(pathname: string) {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    "data-management": "Data Management",
    topology: "Topology",
    "as-built": "As-Built",
    "as-built-documents": "As-Built Documents",
    list: "List",
    create: "Create",
    maps: "Maps",
    "account-management": "Account Management",
    "master-data": "Master Data",
    "audit-trail": "Audit Trail",
    "validation-requests": "Requests",
    requests: "Requests",
    trash: "Trash",
    "master-regions": "Master Regions",
    "master-device-types": "Master Device Types",
    "master-pop-types": "Master POP Types",
    "master-route-types": "Master Route Types",
    "master-odp-types": "Master ODP Types",
    "master-installation-types": "Master Installation Types",
    "master-manufacturers": "Master Manufacturers",
    "master-brands": "Master Brands",
    "master-models": "Master Models",
    "master-provinces": "Master Provinces",
    "master-cities": "Master Cities",
    profile: "Profile",
    pop: "POP",
    olt: "OLT",
    switch: "Switch",
    router: "Router",
    ont: "ONT",
    otb: "OTB",
    jc: "JC",
    odc: "ODC",
    odp: "ODP",
    cable: "Cable",
    pole: "Pole",
    route: "Route",
    projects: "Projects",
  };

  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return [{ label: "Dashboard" }];

  return parts.map((part) => ({
    label: labels[part] || part.replaceAll("-", " "),
  }));
}

function normalizeRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
}
