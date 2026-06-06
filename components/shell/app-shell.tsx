"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import { AppSidebar, type AppSidebarMenuItem } from "@/components/shell/app-sidebar";
import { NavUser } from "@/components/shell/nav-user";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { getCategoryBySlug } from "@/lib/data-management-config";

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

  const pageContext = buildPageContext(pathname);
  const scopeLabel = buildScopeLabel(me, normalizedRole);

  return (
    <SidebarProvider defaultOpen={true} className="h-dvh overflow-hidden">
      <AppSidebar pathname={pathname} menus={menus} />

      <SidebarInset className="h-dvh min-h-0 overflow-hidden">
        <header className="sticky top-0 z-20 shrink-0 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex min-h-14 w-full items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="hidden shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:block">{pageContext.eyebrow}</p>
                  <Badge variant="secondary" className="hidden h-5 rounded-md px-1.5 text-[10px] font-medium sm:inline-flex">
                    {formatRoleLabel(normalizedRole)}
                  </Badge>
                  <Badge variant="outline" className="hidden h-5 rounded-md px-1.5 text-[10px] font-medium md:inline-flex">
                    {scopeLabel}
                  </Badge>
                </div>
                <div className="mt-0.5 flex min-w-0 items-baseline gap-3">
                  <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-lg">{pageContext.title}</h1>
                  <p className="hidden truncate text-sm text-muted-foreground xl:block">{pageContext.description}</p>
                </div>
              </div>
            </div>
            <NavUser me={me} onLogout={onLogout} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden bg-muted/25 px-2 py-2 sm:px-4 sm:py-3">
          <section className="h-full overflow-hidden rounded-lg border bg-card/95 p-3 shadow-sm sm:rounded-xl sm:p-4">{children}</section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function formatRoleLabel(role: string) {
  if (role === "superadmin") return "Superadmin";
  if (role === "adminregion") return "Admin Region";
  if (role === "validator") return "Validator";
  return role;
}

function buildScopeLabel(me: SessionUser, role: string) {
  if (role === "superadmin") return "All regions";
  const count = me.app_user.user_region_scopes?.length || 0;
  if (count > 1) return `${count} regions`;
  if (count === 1) return "1 region";
  return "Region scope";
}

function buildPageContext(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] || "dashboard";
  const last = segments[segments.length - 1] || first;
  const labels: Record<string, { eyebrow: string; title: string; description: string }> = {
    dashboard: {
      eyebrow: "Workspace",
      title: "Dashboard",
      description: "Ringkasan scope, request, dan kondisi inventory.",
    },
    "data-management": {
      eyebrow: "Inventory",
      title: buildDataManagementTitle(segments),
      description: "Kelola asset, POP, route, project, customer, dan relasi jaringan.",
    },
    requests: {
      eyebrow: "Approval",
      title: "Requests",
      description: "Review request asset dan validasi sesuai role.",
    },
    "validation-requests": {
      eyebrow: "Approval",
      title: "Requests",
      description: "Review hasil validasi lapangan dan evidence.",
    },
    "master-data": {
      eyebrow: "Reference",
      title: "Master Data",
      description: "Standarisasi referensi perangkat, lokasi, dan layanan.",
    },
    "audit-trail": {
      eyebrow: "Governance",
      title: "Audit Trail",
      description: "Lacak perubahan dan aktivitas sistem.",
    },
    trash: {
      eyebrow: "Archive",
      title: "Trash",
      description: "Kelola data yang sudah diarsipkan.",
    },
    maps: {
      eyebrow: "Network",
      title: "Maps",
      description: "Visualisasi asset dan cakupan jaringan.",
    },
    "account-management": {
      eyebrow: "Administration",
      title: "Account Management",
      description: "Kelola akun, role, dan region scope.",
    },
    profile: {
      eyebrow: "Account",
      title: "Profile",
      description: "Kelola identitas dan keamanan akun.",
    },
  };

  return labels[first] || {
    eyebrow: "Syntrix",
    title: buildEntityTitle(last),
    description: "Synchronization & Validation Matrix.",
  };
}

function buildDataManagementTitle(segments: string[]) {
  const listIndex = segments.indexOf("list");
  if (listIndex >= 0) {
    const slug = segments[listIndex + 1] || "";
    const category = getCategoryBySlug(slug);
    const label = category?.label || buildEntityTitle(slug);
    return segments[listIndex + 2] ? `${label} Detail` : `${label} List`;
  }

  if (segments.includes("topology")) return "Topology";
  if (segments.includes("as-built-documents")) return "As-Built Documents";
  if (segments.includes("as-built")) return "As-Built";
  if (segments.includes("odp-quality")) return "ODP Quality";
  if (segments.includes("create")) return "Create Asset";
  return "Data Management";
}

function buildEntityTitle(value: string) {
  const labels: Record<string, string> = {
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
    customer: "Customer",
  };
  return labels[value] || value.replaceAll("-", " ");
}

function normalizeRole(role: string) {
  if (role === "admin") return "superadmin";
  if (role === "user_all_region") return "adminregion";
  if (role === "user_region") return "validator";
  return role;
}
