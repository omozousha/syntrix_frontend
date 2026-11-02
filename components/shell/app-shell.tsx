"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import { AppSidebar, type AppSidebarMenuItem } from "@/components/shell/app-sidebar";
import { NavUser } from "@/components/shell/nav-user";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getCategoryBySlug } from "@/lib/data-management-config";
import { formatRoleLabel, normalizeRole } from "@/lib/domain-formatters";
import { MapsPersistentHost } from "@/components/features/maps/maps-persistent-host";
import { useTranslate, type Locale, type TFn } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

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
  const { locale, t } = useTranslate();
  const normalizedRole = normalizeRole(me.role);
  const isSuperAdmin = normalizedRole === "superadmin";
  const isAdminRegion = normalizedRole === "adminregion";
  const canReviewValidation = isSuperAdmin || isAdminRegion;
  const menus: AppSidebarMenuItem[] = [
    { href: "/dashboard", label: t("sidebar.dashboard") },
    { href: "/data-management", label: t("sidebar.dataManagement") },
    ...(isSuperAdmin || isAdminRegion ? [{ href: "/data-management/list/odp", label: t("sidebar.listOdp") }] : []),
    ...(canReviewValidation ? [{ href: "/requests", label: t("sidebar.requests") }] : []),
    { href: "/maps", label: t("sidebar.maps") },
    ...(isSuperAdmin ? [{ href: "/master-data", label: t("sidebar.masterData") }] : []),
    ...(isSuperAdmin ? [{ href: "/audit-trail", label: t("sidebar.auditTrail") }] : []),
    ...(isSuperAdmin ? [{ href: "/trash", label: t("sidebar.trash") }] : []),
    ...(isSuperAdmin || isAdminRegion ? [{ href: "/account-management", label: t("sidebar.accountManagement") }] : []),
  ];

  const pageContext = buildPageContext(pathname, t, locale);
  const scopeLabel = buildScopeLabel(me, normalizedRole, t);

  return (
    <SidebarProvider defaultOpen={true} className="h-dvh overflow-hidden bg-sidebar">
      <AppSidebar pathname={pathname} menus={menus} />

      <SidebarInset className="relative h-dvh min-h-0 overflow-hidden bg-sidebar p-2 sm:p-3">
        <div className="flex h-full w-full flex-col overflow-hidden bg-card border-border/50 rounded-2xl border shadow-xs">
          <header className="sticky top-0 z-20 shrink-0 border-b border-border/30 bg-card/80 backdrop-blur-md">
            <div className="flex min-h-14 w-full items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-6 sm:py-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <SidebarTrigger className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">{pageContext.eyebrow}</p>
                    <Badge variant="secondary" className="hidden h-5 rounded-md px-1.5 font-mono text-[10px] font-medium uppercase tracking-wide sm:inline-flex">
                      {formatRoleLabel(normalizedRole)}
                    </Badge>
                    <Badge variant="outline" className="hidden h-5 rounded-md px-1.5 font-mono text-[10px] font-medium md:inline-flex">
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

          {/* Content area (below header). Maps host overlays this area only, not the header. */}
          <div className="relative z-0 min-h-0 flex-1 overflow-hidden">
            <MapsPersistentHost visible={pathname === "/maps"} />

            {pathname === "/maps" ? null : (
              <ScrollArea className="h-full w-full">
                <main className="relative z-10 min-h-full px-3 py-2 sm:px-6 sm:py-4">
                  <section className="min-h-full">{children}</section>
                </main>
              </ScrollArea>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function buildScopeLabel(me: SessionUser, role: string, t: TFn) {
  if (role === "superadmin") return t("header.allRegions");
  const count = me.app_user.user_region_scopes?.length || 0;
  if (count > 1) return `${count} ${t("header.regions")}`;
  if (count === 1) return t("header.oneRegion");
  return t("header.regionScope");
}

function buildPageContext(pathname: string, t: TFn, locale: Locale) {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] || "dashboard";
  const labels: Record<string, { eyebrowKey: MessageKey; titleKey: MessageKey; descriptionKey: MessageKey }> = {
    dashboard: {
      eyebrowKey: "sidebar.workspace",
      titleKey: "sidebar.dashboard",
      descriptionKey: "page.dashboard.description",
    },
    "data-management": {
      eyebrowKey: "sidebar.assets",
      titleKey: "sidebar.dataManagement",
      descriptionKey: "page.dataManagement.description",
    },
    requests: {
      eyebrowKey: "sidebar.validation",
      titleKey: "sidebar.requests",
      descriptionKey: "page.requests.description",
    },
    "validation-requests": {
      eyebrowKey: "sidebar.validation",
      titleKey: "sidebar.requests",
      descriptionKey: "page.requests.description",
    },
    "master-data": {
      eyebrowKey: "sidebar.administration",
      titleKey: "sidebar.masterData",
      descriptionKey: "page.masterData.description",
    },
    "audit-trail": {
      eyebrowKey: "sidebar.governance",
      titleKey: "sidebar.auditTrail",
      descriptionKey: "page.auditTrail.description",
    },
    trash: {
      eyebrowKey: "sidebar.administration",
      titleKey: "sidebar.trash",
      descriptionKey: "page.trash.description",
    },
    maps: {
      eyebrowKey: "sidebar.network",
      titleKey: "sidebar.maps",
      descriptionKey: "page.maps.description",
    },
    "account-management": {
      eyebrowKey: "sidebar.administration",
      titleKey: "sidebar.accountManagement",
      descriptionKey: "page.accountManagement.description",
    },
    profile: {
      eyebrowKey: "sidebar.account",
      titleKey: "sidebar.profile",
      descriptionKey: "page.profile.description",
    },
  };

  const ctx = labels[first] || {
    eyebrowKey: "sidebar.workspace",
    titleKey: "sidebar.dashboard",
    descriptionKey: "page.default.description",
  };

  if ((first === "data-management" || first === "master-data") && segments.length > 1) {
    const subContext = buildSubRouteContext(segments, t, locale, ctx.descriptionKey);
    return {
      eyebrow: t(ctx.eyebrowKey),
      title: subContext.title,
      description: subContext.description,
    };
  }

  return {
    eyebrow: t(ctx.eyebrowKey),
    title: t(ctx.titleKey),
    description: t(ctx.descriptionKey),
  };
}

function buildSubRouteContext(segments: string[], t: TFn, locale: Locale, fallbackDescriptionKey: MessageKey) {
  const listIndex = segments.indexOf("list");
  if (listIndex >= 0) {
    const slug = segments[listIndex + 1] || "";
    const category = getCategoryBySlug(slug);
    const label = category?.label || buildEntityTitle(slug);
    const isDetail = Boolean(segments[listIndex + 2]);
    const listTitle =
      slug === "odp"
        ? t("sidebar.listOdp")
        : locale === "id"
          ? `${t("sidebar.list")} ${label}`
          : `${label} ${t("sidebar.list")}`;
    return {
      title: isDetail ? t("deviceDetail.title", { category: label }) : listTitle,
      description: category?.description || t(fallbackDescriptionKey),
    };
  }

  const importIndex = segments.indexOf("import");
  if (importIndex >= 0) {
    const slug = segments[importIndex + 1] || "";
    const category = getCategoryBySlug(slug);
    const label = category?.label || buildEntityTitle(slug);
    return {
      title: t("import.page.title", { entity: label }),
      description: t("import.page.uploadDesc"),
    };
  }

  if (segments.includes("topology")) {
    return {
      title: t("sidebar.topologyManagement"),
      description: t("topology.relationOverview"),
    };
  }
  if (segments.includes("as-built-documents")) {
    return {
      title: t("sidebar.asBuiltDocuments"),
      description: t("asBuilt.corePathDesc"),
    };
  }
  if (segments.includes("as-built")) {
    return {
      title: t("sidebar.asBuilt"),
      description: t("asBuilt.personalModeDesc"),
    };
  }
  if (segments.includes("odp-quality")) {
    return {
      title: t("sidebar.odpQuality"),
      description: t("assetOverview.description"),
    };
  }
  if (segments.includes("create")) {
    return {
      title: t("sidebar.createAsset"),
      description: t("createForm.headerSub"),
    };
  }

  return {
    title: t("sidebar.dataManagement"),
    description: t(fallbackDescriptionKey),
  };
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
