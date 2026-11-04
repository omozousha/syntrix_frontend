import Link from "next/link";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DisplayField } from "../fields";
import {
  countAttachmentRefs,
  formatCounts,
  arrayToCsv,
  formatDateTime,
  formatDate,
  formatPopDisplay,
  valueOf,
  hasRouteGeometry,
  formatDistanceMeters,
} from "../helpers";
import type {
  GenericItem,
  RelationLabels,
  ProjectAssetItem,
  ProjectRouteItem,
  ProjectAsBuiltDocumentItem,
  ProjectCoreRelationItem,
} from "../types";
import { useTranslate } from "@/lib/use-locale";

export function ProjectDetailForm({
  item,
  relationLabels,
  relationLoading = false,
  projectAssets,
  projectRoutes,
  projectAsBuiltDocuments,
  projectCoreRelations,
  projectRelationDevices,
  loadingProjectAssets = false,
}: {
  item: GenericItem;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  projectAssets: ProjectAssetItem[];
  projectRoutes: ProjectRouteItem[];
  projectAsBuiltDocuments: ProjectAsBuiltDocumentItem[];
  projectCoreRelations: ProjectCoreRelationItem[];
  projectRelationDevices: ProjectAssetItem[];
  loadingProjectAssets?: boolean;
}) {
  const { t } = useTranslate();
  const attachmentCount = countAttachmentRefs(item.image_attachments, item.image_attachment_id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <DisplayField label={t("detailPage.project.name")} value={valueOf(item.project_name, "-")} compact />
        <DisplayField label={t("detailPage.project.id")} value={valueOf(item.project_id, "-")} compact />
        <DisplayField label={t("detailPage.project.code")} value={valueOf(item.project_code, "-")} compact />
        <DisplayField label={t("detailPage.project.region")} value={relationLabels.region || "-"} loading={relationLoading} compact />
        <DisplayField label={t("detailPage.project.pop")} value={formatPopDisplay(relationLabels.pop, relationLabels.popCode)} loading={relationLoading} compact />
        <DisplayField label={t("detailPage.project.status")} value={valueOf(item.status, "-")} compact />
        <DisplayField className="md:col-span-2 xl:col-span-3" label={t("detailPage.project.description")} value={valueOf(item.description, "-")} compact />
        <DisplayField label={t("detailPage.project.bastNumber")} value={valueOf(item.bast_number, "-")} compact />
        <DisplayField label={t("detailPage.project.spkNumber")} value={valueOf(item.spk_number, "-")} compact />
        <DisplayField label={t("detailPage.project.vendor")} value={valueOf(item.vendor_name, "-")} compact />
        <DisplayField label={t("detailPage.project.startDate")} value={formatDate(valueOf(item.start_date))} compact />
        <DisplayField label={t("detailPage.project.endDate")} value={formatDate(valueOf(item.end_date))} compact />
        <DisplayField label={t("detailPage.project.budget")} value={valueOf(item.budget_value, "-")} compact />
        <DisplayField label={t("detailPage.project.tags")} value={arrayToCsv(item.tags) || "-"} compact />
        <DisplayField label={t("detailPage.project.attachments")} value={attachmentCount ? `${attachmentCount} file` : "-"} compact />
        <DisplayField label={t("detailPage.project.created")} value={formatDateTime(valueOf(item.created_at))} compact />
        <DisplayField label={t("detailPage.project.updated")} value={formatDateTime(valueOf(item.updated_at))} compact />
      </div>
      <ProjectAssetRollupSection
        projectId={item.id}
        assets={projectAssets}
        coreRelations={projectCoreRelations}
        relationDevices={projectRelationDevices}
        loading={loadingProjectAssets}
      />
      <ProjectEvidenceHubSection
        projectId={item.id}
        regionId={valueOf(item.region_id)}
        routes={projectRoutes}
        asBuiltDocuments={projectAsBuiltDocuments}
        attachmentCount={attachmentCount}
        loading={loadingProjectAssets}
      />
    </div>
  );
}

export function ProjectEvidenceHubSection({
  projectId,
  regionId,
  routes,
  asBuiltDocuments,
  attachmentCount,
  loading,
}: {
  projectId: string;
  regionId: string;
  routes: ProjectRouteItem[];
  asBuiltDocuments: ProjectAsBuiltDocumentItem[];
  attachmentCount: number;
  loading: boolean;
}) {
  const { t } = useTranslate();
  const projectQuery = new URLSearchParams();
  projectQuery.set("project_id", projectId);
  if (regionId) projectQuery.set("region_id", regionId);
  const query = projectQuery.toString();
  const asBuiltWorkspaceHref = `/data-management/as-built${query ? `?${query}` : ""}`;
  const asBuiltDocumentsHref = `/data-management/as-built-documents${query ? `?${query}` : ""}`;

  return (
    <section className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("detailPage.project.evidenceHubTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("detailPage.project.evidenceHubDesc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={asBuiltWorkspaceHref}>{t("detailPage.project.openAsBuilt")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={asBuiltDocumentsHref}>{t("detailPage.project.documents")}</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-3">
            <ProjectAssetMetric label={t("detailPage.project.routesMetric")} value={`${routes.length}`} />
            <ProjectAssetMetric label={t("detailPage.project.asBuiltDocsMetric")} value={`${asBuiltDocuments.length}`} />
            <ProjectAssetMetric label={t("detailPage.project.evidenceFilesMetric")} value={attachmentCount ? `${attachmentCount}` : "-"} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ProjectLinkedList
              title={t("detailPage.project.routesListTitle")}
              emptyText={t("detailPage.project.routesEmpty")}
              items={routes.slice(0, 5).map((route) => ({
                id: route.id,
                href: `/data-management/list/route/${route.id}${regionId ? `?region_id=${encodeURIComponent(regionId)}` : ""}`,
                title: valueOf(route.route_name, valueOf(route.route_id, route.id)),
                subtitle: [valueOf(route.route_code), valueOf(route.route_type), valueOf(route.status)].filter(Boolean).join(" | "),
              }))}
            />
            <ProjectLinkedList
              title={t("detailPage.project.asBuiltListTitle")}
              emptyText={t("detailPage.project.asBuiltEmpty")}
              items={asBuiltDocuments.slice(0, 5).map((doc) => ({
                id: doc.id,
                href: asBuiltDocumentsHref,
                title: valueOf(doc.title, valueOf(doc.document_id, doc.id)),
                subtitle: [valueOf(doc.revision_code), valueOf(doc.primary_format), valueOf(doc.status)].filter(Boolean).join(" | "),
              }))}
            />
          </div>
        </>
      )}
    </section>
  );
}

export function ProjectLinkedList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ id: string; href: string; title: string; subtitle: string }>;
}) {
  return (
    <div className="rounded-md border bg-background">
      <div className="border-b px-3 py-2 text-sm font-semibold text-foreground">{title}</div>
      {items.length ? (
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="px-3 py-2 text-sm">
              <Link href={item.href} className="font-medium text-foreground hover:underline">
                {item.title}
              </Link>
              <p className="text-xs text-muted-foreground">{item.subtitle || "-"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

export function ProjectAssetRollupSection({
  projectId,
  assets,
  coreRelations,
  relationDevices,
  loading,
}: {
  projectId: string;
  assets: ProjectAssetItem[];
  coreRelations: ProjectCoreRelationItem[];
  relationDevices: ProjectAssetItem[];
  loading: boolean;
}) {
  const { t } = useTranslate();
  const passiveAssets = assets.filter((asset) => {
    const type = valueOf(asset.device_type_key).toUpperCase();
    return ["OTB", "ODC", "ODP", "CABLE", "JC", "HH", "MH"].includes(type);
  });
  const assetsForSummary = passiveAssets;
  const typeCounts = assetsForSummary.reduce<Record<string, number>>((acc, asset) => {
    const type = valueOf(asset.device_type_key, "UNKNOWN").toUpperCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const validationCounts = assetsForSummary.reduce<Record<string, number>>((acc, asset) => {
    const status = valueOf(asset.validation_status, "unvalidated").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const cableAssets = assetsForSummary.filter((asset) => valueOf(asset.device_type_key).toUpperCase() === "CABLE");
  const totalCableCore = cableAssets.reduce((sum, asset) => sum + Number(asset.capacity_core || 0), 0);
  const usedCableCore = cableAssets.reduce((sum, asset) => sum + Number(asset.used_core || 0), 0);
  const assetById = new Map([...relationDevices, ...assets].map((asset) => [asset.id, asset]));
  const relationStatusCounts = coreRelations.reduce<Record<string, number>>((acc, relation) => {
    const status = valueOf(relation.status, "unknown").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const relationsWithCable = coreRelations.filter((relation) => relation.cable_device_id).length;
  const relationsWithRoute = coreRelations.filter((relation) => relation.route_id).length;
  const crossProjectWarnings = coreRelations
    .map((relation) => {
      const relatedAssets = [relation.from_device_id, relation.to_device_id, relation.cable_device_id]
        .map((assetId) => (assetId ? assetById.get(assetId) || null : null))
        .filter((asset): asset is ProjectAssetItem => Boolean(asset));
      const mismatchedAssets = relatedAssets.filter((asset) => {
        const assetProjectId = valueOf(asset.project_id);
        return assetProjectId && assetProjectId !== projectId;
      });
      return mismatchedAssets.length ? { relation, mismatchedAssets } : null;
    })
    .filter((item): item is { relation: ProjectCoreRelationItem; mismatchedAssets: ProjectAssetItem[] } => Boolean(item));
  const visibleAssets = assetsForSummary.slice(0, 8);

  return (
    <section className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("detailPage.project.assetsTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("detailPage.project.assetsDesc")}</p>
        </div>
        {loading ? <Skeleton className="h-6 w-20" /> : <Badge variant="outline">{assetsForSummary.length} assets</Badge>}
      </div>

      {loading ? (
        <div className="grid gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : assetsForSummary.length ? (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <ProjectAssetMetric label={t("detailPage.project.byTypeMetric")} value={formatCounts(typeCounts)} />
            <ProjectAssetMetric label={t("detailPage.project.validationMetric")} value={formatCounts(validationCounts)} />
            <ProjectAssetMetric label={t("detailPage.project.cableCoreMetric")} value={totalCableCore ? `${usedCableCore}/${totalCableCore} used` : "-"} />
            <ProjectAssetMetric label={t("detailPage.project.passiveAssetsMetric")} value={`${passiveAssets.length}/${assets.length}`} />
            <ProjectAssetMetric label={t("detailPage.project.topologyRelationsMetric")} value={`${coreRelations.length}`} />
            <ProjectAssetMetric label={t("detailPage.project.relationStatusMetric")} value={formatCounts(relationStatusCounts)} />
            <ProjectAssetMetric label={t("detailPage.project.routeCableLinkedMetric")} value={`${relationsWithRoute}/${relationsWithCable}`} />
            <ProjectAssetMetric label={t("detailPage.project.warningsMetric")} value={`${crossProjectWarnings.length}`} />
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("detailPage.project.consistencyTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("detailPage.project.consistencyDesc")}</p>
              </div>
              <Badge variant={crossProjectWarnings.length ? "destructive" : "outline"}>
                {crossProjectWarnings.length ? `${crossProjectWarnings.length} warning` : "clear"}
              </Badge>
            </div>
            {crossProjectWarnings.length ? (
              <div className="mt-3 divide-y rounded-md border">
                {crossProjectWarnings.slice(0, 5).map(({ relation, mismatchedAssets }) => (
                  <div key={relation.id} className="px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{valueOf(relation.core_code, valueOf(relation.core_id, relation.id))}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("detailPage.project.assetDifferentProject", { names: mismatchedAssets.map(formatProjectAssetNameInline).join(", ") })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{t("detailPage.project.noCrossProjectWarning")}</p>
            )}
          </div>
          <div className="divide-y rounded-md border bg-background">
            {visibleAssets.map((asset) => {
              const typeKey = valueOf(asset.device_type_key, "device");
              const slug = deviceTypeKeyToSlug(typeKey);
              const regionQuery = valueOf(asset.region_id) ? `?region_id=${encodeURIComponent(valueOf(asset.region_id))}` : "";
              const href = `/data-management/list/${slug}/${asset.id}${regionQuery}`;
              const topologyHref = `/data-management/topology?from_device_id=${encodeURIComponent(asset.id)}${valueOf(asset.region_id) ? `&region_id=${encodeURIComponent(valueOf(asset.region_id))}` : ""}`;
              const assetName = valueOf(asset.device_name, valueOf(asset.device_id, asset.id));

              return (
                <div key={asset.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={href} className="font-medium text-foreground hover:underline">
                      {assetName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{valueOf(asset.device_id, "-")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{typeKey.toUpperCase()}</Badge>
                    <Badge variant="outline">{valueOf(asset.status, "-")}</Badge>
                    <Badge variant="outline">{valueOf(asset.validation_status, "unvalidated")}</Badge>
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                      <Link href={topologyHref}>{t("detailPage.project.trace")}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {assetsForSummary.length > visibleAssets.length ? (
            <p className="text-xs text-muted-foreground">{t("detailPage.project.showingAssets", { shown: String(visibleAssets.length), total: String(assetsForSummary.length) })}</p>
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
          {t("detailPage.project.noPassiveAssets")}
        </div>
      )}
    </section>
  );
}

export function ProjectAssetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

// ponytail: local helper instead of importing formatProjectAssetName from helpers.ts; upgrade: share if reused elsewhere.
function formatProjectAssetNameInline(asset: ProjectAssetItem) {
  return valueOf(asset.device_name, valueOf(asset.device_id, asset.id));
}

export function RouteDetailForm({
  item,
  relationLabels,
  relationLoading = false,
}: {
  item: GenericItem;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
}) {
  const { t } = useTranslate();
  const geometryStatus = hasRouteGeometry(item.path_geojson) ? t("detailPage.route.geometryAvailable") : t("detailPage.route.geometryMissing");
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      <DisplayField label={t("detailPage.route.name")} value={valueOf(item.route_name, "-")} compact />
      <DisplayField label={t("detailPage.route.id")} value={valueOf(item.route_id, "-")} compact />
      <DisplayField label={t("detailPage.route.code")} value={valueOf(item.route_code, "-")} compact />
      <DisplayField label={t("detailPage.route.region")} value={relationLabels.region || "-"} loading={relationLoading} compact />
      <DisplayField label={t("detailPage.route.pop")} value={formatPopDisplay(relationLabels.pop, relationLabels.popCode)} loading={relationLoading} compact />
      <DisplayField label={t("detailPage.route.project")} value={relationLabels.project || "-"} loading={relationLoading} compact />
      <DisplayField label={t("detailPage.route.type")} value={valueOf(item.route_type, "-")} compact />
      <DisplayField label={t("detailPage.route.status")} value={valueOf(item.status, "-")} compact />
      <DisplayField label={t("detailPage.route.distance")} value={formatDistanceMeters(item.distance_meters)} compact />
      <DisplayField label={t("detailPage.route.startAsset")} value={relationLabels.startAsset || "-"} loading={relationLoading} compact />
      <DisplayField label={t("detailPage.route.endAsset")} value={relationLabels.endAsset || "-"} loading={relationLoading} compact />
      <DisplayField label={t("detailPage.route.mapGeometry")} value={geometryStatus} compact />
      <DisplayField label={t("detailPage.route.tags")} value={arrayToCsv(item.tags) || "-"} compact />
      <DisplayField label={t("detailPage.route.created")} value={formatDateTime(valueOf(item.created_at))} compact />
      <DisplayField label={t("detailPage.route.updated")} value={formatDateTime(valueOf(item.updated_at))} compact />
    </div>
  );
}