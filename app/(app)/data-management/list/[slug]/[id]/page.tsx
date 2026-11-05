"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, Download, Pencil, Save, X } from "lucide-react";
import { ResponseDialog } from "@/components/response-dialog";
import {
  DeviceDetailHeader,
  DeviceDetailSkeleton,
  DeviceBentoHeroTile,
  DeviceBentoQrTile,
  DeviceBentoLocationTile,
  DeviceBentoCapacityTile,
  DeviceBentoGalleryTile,
  DeviceBentoValidationHistoryTile,
  DeviceFormSelection,
  DevicePortSummarySection,
  PatchCordLabelsSection,
  GenericDeviceRawSection,
  OdcCoreChainSummarySection,
  OtbCoreChainSummarySection,
  ValidationReminderDialog,
} from "@/components/features/data-management/device-detail";
import {
  PopBentoHeroTile,
  PopBentoLocationTile,
  PopBentoPropertyTile,
  PopBentoDocumentsTile,
  PopBentoGalleryTile,
  PopBentoRackKpiTile,
  PopDetailSummaryStrip,
  PopRackElevationCanvas,
  PopRackFormDialog,
  PopUnmountedTray,
  PopRackMountModal,
  type DeviceToMount,
  type RackOption,
  type PopDocumentRef,
} from "@/components/features/data-management/pop-detail";
import {
  CustomerBentoHeroTile,
  CustomerBentoLabelTile,
  CustomerBentoLocationTile,
  CustomerBentoConnectionTile,
} from "@/components/features/data-management/customer-detail";
import { getStoredPopVisibleDeviceTypes, isRackMountable } from "@/lib/pop-device-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session-context";
import { useTranslate } from "@/lib/use-locale";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob } from "@/lib/attachment-utils";
import { DeviceNavigationModal } from "@/components/features/maps/device-navigation-modal";
import { getCategoryBySlug } from "@/lib/data-management-config";
import { buildDeviceQrRelationDisplay } from "@/lib/display-adapters/device-display-adapter";
import { useReferenceData } from "@/hooks/use-reference-data";
import { buildCustomerQrHref, buildDeviceQrHref, buildQrLabelPngDataUrl, formatQrPopLabel, loadQrLabelLogoDataUrl, loadQrLabelSettings } from "@/lib/qr-label";
import {
  TopologyLookupData,
  emptyTopologyLookup,
} from "@/components/features/data-management/device-detail/sections/device-topology-helpers";
import {
  type ProvinceOption,
  type CityOption,
} from "@/components/features/data-management/device-detail/sections/device-technical-helpers";
import { CustomerDetailEditForm } from "@/components/features/data-management/detail-page/forms/customer-detail-edit-form";
import { PopDetailForm } from "@/components/features/data-management/detail-page/forms/pop-detail-form";
import { ProjectDetailForm, RouteDetailForm } from "@/components/features/data-management/detail-page/forms/project-detail-form";
import {
  buildEditableForm,
  buildUpdatePayload,
  valueOf,
  buildReferenceMap,
  getRelationRecord,
  getEffectiveDeviceValidationStatus,
  isFieldValidationRequestRecord,
  isFinalValidationRecord,
  sanitizeFileName,
  validateCoordinateFormat,
  formatDeviceRelationLabel,
  mapValidationRequestStatusToFieldStatus,
  extractImageAttachments,
  mergeAttachmentRefs,
  extractValidationEvidenceAttachments,
  uploadAttachment,
  summarizeOdpPorts,
  getOdpPortStatusClass,
  buildProjectDetailHref,
} from "@/components/features/data-management/detail-page/helpers";
import type {
  GenericItem,
  RelationRecord,
  EditableForm,
  AttachmentRef,
  UploadResult,
  DevicePort,
  DevicePortConnection,
  DeviceTopologySummary,
  OdpCustomerOption,
  OdpOntOption,
  ValidatorOption,
  OdpCableOption,
  PopLookupOption,
  ProjectLookupOption,
  ProjectAssetItem,
  ProjectRouteItem,
  ProjectAsBuiltDocumentItem,
  ProjectCoreRelationItem,
  SplitterProfileOption,
  TopologyRelationRuleOption,
  DeviceTypeMasterOption,
  OdpTypeOption,
  InstallationTypeOption,
  TenantOption,
  OdpCoreChainSummary,
  OdpValidationDraft,
  OdpValidationChecklistKey,
  OdpFieldInspectionPayload,
  OdpEvidenceAttachment,
  OdpFieldValidationPayload,
  OdpValidationPortSnapshot,
  OdpValidationRecord,
  ValidationRequestRecord,
  ServicePortRelation,
  RelationLabels,
} from "@/components/features/data-management/detail-page/types";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "";

const attachmentUrlCache = new Map<string, string>();
const failedAttachmentCache = new Set<string>();


const MAX_IMAGE_ATTACHMENTS = 10;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function DataManagementDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const slug = (params?.slug || "").toLowerCase();
  const id = params?.id || "";
  const category = getCategoryBySlug(slug);
  const { token, me } = useSession();
  const { t } = useTranslate();
  const relationReferenceQuery = useReferenceData({
    token,
    groups: ["regions", "pops", "tenants", "manufacturers", "brands", "assetModels", "projects", "serviceTypes"],
    limit: 500,
    enabled: Boolean(token && category),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogText, setSuccessDialogText] = useState("");
  const [item, setItem] = useState<GenericItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditableForm>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [loadingImagePreviews, setLoadingImagePreviews] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [odpInfoOpen, setOdpInfoOpen] = useState(false);
  const [attachmentNames, setAttachmentNames] = useState<Record<string, string>>({});
  const [relationLabels, setRelationLabels] = useState<RelationLabels>({});
  const [relationLabelsLoading, setRelationLabelsLoading] = useState(false);
  const [projectAssets, setProjectAssets] = useState<ProjectAssetItem[]>([]);
  const [projectRoutes, setProjectRoutes] = useState<ProjectRouteItem[]>([]);
  const [projectAsBuiltDocuments, setProjectAsBuiltDocuments] = useState<ProjectAsBuiltDocumentItem[]>([]);
  const [projectCoreRelations, setProjectCoreRelations] = useState<ProjectCoreRelationItem[]>([]);
  const [projectRelationDevices, setProjectRelationDevices] = useState<ProjectAssetItem[]>([]);
  const [loadingProjectAssets, setLoadingProjectAssets] = useState(false);
  const [splitterProfiles, setSplitterProfiles] = useState<SplitterProfileOption[]>([]);
  const [closureTypes, setClosureTypes] = useState<Array<{ id: string; closure_type_name: string; closure_type_code?: string | null; max_core_capacity?: number | null; max_splice_capacity?: number | null; supports_pass_through?: boolean | null; supports_branching?: boolean | null }>>([]);
  const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string; core_count?: number | null }>>([]);
  const [routeTypes, setRouteTypes] = useState<Array<{ id: string; route_type_code?: string | null; route_type_name: string }>>([]);
  const [deviceTypeMasters, setDeviceTypeMasters] = useState<DeviceTypeMasterOption[]>([]);
  const [topologyRelationRules, setTopologyRelationRules] = useState<TopologyRelationRuleOption[]>([]);
  const [deviceCoreCapacities, setDeviceCoreCapacities] = useState<Array<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>([]);
  const [coreCapacities, setCoreCapacities] = useState<Array<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>>([]);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [popTypes, setPopTypes] = useState<Array<{ id: string; pop_type_name: string; pop_type_code?: string | null }>>([]);
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [renamingAttachmentId, setRenamingAttachmentId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [odpPorts, setOdpPorts] = useState<DevicePort[]>([]);
  const [devicePortConnections, setDevicePortConnections] = useState<DevicePortConnection[]>([]);
  const [deviceTopologySummary, setDeviceTopologySummary] = useState<DeviceTopologySummary | null>(null);
  const [loadingOdpPorts, setLoadingOdpPorts] = useState(false);
  const [updatingPortId, setUpdatingPortId] = useState("");
  const [provisioningPorts, setProvisioningPorts] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLabelLogoDataUrl, setQrLabelLogoDataUrl] = useState("");
  const [qrLabelFooterText, setQrLabelFooterText] = useState("");
  const [qrLabelTemplateStyle, setQrLabelTemplateStyle] = useState<"default" | "hazard" | "hazard_compact">("default");
  const [qrLabelPatchCordStyle, setQrLabelPatchCordStyle] = useState<"plain" | "qr">("plain");
  const [qrLabelReady, setQrLabelReady] = useState(false);
  const [odpCustomers, setOdpCustomers] = useState<OdpCustomerOption[]>([]);
  const [odpOntDevices, setOdpOntDevices] = useState<OdpOntOption[]>([]);
  const [odpCableDevices, setOdpCableDevices] = useState<OdpCableOption[]>([]);
  const [validatorOptions, setValidatorOptions] = useState<ValidatorOption[]>([]);
  const [loadingValidators, setLoadingValidators] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedReminderValidatorId, setSelectedReminderValidatorId] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const [popOptions, setPopOptions] = useState<PopLookupOption[]>([]);
  const [loadingOdpLookups, setLoadingOdpLookups] = useState(false);
  const [topologyLookupData, setTopologyLookupData] = useState<TopologyLookupData>(emptyTopologyLookup());
  const [navModalOpen, setNavModalOpen] = useState(false);

  // POP Rack & Device States
  const [popDevices, setPopDevices] = useState<GenericItem[]>([]);
  const [loadingPopDevices, setLoadingPopDevices] = useState(false);
  const [selectedPopRackId, setSelectedPopRackId] = useState("");
  const [popMountModalOpen, setPopMountModalOpen] = useState(false);
  const [popMountTargetU, setPopMountTargetU] = useState(1);
  const [popDeviceToMount, setPopDeviceToMount] = useState<DeviceToMount | null>(null);
  const [visiblePopDeviceTypes, setVisiblePopDeviceTypes] = useState<string[]>(() =>
    getStoredPopVisibleDeviceTypes((me?.app_user as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined)
  );
  const [showUnmountedTray, setShowUnmountedTray] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("syntrix_pop_show_unmounted_tray");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });
  const [createRackDialogOpen, setCreateRackDialogOpen] = useState(false);
  const [editRackDialogOpen, setEditRackDialogOpen] = useState(false);
  const [rackToEdit, setRackToEdit] = useState<(RackOption & { rack_type?: string }) | null>(null);
  const [popDocuments, setPopDocuments] = useState<PopDocumentRef[]>([]);
  const [loadingPopDocuments, setLoadingPopDocuments] = useState(false);

  // POP Customer Summary States
  const [popCustomerTotal, setPopCustomerTotal] = useState(0);
  const [loadingPopCustomerSummary, setLoadingPopCustomerSummary] = useState(false);
  const [popCustomerStatusBreakdown, setPopCustomerStatusBreakdown] = useState<
    Array<{ status: string; count: number }>
  >([]);

  // POP Detail Active Tab State ("overview" | "rack")
  const initialPopTab = searchParams.get("tab") === "rack" ? "rack" : "overview";
  const [activePopTab, setActivePopTab] = useState<string>(initialPopTab);

  function toggleShowUnmountedTray() {
    setShowUnmountedTray((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("syntrix_pop_show_unmounted_tray", String(next));
      }
      return next;
    });
  }
  const relationReferenceMaps = useMemo(() => {
    const data = relationReferenceQuery.data?.data || {};
    return {
      regions: buildReferenceMap(data.regions),
      pops: buildReferenceMap(data.pops),
      tenants: buildReferenceMap(data.tenants),
      manufacturers: buildReferenceMap(data.manufacturers),
      brands: buildReferenceMap(data.brands),
      models: buildReferenceMap(data.assetModels || data.models),
      projects: buildReferenceMap(data.projects),
      serviceTypes: buildReferenceMap(data.serviceTypes),
    };
  }, [relationReferenceQuery.data]);
  const projectOptions = useMemo(
    () => Array.from(relationReferenceMaps.projects.values()) as ProjectLookupOption[],
    [relationReferenceMaps.projects],
  );
  const manufacturerOptions = useMemo(
    () => Array.from(relationReferenceMaps.manufacturers.values()) as Array<{ id: string; manufacturer_name: string; manufacturer_code?: string | null }>,
    [relationReferenceMaps.manufacturers],
  );
  const brandOptions = useMemo(
    () => Array.from(relationReferenceMaps.brands.values()) as Array<{ id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null }>,
    [relationReferenceMaps.brands],
  );
  const modelOptions = useMemo(
    () => Array.from(relationReferenceMaps.models.values()) as Array<{ id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null; capacity_core?: number | null; total_ports?: number | null }>,
    [relationReferenceMaps.models],
  );

  const popRacks = useMemo<Array<RackOption & { rack_type?: string }>>(() => {
    if (category?.resource !== "pops") return [];
    return popDevices
      .filter((d) => d.device_type_key === "RACK")
      .map((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return {
          id: d.id,
          device_name: String(d.device_name || "Rack"),
          rack_u_height: Number(specs?.rack_u_height) || 42,
          rack_type: (specs?.rack_type as string) || "closed_cabinet",
        };
      });
  }, [category?.resource, popDevices]);

  const popPropertyData = useMemo(() => {
    if (category?.resource !== "pops" || !item) return null;
    const custom = (item.custom_fields || {}) as Record<string, unknown>;
    return {
      pbb_nop: (custom.pbb_nop as string) || null,
      building_status: (custom.building_status as string) || null,
      lease_start_date: (custom.lease_start_date as string) || null,
      lease_end_date: (custom.lease_end_date as string) || null,
      annual_lease_cost: (custom.annual_lease_cost as string | number) || null,
      landlord_name: (custom.landlord_name as string) || null,
      landlord_contact: (custom.landlord_contact as string) || null,
      permit_number: (custom.permit_number as string) || null,
      legal_notes: (custom.legal_notes as string) || null,
    };
  }, [category?.resource, item]);

  const activePopRackId = selectedPopRackId || popRacks[0]?.id || "";

  const popMountedDevices = useMemo<DeviceToMount[]>(() => {
    if (category?.resource !== "pops" || !activePopRackId) return [];
    return popDevices
      .filter((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return isRackMountable(d) && specs?.rack_device_id === activePopRackId;
      })
      .map((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return {
          id: d.id,
          device_name: String(d.device_name || ""),
          device_type_key: String(d.device_type_key || ""),
          u_height: (specs?.u_height as number | string | undefined) ?? 1,
          rack_unit_position: specs?.rack_unit_position as number | string | undefined,
          rack_device_id: specs?.rack_device_id as string | undefined,
        };
      });
  }, [category?.resource, popDevices, activePopRackId]);

  const popUnmountedDevices = useMemo<DeviceToMount[]>(() => {
    if (category?.resource !== "pops") return [];
    return popDevices
      .filter((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return isRackMountable(d) && !specs?.rack_device_id;
      })
      .map((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return {
          id: d.id,
          device_name: String(d.device_name || ""),
          device_type_key: String(d.device_type_key || ""),
          u_height: (specs?.u_height as number | string | undefined) ?? 1,
          rack_unit_position: specs?.rack_unit_position as number | string | undefined,
          rack_device_id: specs?.rack_device_id as string | undefined,
        };
      });
  }, [category?.resource, popDevices]);

  const popDeviceTypeCounts = useMemo(() => {
    if (category?.resource !== "pops") return {};
    const counts: Record<string, number> = {};
    popDevices.forEach((d) => {
      const k = String(d.device_type_key || "").toUpperCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [category?.resource, popDevices]);

  const totalPopU = useMemo(() => {
    return popRacks.reduce((sum, r) => sum + (r.rack_u_height || 42), 0);
  }, [popRacks]);

  const usedPopU = useMemo(() => {
    return popDevices
      .filter((d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return isRackMountable(d) && specs?.rack_device_id;
      })
      .reduce((sum, d) => {
        const specs = d.specifications as Record<string, unknown> | undefined;
        return sum + (Number(specs?.u_height) || 1);
      }, 0);
  }, [popDevices]);

  const popDeviceCount = useMemo(() => {
    return popDevices.filter((d) => String(d.device_type_key || "").toUpperCase() !== "RACK").length;
  }, [popDevices]);

  const popOdpCount = useMemo(() => {
    return popDevices.filter((d) => String(d.device_type_key || "").toUpperCase() === "ODP").length;
  }, [popDevices]);

  const popTotalPorts = useMemo(() => {
    return popDevices.reduce((sum, d) => sum + (Number(d.total_ports) || 0), 0);
  }, [popDevices]);

  useEffect(() => {
    if (category?.resource !== "devices" || !form.project_id) return;
    const selectedProject = projectOptions.find((project) => project.id === form.project_id);
    if (!selectedProject) return;
    const regionMismatch = form.region_id && selectedProject.region_id && selectedProject.region_id !== form.region_id;
    const popMismatch = form.pop_id && selectedProject.pop_id && selectedProject.pop_id !== form.pop_id;
    if (regionMismatch || popMismatch) {
      setForm((previous) => ({ ...previous, project_id: "" }));
    }
  }, [category?.resource, form.project_id, form.region_id, form.pop_id, projectOptions]);

  const [odpValidations, setOdpValidations] = useState<OdpValidationRecord[]>([]);
  const [loadingOdpValidations, setLoadingOdpValidations] = useState(false);
  const [odpCoreChainSummary, setOdpCoreChainSummary] = useState<OdpCoreChainSummary | null>(null);
  const [loadingOdpCoreChainSummary, setLoadingOdpCoreChainSummary] = useState(false);
  const [odcChainSummary, setOdcChainSummary] = useState<Parameters<typeof OdcCoreChainSummarySection>[0]["chainSummary"] | null>(null);
  const [loadingOdcChainSummary, setLoadingOdcChainSummary] = useState(false);
  const [otbChainSummary, setOtbChainSummary] = useState<Parameters<typeof OtbCoreChainSummarySection>[0]["chainSummary"] | null>(null);
  const [loadingOtbChainSummary, setLoadingOtbChainSummary] = useState(false);
    // ── Fase 2b — Port Tray Drawer State ──
  const [trayDrawerOpen, setTrayDrawerOpen] = useState(false);
  const [traySelectedPort, setTraySelectedPort] = useState<DevicePort | null>(null);
  const [trayDirection, setTrayDirection] = useState<"front" | "rear">("front");
  const [trayPeerDevices, setTrayPeerDevices] = useState<{ value: string; label: string }[]>([]);
  const [trayPeerDeviceValue, setTrayPeerDeviceValue] = useState("");
  const [trayPeerPorts, setTrayPeerPorts] = useState<{ value: string; label: string }[]>([]);
  const [trayPeerPortValue, setTrayPeerPortValue] = useState("");
  const [trayAssignLoading, setTrayAssignLoading] = useState(false);
const [creatingDraftLink, setCreatingDraftLink] = useState(false);
  const [servicePortRelations, setServicePortRelations] = useState<ServicePortRelation[]>([]);
  const [loadingServicePortRelations, setLoadingServicePortRelations] = useState(false);
  const [submittingOdpValidation, setSubmittingOdpValidation] = useState(false);
  const [odpValidationDraft, setOdpValidationDraft] = useState<OdpValidationDraft>({
    physical_ok: true,
    splitter_ok: true,
    port_mapping_ok: true,
    qr_label_ok: true,
    label_ok: true,
    status: "valid",
    findings: "",
    evidenceFile: null,
  });

  const canEditAsset = me.role === "admin" || me.role === "user_all_region";
  const canOpenTopology = me.role === "admin" || me.role === "user_all_region";
  const canOpenAsBuilt = me.role === "admin" || me.role === "user_all_region";
  const editable = canEditAsset && (category?.resource === "pops" || category?.resource === "devices" || category?.resource === "customers");
  const currentDeviceTypeKey = valueOf(item?.device_type_key).toUpperCase();
  const selectedDeviceTypeMaster = deviceTypeMasters.find((d) => d.device_type_key === currentDeviceTypeKey) || null;
  const resolvedLayoutType = selectedDeviceTypeMaster?.layout_type || (
    currentDeviceTypeKey === "OTB" ? "tray" :
    currentDeviceTypeKey === "ODC" ? "tube" :
    currentDeviceTypeKey === "JC" ? "tube" :
    currentDeviceTypeKey === "CABLE" ? "core_grid" :
    currentDeviceTypeKey === "ODP" ? "odp_operations" :
    currentDeviceTypeKey === "OLT" ? "olt_slot" :
    currentDeviceTypeKey === "SWITCH" ? "switch_grid" :
    currentDeviceTypeKey === "ONT" ? "summary_only" :
    "summary_only"
  );
  const isOdpDevice = category?.resource === "devices" && currentDeviceTypeKey === "ODP";
  const isOdcDevice = category?.resource === "devices" && currentDeviceTypeKey === "ODC";
  const isOtbDevice = category?.resource === "devices" && currentDeviceTypeKey === "OTB";
  const isOntDevice = category?.resource === "devices" && currentDeviceTypeKey === "ONT";
  const isJcDevice = category?.resource === "devices" && currentDeviceTypeKey === "JC";
  const isOltDevice = category?.resource === "devices" && currentDeviceTypeKey === "OLT";
  const isSwitchDevice = category?.resource === "devices" && currentDeviceTypeKey === "SWITCH";
  const isCableDevice = category?.resource === "devices" && currentDeviceTypeKey === "CABLE";
  const showPortTray = ["tray", "tube", "core_grid"].includes(resolvedLayoutType);
  const showServicePortRelations = category?.resource === "customers" || isOntDevice;
  const backToListHref = category
    ? `/data-management/list/${category.slug}${queryString ? `?${queryString}` : ""}`
    : "/data-management";
  const topologyHref = useMemo(() => {
    if (!category || !item) return "/data-management/topology";
    const params = new URLSearchParams();
    const regionId = valueOf(item.region_id);
    if (regionId) params.set("region_id", regionId);
    if (category.resource === "devices") params.set("start_device_id", item.id);
    const query = params.toString();
    return `/data-management/topology${query ? `?${query}` : ""}`;
  }, [category, item]);
  const topologyConnectionHref = useMemo(() => {
    if (!category || !item) return "/data-management/topology?tool=connection";
    const params = new URLSearchParams();
    const regionId = valueOf(item.region_id);
    if (regionId) params.set("region_id", regionId);
    if (category.resource === "devices") params.set("start_device_id", item.id);
    params.set("tool", "connection");
    const query = params.toString();
    return `/data-management/topology${query ? `?${query}` : ""}`;
  }, [category, item]);
  const asBuiltHref = useMemo(() => {
    if (!category || !item) return "/data-management/as-built";
    const params = new URLSearchParams();
    const regionId = valueOf(item.region_id);
    if (regionId) params.set("region_id", regionId);
    if (category.resource === "devices") params.set("start_device_id", item.id);
    const query = params.toString();
    return `/data-management/as-built${query ? `?${query}` : ""}`;
  }, [category, item]);
  const deviceDirectHref = useMemo(() => {
    if (!category || !item) return "";
    return buildDeviceQrHref({
      appBaseUrl: APP_BASE_URL,
      categorySlug: category.slug,
      deviceId: item.id,
      deviceTypeKey: isOdpDevice ? "ODP" : valueOf(item.device_type_key),
    });
  }, [category, isOdpDevice, item]);

  useEffect(() => {
    if (!category || !id) return;
    const activeCategory = category;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await apiFetch<{ data: GenericItem }>(`/${activeCategory.resource}/${id}`, { token });
        if (cancelled) return;
        setItem(result.data);
        setForm(buildEditableForm(result.data, activeCategory.resource));
        setNewImageFiles([]);
        setAttachmentNames({});
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || t("detailPage.msg.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [category, id, token]);

  useEffect(() => {
    if (!token || category?.resource !== "projects" || !item?.id) {
      setProjectAssets([]);
      setProjectRoutes([]);
      setProjectAsBuiltDocuments([]);
      setProjectCoreRelations([]);
      setProjectRelationDevices([]);
      setLoadingProjectAssets(false);
      return;
    }

    const projectId = item.id;
    const regionId = valueOf(item.region_id);
    const popId = valueOf(item.pop_id);
    const deviceParams = new URLSearchParams({ page: "1", limit: "500", project_id: projectId });
    const routeParams = new URLSearchParams({ page: "1", limit: "100", project_id: projectId });
    const documentParams = new URLSearchParams({ page: "1", limit: "100", project_id: projectId });
    const coreRelationParams = new URLSearchParams({ page: "1", limit: "200", project_id: projectId });
    const relationDeviceParams = new URLSearchParams({ page: "1", limit: "500" });
    if (regionId) {
      deviceParams.set("region_id", regionId);
      routeParams.set("region_id", regionId);
      documentParams.set("region_id", regionId);
      coreRelationParams.set("region_id", regionId);
      relationDeviceParams.set("region_id", regionId);
    }
    if (popId) {
      deviceParams.set("pop_id", popId);
      routeParams.set("pop_id", popId);
      coreRelationParams.set("pop_id", popId);
      relationDeviceParams.set("pop_id", popId);
    }
    let cancelled = false;

    async function loadProjectAssets() {
      setLoadingProjectAssets(true);
      try {
        const [assetResult, routeResult, documentResult, coreRelationResult, relationDeviceResult] = await Promise.all([
          apiFetch<PaginatedResponse<ProjectAssetItem>>(`/devices?${deviceParams.toString()}`, { token }),
          apiFetch<PaginatedResponse<ProjectRouteItem>>(`/routes?${routeParams.toString()}`, { token }),
          apiFetch<PaginatedResponse<ProjectAsBuiltDocumentItem>>(`/asBuiltDocuments?${documentParams.toString()}`, { token }),
          apiFetch<PaginatedResponse<ProjectCoreRelationItem>>(`/coreManagement?${coreRelationParams.toString()}`, { token }),
          apiFetch<PaginatedResponse<ProjectAssetItem>>(`/devices?${relationDeviceParams.toString()}`, { token }),
        ]);
        if (!cancelled) {
          setProjectAssets(assetResult.data || []);
          setProjectRoutes(routeResult.data || []);
          setProjectAsBuiltDocuments(documentResult.data || []);
          setProjectCoreRelations(coreRelationResult.data || []);
          setProjectRelationDevices(relationDeviceResult.data || []);
        }
      } catch {
        if (!cancelled) {
          setProjectAssets([]);
          setProjectRoutes([]);
          setProjectAsBuiltDocuments([]);
          setProjectCoreRelations([]);
          setProjectRelationDevices([]);
        }
      } finally {
        if (!cancelled) setLoadingProjectAssets(false);
      }
    }

    void loadProjectAssets();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, item?.pop_id, item?.region_id, token]);

  const title = useMemo(() => {
    if (!item || !category) return "Detail";
    if (category.resource === "pops") {
      const popName = valueOf(item.pop_name, "POP");
      const popCode = valueOf(item.pop_code);
      return popCode ? `${popName} (${popCode})` : popName;
    }
    if (category.resource === "customers") {
      const custName = valueOf(item.customer_name || item.name, "Customer");
      const cid = valueOf(item.customer_number || item.customer_code);
      return cid ? `${custName} (${cid})` : custName;
    }
    if (category.resource === "devices") {
      return `${valueOf(item.device_name)} (${valueOf(item.device_id)})`;
    }
    return `Detail ${category.label}`;
  }, [item, category]);

  const infoImageAttachments = useMemo(
    () => extractImageAttachments(item?.image_attachments, valueOf(item?.image_attachment_id), valueOf(item?.created_at)),
    [item],
  );
  const galleryImageAttachments = useMemo<AttachmentRef[]>(
    () => mergeAttachmentRefs([
      ...infoImageAttachments,
      ...odpValidations.filter(isFinalValidationRecord).flatMap(extractValidationEvidenceAttachments),
    ]),
    [infoImageAttachments, odpValidations],
  );
  const galleryAttachmentIdsKey = useMemo(
    () => galleryImageAttachments.map((a) => a.id).join(","),
    [galleryImageAttachments],
  );
  const latestOdpValidation = useMemo(
    () => (odpValidations || [])[0] || null,
    [odpValidations],
  );
  const latestApprovedOdpValidation = useMemo(
    () => (odpValidations || []).find(isFinalValidationRecord) || null,
    [odpValidations],
  );
  const detailValidationStatus = useMemo(
    () => item
      ? getEffectiveDeviceValidationStatus(item, latestOdpValidation?.request_status, Boolean(latestApprovedOdpValidation))
      : "unvalidated",
    [item, latestApprovedOdpValidation, latestOdpValidation],
  );

  useEffect(() => {
    if (!message) return;
    setSuccessDialogText(message);
    setSuccessDialogOpen(true);
  }, [message]);

  useEffect(() => {
    const urls = newImageFiles.map((file) => URL.createObjectURL(file));
    setNewImagePreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImageFiles]);

  useEffect(() => {
    if (!token || galleryImageAttachments.length === 0) {
      setImagePreviewUrls({});
      setAttachmentNames({});
      setLoadingImagePreviews(false);
      return;
    }

    let cancelled = false;

    async function loadImagePreviews() {
      setLoadingImagePreviews(true);
      const nextMap: Record<string, string> = {};
      const nextNames: Record<string, string> = {};

      for (const attachment of galleryImageAttachments) {
        if (!attachment.id) continue;
        const attId = attachment.id;
        nextNames[attId] = attachment.name || attId;

        if (attachmentUrlCache.has(attId)) {
          nextMap[attId] = attachmentUrlCache.get(attId)!;
          continue;
        }
        if (failedAttachmentCache.has(attId)) {
          continue;
        }

        try {
          const result = await fetchAttachmentBlob(attId, token, "preview");
          if (result?.blob) {
            const url = URL.createObjectURL(result.blob);
            attachmentUrlCache.set(attId, url);
            nextMap[attId] = url;
            if (result.filename) {
              nextNames[attId] = result.filename;
            }
          } else {
            failedAttachmentCache.add(attId);
          }
        } catch {
          // Legacy or missing attachment in storage: cache failure to avoid repeated requests
          failedAttachmentCache.add(attId);
        }
      }

      if (cancelled) return;
      setImagePreviewUrls(nextMap);
      setAttachmentNames(nextNames);
      setLoadingImagePreviews(false);
    }

    void loadImagePreviews();
    return () => {
      cancelled = true;
    };
  }, [galleryAttachmentIdsKey, token]);

  useEffect(() => {
    if (!item || !category || !token) {
      setRelationLabels({});
      setRelationLabelsLoading(false);
      return;
    }

    const activeCategory = category;
    const activeItem = item;
    let cancelled = false;

    async function loadRelationLabels() {
      setRelationLabelsLoading(true);
      const labels: RelationLabels = {};
      try {
        if (activeCategory.resource === "devices") {
          const embeddedRegion = getRelationRecord(activeItem.region);
          const embeddedPop = getRelationRecord(activeItem.pop);
          const embeddedProject = getRelationRecord(activeItem.project);
          const embeddedManufacturer = getRelationRecord(activeItem.manufacturer);
          const embeddedBrand = getRelationRecord(activeItem.brand);
          const embeddedModel = getRelationRecord(activeItem.model);
          const embeddedTenant = getRelationRecord(activeItem.tenant);
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const referencePop = relationReferenceMaps.pops.get(valueOf(activeItem.pop_id));
          const referenceProject = relationReferenceMaps.projects.get(valueOf(activeItem.project_id));
          const referenceManufacturer = relationReferenceMaps.manufacturers.get(valueOf(activeItem.manufacturer_id));
          const referenceBrand = relationReferenceMaps.brands.get(valueOf(activeItem.brand_id));
          const referenceModel = relationReferenceMaps.models.get(valueOf(activeItem.model_id));
          const referenceTenant = relationReferenceMaps.tenants.get(valueOf(activeItem.tenant_id));

          labels.region = valueOf(embeddedRegion?.region_name || referenceRegion?.region_name);
          labels.regionCode = valueOf(embeddedRegion?.region_code || referenceRegion?.region_code);
          labels.pop = valueOf(embeddedPop?.pop_name || referencePop?.pop_name);
          labels.popCode = valueOf(embeddedPop?.pop_code || referencePop?.pop_code);
          labels.project = valueOf(embeddedProject?.project_name || referenceProject?.project_name);
          labels.manufacturer = valueOf(embeddedManufacturer?.manufacturer_name || referenceManufacturer?.manufacturer_name);
          labels.brand = valueOf(embeddedBrand?.brand_name || referenceBrand?.brand_name);
          labels.model = valueOf(embeddedModel?.model_name || referenceModel?.model_name);
          labels.tenant = valueOf(embeddedTenant?.tenant_name || referenceTenant?.tenant_name);
        }

        if (activeCategory.resource === "pops") {
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const [popType, province, city] = await Promise.all([
            valueOf(activeItem.pop_type_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/popTypes/${valueOf(activeItem.pop_type_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.province_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/provinces/${valueOf(activeItem.province_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.city_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/cities/${valueOf(activeItem.city_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
          ]);

          labels.region = valueOf(referenceRegion?.region_name);
          labels.popType = popType ? valueOf(popType.data.pop_type_name) : valueOf(activeItem.pop_type);
          labels.province = province ? valueOf(province.data.province_name) : valueOf(activeItem.province);
          labels.city = city ? valueOf(city.data.city_name) : valueOf(activeItem.city);
        }

        if (activeCategory.resource === "customers") {
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const referencePop = relationReferenceMaps.pops.get(valueOf(activeItem.pop_id));
          const referenceProject = relationReferenceMaps.projects.get(valueOf(activeItem.project_id));
          const referenceServiceType = relationReferenceMaps.serviceTypes.get(valueOf(activeItem.service_type_id));
          const [province, city] = await Promise.all([
            valueOf(activeItem.province_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/provinces/${valueOf(activeItem.province_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.city_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/cities/${valueOf(activeItem.city_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
          ]);

          labels.region = valueOf(referenceRegion?.region_name);
          labels.pop = valueOf(referencePop?.pop_name);
          labels.popCode = valueOf(referencePop?.pop_code);
          labels.project = valueOf(referenceProject?.project_name);
          labels.province = province ? valueOf(province.data.province_name) : valueOf(activeItem.province);
          labels.city = city ? valueOf(city.data.city_name) : valueOf(activeItem.city);
          labels.serviceType = valueOf(referenceServiceType?.service_type_name || activeItem.service_type);
        }

        if (activeCategory.resource === "projects") {
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const referencePop = relationReferenceMaps.pops.get(valueOf(activeItem.pop_id));
          labels.region = valueOf(referenceRegion?.region_name || referenceRegion?.region_code);
          labels.pop = valueOf(referencePop?.pop_name || referencePop?.pop_code);
          labels.popCode = valueOf(referencePop?.pop_code);
        }

        if (activeCategory.resource === "routes") {
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const referencePop = relationReferenceMaps.pops.get(valueOf(activeItem.pop_id));
          const referenceProject = relationReferenceMaps.projects.get(valueOf(activeItem.project_id));
          const startDevice = valueOf(activeItem.start_asset_id)
            ? apiFetch<{ data: Record<string, unknown> }>(`/devices/${valueOf(activeItem.start_asset_id)}`, { token }).catch(() => null)
            : Promise.resolve(null);
          const endDevice = valueOf(activeItem.end_asset_id)
            ? apiFetch<{ data: Record<string, unknown> }>(`/devices/${valueOf(activeItem.end_asset_id)}`, { token }).catch(() => null)
            : Promise.resolve(null);
          const [start, end] = await Promise.all([startDevice, endDevice]);

          labels.region = valueOf(referenceRegion?.region_name || referenceRegion?.region_code);
          labels.pop = valueOf(referencePop?.pop_name || referencePop?.pop_code);
          labels.popCode = valueOf(referencePop?.pop_code);
          labels.project = valueOf(referenceProject?.project_name || referenceProject?.project_code);
          labels.startAsset = start ? formatDeviceRelationLabel(start.data) : "";
          labels.endAsset = end ? formatDeviceRelationLabel(end.data) : "";
        }
      } finally {
        if (!cancelled) {
          setRelationLabels(labels);
          setRelationLabelsLoading(relationReferenceQuery.isFetching);
        }
      }
    }

    void loadRelationLabels();
    return () => {
      cancelled = true;
    };
  }, [item, category, token, relationReferenceMaps, relationReferenceQuery.isFetching]);

  useEffect(() => {
    if (!token) {
      setSplitterProfiles([]);
      setDeviceTypeMasters([]);
      setTopologyRelationRules([]);
      setOdpTypes([]);
      setInstallationTypes([]);
      setTenants([]);
      return;
    }
    let cancelled = false;
    async function loadDeviceMasterData() {
      try {
        const [splitterResponse, deviceTypesResponse, topologyRelationRulesResponse, odpTypesResponse, installationTypesResponse, tenantsResponse, deviceCoreCapacitiesResponse, closureTypesResponse, cableTypesResponse, routeTypesResponse, provincesResponse, citiesResponse, coreCapacitiesResponse, popTypesResponse] = await Promise.allSettled([
          apiFetch<PaginatedResponse<SplitterProfileOption>>("/splitterProfiles?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<DeviceTypeMasterOption>>("/deviceTypes?page=1&limit=300&is_active=true", { token }),
          apiFetch<PaginatedResponse<TopologyRelationRuleOption>>("/topologyRelationRules?page=1&limit=500&is_active=true", { token }),
          apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<TenantOption>>("/tenants?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>("/deviceCoreCapacities?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; closure_type_name: string; closure_type_code?: string | null; max_core_capacity?: number | null; max_splice_capacity?: number | null; supports_pass_through?: boolean | null; supports_branching?: boolean | null }>>("/closureTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string; core_count?: number | null }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; route_type_code?: string | null; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<ProvinceOption>>("/provinces?page=1&limit=200", { token }),
          apiFetch<PaginatedResponse<CityOption>>("/cities?page=1&limit=500", { token }),
          apiFetch<PaginatedResponse<{ core_capacity_value: number; label: string; allowed_route_type_keys?: string[] | null }>>("/coreCapacities?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; pop_type_name: string; pop_type_code?: string | null }>>("/popTypes?page=1&limit=200&is_active=true", { token }),
        ]);
        if (cancelled) return;
        setSplitterProfiles(splitterResponse.status === "fulfilled" ? splitterResponse.value.data || [] : []);
        setDeviceTypeMasters(deviceTypesResponse.status === "fulfilled" ? deviceTypesResponse.value.data || [] : []);
        setTopologyRelationRules(topologyRelationRulesResponse.status === "fulfilled" ? topologyRelationRulesResponse.value.data || [] : []);
        setOdpTypes(odpTypesResponse.status === "fulfilled" ? odpTypesResponse.value.data || [] : []);
        setInstallationTypes(installationTypesResponse.status === "fulfilled" ? installationTypesResponse.value.data || [] : []);
        setTenants(tenantsResponse.status === "fulfilled" ? tenantsResponse.value.data || [] : []);
        setDeviceCoreCapacities(deviceCoreCapacitiesResponse.status === "fulfilled" ? deviceCoreCapacitiesResponse.value.data || [] : []);
        setClosureTypes(closureTypesResponse.status === "fulfilled" ? closureTypesResponse.value.data || [] : []);
        setCableTypes(cableTypesResponse.status === "fulfilled" ? cableTypesResponse.value.data || [] : []);
        setRouteTypes(routeTypesResponse.status === "fulfilled" ? routeTypesResponse.value.data || [] : []);
        setProvinces(provincesResponse.status === "fulfilled" ? provincesResponse.value.data || [] : []);
        setCities(citiesResponse.status === "fulfilled" ? citiesResponse.value.data || [] : []);
        setCoreCapacities(coreCapacitiesResponse.status === "fulfilled" ? coreCapacitiesResponse.value.data || [] : []);
        setPopTypes(popTypesResponse?.status === "fulfilled" ? popTypesResponse.value.data || [] : []);
      } catch {
        if (cancelled) return;
        setSplitterProfiles([]);
        setOdpTypes([]);
        setInstallationTypes([]);
        setTenants([]);
      }
    }
    void loadDeviceMasterData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (category?.resource !== "devices" || !item || !token) {
      setOdpPorts([]);
      setDevicePortConnections([]);
      setDeviceTopologySummary(null);
      setLoadingOdpPorts(false);
      return;
    }

    const activeItem = item;
    let cancelled = false;

    async function loadPorts() {
      setLoadingOdpPorts(true);
      try {
        const result = await apiFetch<{ data: DeviceTopologySummary }>(
          `/topology/devices/${encodeURIComponent(activeItem.id)}/summary?limit=200`,
          { token },
        );
        if (cancelled) return;
        const summary: DeviceTopologySummary = result.data || {};
        const sortedPorts = (summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index));
        setOdpPorts(sortedPorts);
        setDevicePortConnections(summary.connections?.items || []);
        setDeviceTopologySummary(summary);
        if (valueOf(activeItem.device_type_key).toUpperCase() === "ODC") {
          const upConn = summary.odc_relations?.upstream?.[0];
          setForm((prev) => ({
            ...prev,
            upstream_device_id: upConn?.peer_device?.id || "",
            upstream_cable_id: upConn?.cable_device?.id || "",
            upstream_core_start: upConn?.core_start != null ? String(upConn.core_start) : "",
            upstream_core_end: upConn?.core_end != null ? String(upConn.core_end) : "",
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setOdpPorts([]);
          setDevicePortConnections([]);
          setDeviceTopologySummary(null);
          setError((err as Error).message || t("detailPage.msg.loadTopologyFailed"));
        }
      } finally {
        if (!cancelled) setLoadingOdpPorts(false);
      }
    }

    void loadPorts();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item, token]);

  useEffect(() => {
    if (category?.resource !== "devices" || !item || !token) {
      setPopOptions([]);
      return;
    }

    const activeRegionId = valueOf(item.region_id);
    const regionQuery = activeRegionId ? `&region_id=${encodeURIComponent(activeRegionId)}` : "";
    let cancelled = false;

    async function loadPopOptions() {
      try {
        const result = await apiFetch<PaginatedResponse<PopLookupOption>>(`/pops?page=1&limit=500${regionQuery}`, { token });
        if (!cancelled) setPopOptions(result.data || []);
      } catch {
        if (!cancelled) setPopOptions([]);
      }
    }

    void loadPopOptions();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item, token]);
  // ── Auto-fill location from POP when POP changes in edit mode ──────────
  const prevPopIdRef = useRef(form.pop_id);

  useEffect(() => {
    if (!isEditing) {
      prevPopIdRef.current = form.pop_id;
      return;
    }

    const prevPopId = prevPopIdRef.current;
    prevPopIdRef.current = form.pop_id;

    // Only auto-fill when POP actually changes (not on initial mount)
    if (prevPopId === form.pop_id || !form.pop_id) return;

    const selectedPop = popOptions.find((p) => p.id === form.pop_id);
    if (!selectedPop) return;

    setForm((prev) => ({
      ...prev,
      address: selectedPop.address || prev.address,
      city: selectedPop.city || prev.city,
      city_id: selectedPop.city_id || prev.city_id,
      province: selectedPop.province || prev.province,
      province_id: selectedPop.province_id || prev.province_id,
      longitude: selectedPop.longitude != null ? String(selectedPop.longitude) : prev.longitude,
      latitude: selectedPop.latitude != null ? String(selectedPop.latitude) : prev.latitude,
    }));
  }, [form.pop_id, isEditing, popOptions]);


  // ── Bersihkan fetch lookups topologi yang tidak lagi digunakan ──
  useEffect(() => {
    setOdpCustomers([]);
    setOdpOntDevices([]);
    setOdpCableDevices([]);
    setLoadingOdpLookups(false);
  }, []);

  useEffect(() => {
    setTopologyLookupData(emptyTopologyLookup());
  }, []);

  useEffect(() => {
    if (category?.resource !== "pops" || !item?.id || !token) {
      setPopDevices([]);
      return;
    }
    const popItemId = item.id;
    let cancelled = false;
    async function loadPopDevices() {
      setLoadingPopDevices(true);
      try {
        const res = await apiFetch<PaginatedResponse<GenericItem>>(
          `/devices?page=1&limit=500&pop_id=${encodeURIComponent(popItemId)}`,
          { token }
        );
        if (!cancelled) {
          const rows = res.data || [];
          setPopDevices(rows);
          const racks = rows.filter((d) => d.device_type_key === "RACK");
          if (racks.length > 0) {
            setSelectedPopRackId((prev) => (prev && racks.some((r) => r.id === prev) ? prev : racks[0].id));
          }
        }
      } catch {
        if (!cancelled) setPopDevices([]);
      } finally {
        if (!cancelled) setLoadingPopDevices(false);
      }
    }
    void loadPopDevices();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, token]);

  // ── Fetch customer summary untuk POP saat ini ──
  useEffect(() => {
    if (category?.resource !== "pops" || !item?.id || !token) {
      setPopCustomerTotal(0);
      setPopCustomerStatusBreakdown([]);
      return;
    }
    const popItemId = item.id;
    let cancelled = false;
    async function loadPopCustomerSummary() {
      setLoadingPopCustomerSummary(true);
      try {
        const res = await apiFetch<PaginatedResponse<GenericItem>>(
          `/customers?page=1&limit=1000&pop_id=${encodeURIComponent(popItemId)}`,
          { token }
        );
        if (!cancelled) {
          const rows = res.data || [];
          const statusMap = new Map<string, number>();
          rows.forEach((row) => {
            const st = String((row as Record<string, unknown>).status ?? "unknown");
            statusMap.set(st, (statusMap.get(st) || 0) + 1);
          });
          const breakdown = Array.from(statusMap.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count);
          setPopCustomerTotal(res.meta?.total ?? rows.length);
          setPopCustomerStatusBreakdown(breakdown);
        }
      } catch {
        if (!cancelled) {
          setPopCustomerTotal(0);
          setPopCustomerStatusBreakdown([]);
        }
      } finally {
        if (!cancelled) setLoadingPopCustomerSummary(false);
      }
    }
    void loadPopCustomerSummary();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, token]);

  function handleCreateNewPopRack() {
    setCreateRackDialogOpen(true);
  }

  async function handleCreateNewPopRackSubmit(data: { device_name: string; rack_u_height: number; rack_type: string }) {
    if (!item?.id || !token) return;
    try {
      const newRack = await apiFetch<{ data?: { id?: string } }>("/devices", {
        method: "POST",
        token,
        body: {
          device_name: data.device_name,
          device_type_key: "RACK",
          asset_group: "passive",
          status: "installed",
          region_id: valueOf(item.region_id),
          pop_id: item.id,
          specifications: {
            rack_u_height: data.rack_u_height,
            rack_width_inches: 19,
            rack_type: data.rack_type,
          },
        },
      });
      setMessage(t("detailPage.msg.rackCreated", { name: data.device_name, u: data.rack_u_height }));
      const res = await apiFetch<PaginatedResponse<GenericItem>>(`/devices?page=1&limit=500&pop_id=${encodeURIComponent(item.id)}`, { token });
      setPopDevices(res.data || []);
      if (newRack?.data?.id) setSelectedPopRackId(newRack.data.id);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.rackCreateFailed"));
    }
  }

  function handleEditPopRack(rack: RackOption & { rack_type?: string }) {
    setRackToEdit(rack);
    setEditRackDialogOpen(true);
  }

  async function handleEditPopRackSubmit(data: { device_name: string; rack_u_height: number; rack_type: string }) {
    if (!rackToEdit?.id || !token || !item?.id) return;
    const currentDev = popDevices.find((d) => d.id === rackToEdit.id);
    const specs = (currentDev?.specifications as Record<string, unknown> | undefined) || {};
    try {
      await apiFetch(`/devices/${rackToEdit.id}`, {
        method: "PATCH",
        token,
        body: {
          device_name: data.device_name,
          specifications: {
            ...specs,
            rack_u_height: data.rack_u_height,
            rack_type: data.rack_type,
          },
        },
      });
      setMessage(t("detailPage.msg.rackUpdated", { name: data.device_name }));
      const res = await apiFetch<PaginatedResponse<GenericItem>>(`/devices?page=1&limit=500&pop_id=${encodeURIComponent(item.id)}`, { token });
      setPopDevices(res.data || []);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.rackUpdateFailed"));
    }
  }

  async function handleResetPopRack(rackId: string) {
    if (!token || !item?.id) return;
    const devicesInRack = popDevices.filter(
      (d) => (d.specifications as Record<string, unknown> | undefined)?.rack_device_id === rackId
    );
    if (!devicesInRack.length) {
      return;
    }

    // 1. Instant optimistic UI update
    const previousDevices = [...popDevices];
    setPopDevices((prev) =>
      prev.map((d) => {
        const specs = (d.specifications as Record<string, unknown> | undefined) || {};
        if (specs.rack_device_id === rackId) {
          return {
            ...d,
            specifications: {
              ...specs,
              rack_device_id: null,
              rack_unit_position: null,
            },
          };
        }
        return d;
      })
    );

    // 2. Background server persistence
    try {
      await Promise.all(
        devicesInRack.map((dev) => {
          const specs = (dev.specifications as Record<string, unknown> | undefined) || {};
          return apiFetch(`/devices/${dev.id}`, {
            method: "PATCH",
            token,
            body: {
              specifications: {
                ...specs,
                rack_device_id: null,
                rack_unit_position: null,
              },
            },
          });
        })
      );
    } catch (err) {
      setPopDevices(previousDevices);
      setError((err as Error).message || t("detailPage.msg.rackResetFailed"));
    }
  }

  async function handleDeletePopRack(rackId: string) {
    if (!token || !item?.id) return;
    try {
      // 1. Unmount all devices in rack first
      const devicesInRack = popDevices.filter(
        (d) => (d.specifications as Record<string, unknown> | undefined)?.rack_device_id === rackId
      );
      if (devicesInRack.length) {
        await Promise.all(
          devicesInRack.map((dev) => {
            const specs = (dev.specifications as Record<string, unknown> | undefined) || {};
            return apiFetch(`/devices/${dev.id}`, {
              method: "PATCH",
              token,
              body: {
                specifications: {
                  ...specs,
                  rack_device_id: null,
                  rack_unit_position: null,
                },
              },
            });
          })
        );
      }
      // 2. Delete rack device
      await apiFetch(`/devices/${rackId}`, {
        method: "DELETE",
        token,
      });
      setMessage(t("detailPage.msg.rackDeleted"));
      const res = await apiFetch<PaginatedResponse<GenericItem>>(`/devices?page=1&limit=500&pop_id=${encodeURIComponent(item.id)}`, { token });
      const nextRows = res.data || [];
      setPopDevices(nextRows);
      const remainingRacks = nextRows.filter((d) => d.device_type_key === "RACK");
      setSelectedPopRackId(remainingRacks[0]?.id || "");
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.rackDeleteFailed"));
    }
  }

  async function handleMountPopDevice(deviceId: string, rackId: string, uPos: number, uHeight: number) {
    if (!token || !item?.id) return;
    const targetDev = popDevices.find((d) => d.id === deviceId);
    if (!targetDev || !isRackMountable(targetDev)) {
      setError(t("detailPage.msg.rackOnlyActiveAndOtb"));
      return;
    }
    const specs = (targetDev.specifications as Record<string, unknown> | undefined) || {};
    const updatedSpecs = {
      ...specs,
      rack_device_id: rackId,
      rack_unit_position: uPos,
      u_height: uHeight,
    };

    // 1. Instant optimistic UI update (0ms latency)
    const previousDevices = [...popDevices];
    setPopDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, specifications: updatedSpecs } : d))
    );

    // 2. Background server persistence
    try {
      await apiFetch(`/devices/${deviceId}`, {
        method: "PATCH",
        token,
        body: {
          specifications: updatedSpecs,
        },
      });
    } catch (err) {
      setPopDevices(previousDevices);
      setError((err as Error).message || t("detailPage.msg.rackMountFailed"));
    }
  }

  async function handleUnmountPopDevice(deviceId: string) {
    if (!token || !item?.id) return;
    const targetDev = popDevices.find((d) => d.id === deviceId);
    const specs = (targetDev?.specifications as Record<string, unknown> | undefined) || {};
    const updatedSpecs = {
      ...specs,
      rack_device_id: null,
      rack_unit_position: null,
    };

    // 1. Instant optimistic UI update (0ms latency)
    const previousDevices = [...popDevices];
    setPopDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, specifications: updatedSpecs } : d))
    );

    // 2. Background server persistence
    try {
      await apiFetch(`/devices/${deviceId}`, {
        method: "PATCH",
        token,
        body: {
          specifications: updatedSpecs,
        },
      });
    } catch (err) {
      setPopDevices(previousDevices);
      setError((err as Error).message || t("detailPage.msg.rackUnmountFailed"));
    }
  }

  useEffect(() => {
    if (category?.resource !== "pops" || !item?.id || !token) {
      setPopDocuments([]);
      return;
    }
    const popItemId = item.id;
    const rawSupportDoc = item.support_doc;
    let cancelled = false;

    async function loadPopDocs() {
      setLoadingPopDocuments(true);
      try {
        const res = await apiFetch<PaginatedResponse<GenericItem>>(
          `/attachments?entity_type=pop&entity_id=${encodeURIComponent(popItemId)}&limit=100`,
          { token }
        ).catch(() => null);

        if (cancelled) return;

        const supportDocObj = (rawSupportDoc as Record<string, unknown> | undefined) || {};
        const supportAttachments = Array.isArray(supportDocObj.attachments)
          ? (supportDocObj.attachments as Array<Record<string, unknown>>)
          : Array.isArray(rawSupportDoc)
          ? (rawSupportDoc as Array<Record<string, unknown>>)
          : [];

        const serverAttachments: PopDocumentRef[] = (res?.data || []).map((a) => ({
          id: a.id,
          original_name: String(a.original_name || "Dokumen"),
          mime_type: a.mime_type as string | null | undefined,
          file_category: a.file_category as string | null | undefined,
          size_bytes: a.size_bytes as number | null | undefined,
          created_at: a.created_at as string | null | undefined,
          document_tag: ((a.metadata as Record<string, unknown> | undefined)?.document_tag as string) || null,
        }));

        const docMap = new Map<string, PopDocumentRef>();
        supportAttachments.forEach((doc) => {
          if (doc?.id) {
            docMap.set(String(doc.id), {
              id: String(doc.id),
              original_name: String(doc.original_name || "Dokumen"),
              mime_type: (doc.mime_type as string) || null,
              file_category: (doc.file_category as string) || "document",
              size_bytes: (doc.size_bytes as number) || null,
              document_tag: (doc.document_tag as string) || null,
            });
          }
        });
        serverAttachments.forEach((doc) => {
          if (doc?.id) {
            docMap.set(doc.id, {
              ...docMap.get(doc.id),
              ...doc,
            });
          }
        });

        const docs = Array.from(docMap.values()).filter(
          (d) => d.file_category === "document" || !d.mime_type?.startsWith("image/")
        );
        setPopDocuments(docs);
      } catch {
        if (!cancelled) setPopDocuments([]);
      } finally {
        if (!cancelled) setLoadingPopDocuments(false);
      }
    }

    void loadPopDocs();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, item?.support_doc, token]);

  async function handleUploadPopDocument(file: File, categoryTag: string) {
    if (!token || !item?.id || !category) return;
    try {
      const uploaded = await uploadAttachment({
        token,
        file,
        fileCategory: "document",
        entityType: "pop",
        entityId: item.id,
      });

      const newDoc: PopDocumentRef = {
        id: uploaded.id,
        original_name: uploaded.original_name || file.name,
        mime_type: uploaded.mime_type || file.type,
        file_category: "document",
        size_bytes: uploaded.size_bytes || file.size,
        document_tag: categoryTag,
      };

      const currentSupportDoc = (item.support_doc as Record<string, unknown> | undefined) || {};
      const currentList = Array.isArray(currentSupportDoc.attachments)
        ? (currentSupportDoc.attachments as Array<Record<string, unknown>>)
        : [];
      const nextList = [newDoc, ...currentList];

      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "PATCH",
        token,
        body: {
          support_doc: {
            ...currentSupportDoc,
            attachments: nextList,
          },
        },
      });

      setPopDocuments((prev) => [newDoc, ...prev]);
      setMessage(t("detailPage.msg.docUploaded", { name: file.name }));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.docUploadFailed"));
    }
  }

  async function handleDeletePopDocument(docId: string) {
    if (!token || !item?.id || !category) return;
    try {
      await apiFetch(`/attachments/${docId}`, {
        method: "DELETE",
        token,
      });

      const currentSupportDoc = (item.support_doc as Record<string, unknown> | undefined) || {};
      const currentList = Array.isArray(currentSupportDoc.attachments)
        ? (currentSupportDoc.attachments as Array<Record<string, unknown>>)
        : [];
      const nextList = currentList.filter((d) => d.id !== docId);

      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "PATCH",
        token,
        body: {
          support_doc: {
            ...currentSupportDoc,
            attachments: nextList,
          },
        },
      });

      setPopDocuments((prev) => prev.filter((d) => d.id !== docId));
      setMessage(t("detailPage.msg.docDeleted"));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.docDeleteFailed"));
    }
  }


  useEffect(() => {
    if (category?.resource !== "devices" || !item || !token) {
      setValidatorOptions([]);
      setSelectedReminderValidatorId("");
      setLoadingValidators(false);
      return;
    }

    const regionId = valueOf(item.region_id);
    if (!regionId) {
      setValidatorOptions([]);
      setSelectedReminderValidatorId("");
      return;
    }

    let cancelled = false;
    async function loadValidators() {
      setLoadingValidators(true);
      try {
        const result = await apiFetch<PaginatedResponse<ValidatorOption>>(
          `/users?page=1&limit=200&role_name=user_region&region_id=${encodeURIComponent(regionId)}&is_active=true`,
          { token },
        );
        if (cancelled) return;
        const rows = result.data || [];
        setValidatorOptions(rows);
        setSelectedReminderValidatorId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0]?.id || ""));
      } catch {
        if (!cancelled) {
          setValidatorOptions([]);
          setSelectedReminderValidatorId("");
        }
      } finally {
        if (!cancelled) setLoadingValidators(false);
      }
    }

    void loadValidators();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, valueOf(item?.region_id), token]);

  useEffect(() => {
    if (category?.resource !== "devices" || !item || !token) {
      setOdpValidations([]);
      setLoadingOdpValidations(false);
      return;
    }

    const activeItem = item;
    let cancelled = false;

    async function loadOdpValidations() {
      setLoadingOdpValidations(true);
      try {
        try {
          const requestResult = await apiFetch<{ data: ValidationRequestRecord[] }>(
            `/validation-requests?entity_id=${encodeURIComponent(activeItem.id)}`,
            { token },
          );
          if (cancelled) return;
          const mappedRows: OdpValidationRecord[] = (requestResult.data || [])
            .filter(isFieldValidationRequestRecord)
            .slice(0, 10)
            .map((request) => ({
              id: request.id,
              validation_id: request.request_id || "Validasi",
              entity_type: "device",
              entity_id: activeItem.id,
              validation_type: "field-audit",
              status: mapValidationRequestStatusToFieldStatus(request.current_status),
              request_status: request.current_status || null,
              validated_at: request.updated_at || request.created_at || null,
              findings: request.finding_note || null,
              adminregion_review_note: request.adminregion_review_note || null,
              superadmin_review_note: request.superadmin_review_note || null,
              payload: {
                checklist: request.checklist || {},
                field_validation_type: request.payload_snapshot?.field_validation_type || null,
                general_validation: request.payload_snapshot?.general_validation || {},
                technical_validation: request.payload_snapshot?.technical_validation || {},
                field_inspection: request.payload_snapshot?.field_inspection || {},
                field_validation: request.payload_snapshot?.field_validation || {},
                relation_summary: request.payload_snapshot?.relation_summary || {},
                core_summary: request.payload_snapshot?.core_summary || {},
                port_summary: request.payload_snapshot?.port_summary || {},
                device_ports: request.payload_snapshot?.device_ports || [],
              },
              evidence_attachment_id:
                request.evidence_attachments?.[0]?.id ||
                request.evidence_attachments?.[0]?.attachment_id ||
                null,
              evidence_attachments: request.evidence_attachments || [],
              validator_user_id: request.submitted_by_user_id || null,
              validator_name: request.submitted_by_name || null,
              validator_email: request.submitted_by_email || null,
              validator_user_code: request.submitted_by_user_code || null,
              adminregion_actor_name: request.adminregion_actor_name || null,
              adminregion_actor_email: request.adminregion_actor_email || null,
              adminregion_actor_user_code: request.adminregion_actor_user_code || null,
              adminregion_action_at: request.adminregion_action_at || null,
              superadmin_actor_name: request.superadmin_actor_name || null,
              superadmin_actor_email: request.superadmin_actor_email || null,
              superadmin_actor_user_code: request.superadmin_actor_user_code || null,
              superadmin_action_at: request.superadmin_action_at || null,
              created_at: request.created_at || null,
              updated_at: request.updated_at || null,
            }));
          setOdpValidations(mappedRows);
          return;
        } catch {
          // fallback ke endpoint histori lama
        }

        const legacyResult = await apiFetch<PaginatedResponse<OdpValidationRecord>>(
          `/validations?page=1&limit=10&entity_type=device&entity_id=${encodeURIComponent(activeItem.id)}&validation_type=field-audit`,
          { token },
        );
        if (cancelled) return;
        setOdpValidations(legacyResult.data || []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || t("detailPage.msg.loadValidationHistoryFailed"));
      } finally {
        if (!cancelled) setLoadingOdpValidations(false);
      }
    }

    void loadOdpValidations();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item?.id, token]);

  useEffect(() => {
    if (!isOdpDevice || !item || !token) {
      setOdpCoreChainSummary(null);
      setLoadingOdpCoreChainSummary(false);
      return;
    }

    const deviceId = item.id;
    let cancelled = false;
    async function loadCoreChainSummary() {
      setLoadingOdpCoreChainSummary(true);
      try {
        const result = await apiFetch<{ data: OdpCoreChainSummary }>(`/devices/${deviceId}/core-chain-draft`, { token });
        if (cancelled) return;
        setOdpCoreChainSummary(result.data || null);
      } catch (err) {
        if (cancelled) return;
        setOdpCoreChainSummary(null);
        setError((err as Error).message || t("detailPage.msg.loadOdpChainFailed"));
      } finally {
        if (!cancelled) setLoadingOdpCoreChainSummary(false);
      }
    }

    void loadCoreChainSummary();
    return () => {
      cancelled = true;
    };
  }, [isOdpDevice, item?.id, token]);

  // ── Fetch ODC chain summary ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOdcDevice || !item || !token) {
      setOdcChainSummary(null);
      setLoadingOdcChainSummary(false);
      return;
    }
    const deviceId = item.id;
    let cancelled = false;
    async function loadOdcChainSummary() {
      setLoadingOdcChainSummary(true);
      try {
        const result = await apiFetch<{ data: Parameters<typeof OdcCoreChainSummarySection>[0]["chainSummary"] }>(
          `/devices/${deviceId}/odc-chain-summary`,
          { token },
        );
        if (cancelled) return;
        setOdcChainSummary(result.data || null);
      } catch {
        if (cancelled) return;
        setOdcChainSummary(null);
      } finally {
        if (!cancelled) setLoadingOdcChainSummary(false);
      }
    }
    void loadOdcChainSummary();
    return () => { cancelled = true; };
  }, [isOdcDevice, item, token]);

  // ── Fetch OTB chain summary (dari topology/devices/:id/summary) ───────────
  useEffect(() => {
    if (!isOtbDevice || !item || !token) {
      setOtbChainSummary(null);
      setLoadingOtbChainSummary(false);
      return;
    }
    const deviceId = item.id;
    let cancelled = false;
    async function loadOtbChainSummary() {
      setLoadingOtbChainSummary(true);
      try {
        const result = await apiFetch<{ data: Record<string, unknown> }>(
          `/topology/devices/${deviceId}/summary`,
          { token },
        );
        if (cancelled) return;
        const data = result.data as Record<string, unknown> | null;
        if (data) {
          const dev = (data.device as Record<string, unknown> | null);
          const odcList = (data.odc_list as Array<Record<string, unknown>> | null) || [];
          const conns = (data.connections as { total?: number } | null);
          setOtbChainSummary({
            downstream_odc_count: odcList.length,
            downstream_odp_count: 0,
            total_core_used: Number(dev?.used_core || 0),
            total_core_capacity: Number(dev?.capacity_core || 0),
            is_connected: odcList.length > 0 || Number(conns?.total || 0) > 0,
            odc_list: odcList.map((odc) => ({
              id: String(odc.id || ""),
              device_name: odc.device_name as string | null,
              device_id: odc.device_id as string | null,
              is_chain_complete: Boolean(odc.is_chain_complete),
            })),
          });
        } else {
          setOtbChainSummary(null);
        }
      } catch {
        if (cancelled) return;
        setOtbChainSummary(null);
      } finally {
        if (!cancelled) setLoadingOtbChainSummary(false);
      }
    }
    void loadOtbChainSummary();
    return () => { cancelled = true; };
  }, [isOtbDevice, item, token]);

  useEffect(() => {
    if (!showServicePortRelations || !item || !token) {
      setServicePortRelations([]);
      setLoadingServicePortRelations(false);
      return;
    }

    const activeItem = item;
    const filterKey = category?.resource === "customers" ? "customer_id" : "ont_device_id";
    let cancelled = false;

    async function loadServicePortRelations() {
      setLoadingServicePortRelations(true);
      try {
        const result = await apiFetch<PaginatedResponse<DevicePort>>(
          `/devicePorts?page=1&limit=100&${filterKey}=${encodeURIComponent(activeItem.id)}`,
          { token },
        );
        const ports = result.data || [];
        const deviceIds = Array.from(new Set(ports.map((port) => port.device_id).filter(Boolean))) as string[];
        const deviceEntries = await Promise.all(
          deviceIds.map(async (deviceId) => {
            const device = await apiFetch<{ data: ServicePortRelation["odpDevice"] }>(`/devices/${deviceId}`, { token }).catch(() => null);
            return [deviceId, device?.data || null] as const;
          }),
        );
        if (cancelled) return;
        const deviceMap = new Map(deviceEntries);
        setServicePortRelations(
          ports
            .map((port) => ({ ...port, odpDevice: port.device_id ? deviceMap.get(port.device_id) || null : null }))
            .sort((a, b) => Number(a.port_index) - Number(b.port_index)),
        );
      } catch (err) {
        if (!cancelled) setError((err as Error).message || t("detailPage.msg.loadOdpRelationFailed"));
      } finally {
        if (!cancelled) setLoadingServicePortRelations(false);
      }
    }

    void loadServicePortRelations();
    return () => {
      cancelled = true;
    };
  }, [showServicePortRelations, item, token, category?.resource]);

  useEffect(() => {
    if (!deviceDirectHref) {
      setQrDataUrl("");
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(deviceDirectHref, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [deviceDirectHref]);

  const needsQrLabelSettings = category?.resource === "devices" || category?.resource === "customers";

  useEffect(() => {
    if (!token || !needsQrLabelSettings) {
      setQrLabelLogoDataUrl("");
      setQrLabelFooterText("");
      setQrLabelTemplateStyle("default");
      setQrLabelPatchCordStyle("plain");
      setQrLabelReady(false);
      return;
    }

    let cancelled = false;
    setQrLabelReady(false);
    Promise.all([
      loadQrLabelLogoDataUrl(token).catch(() => ""),
      loadQrLabelSettings(token).catch(() => null),
    ]).then(([logoDataUrl, setting]) => {
      if (cancelled) return;
      setQrLabelLogoDataUrl(logoDataUrl);
      setQrLabelFooterText(setting?.footer_text || "");
      setQrLabelTemplateStyle(setting?.device_template_style || "default");
      setQrLabelPatchCordStyle(setting?.customer_patch_cord_style || "plain");
      setQrLabelReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token, needsQrLabelSettings]);

  async function handleSave() {
    if (!category || !item || !editable) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (category.resource === "pops" || category.resource === "devices" || category.resource === "customers") {
        if (form.latitude || form.longitude) {
          const latitudeValidation = validateCoordinateFormat(form.latitude, "latitude", t);
          if (!latitudeValidation.valid) {
            throw new Error(t("detailPage.msg.invalidLatitude", { message: latitudeValidation.message }));
          }
          const longitudeValidation = validateCoordinateFormat(form.longitude, "longitude", t);
          if (!longitudeValidation.valid) {
            throw new Error(t("detailPage.msg.invalidLongitude", { message: longitudeValidation.message }));
          }
        }
      }

      const payload = buildUpdatePayload(form, category.resource, item) as Record<string, unknown>;

      if (category.resource === "pops" || category.resource === "devices") {
        let mergedImageAttachments = infoImageAttachments.map((attachment) => ({
          id: attachment.id,
          original_name: attachmentNames[attachment.id] || attachment.name || "attachment",
        }));

        if (newImageFiles.length > 0) {
          const uploaded = await Promise.all(
            newImageFiles.map((file) =>
              uploadAttachment({
                token,
                file,
                fileCategory: "image",
                entityType: category.resource === "pops" ? "pop" : "device",
                entityId: item.id,
              }),
            ),
          );
          mergedImageAttachments = [...mergedImageAttachments, ...uploaded.map((img) => ({
            id: img.id,
            original_name: img.original_name,
            mime_type: img.mime_type,
            file_category: img.file_category,
            size_bytes: img.size_bytes,
          }))].slice(0, MAX_IMAGE_ATTACHMENTS);
        }

        payload.image_attachment_id = mergedImageAttachments[0]?.id || null;
        payload.image_attachments = mergedImageAttachments;
      }

      // ODC upstream connection saving (if it changed)
      const isOdcDevice = category.resource === "devices" && valueOf(item.device_type_key).toUpperCase() === "ODC";
      if (isOdcDevice) {
        const existingUpstream = deviceTopologySummary?.odc_relations?.upstream?.[0] || null;
        const currentOtbId = form.upstream_device_id || "";
        const currentCableId = form.upstream_cable_id || "";
        const currentCoreStart = form.upstream_core_start || "";
        const currentCoreEnd = form.upstream_core_end || "";

        const prevOtbId = existingUpstream?.peer_device?.id || "";
        const prevCableId = existingUpstream?.cable_device?.id || "";
        const prevCoreStart = existingUpstream?.core_start != null ? String(existingUpstream.core_start) : "";
        const prevCoreEnd = existingUpstream?.core_end != null ? String(existingUpstream.core_end) : "";

        const hasConnChanged =
          currentOtbId !== prevOtbId ||
          currentCableId !== prevCableId ||
          currentCoreStart !== prevCoreStart ||
          currentCoreEnd !== prevCoreEnd;

        if (hasConnChanged) {
          if (!currentOtbId) {
            // Delete / Archive connection
            if (existingUpstream?.id) {
              await apiFetch(`/topology/port-connections/${existingUpstream.id}`, {
                method: "DELETE",
                token,
              });
            }
          } else {
            // Update or Create connection
            const coreStartNum = currentCoreStart ? Number(currentCoreStart) : null;
            const coreEndNum = currentCoreEnd ? Number(currentCoreEnd) : null;
            const fiberCount = (coreStartNum != null && coreEndNum != null) ? Math.max(0, coreEndNum - coreStartNum + 1) : null;

            if (existingUpstream?.id) {
              // If OTB device has changed, we must find a port on the new OTB
              let fromPortId = existingUpstream.peer_port?.id;
              if (currentOtbId !== prevOtbId) {
                const otbPortsRes = await apiFetch<{ data: DevicePort[] }>(
                  `/devicePorts?page=1&limit=100&device_id=${encodeURIComponent(currentOtbId)}`,
                  { token }
                );
                const otbPorts = otbPortsRes.data || [];
                const otbPort = otbPorts.find(p => p.direction?.toLowerCase() === 'out') || otbPorts[0];
                if (!otbPort) {
                  throw new Error(t("detailPage.msg.otbHasNoPorts"));
                }
                fromPortId = otbPort.id;
              }

              await apiFetch(`/topology/port-connections/${existingUpstream.id}`, {
                method: "PATCH",
                token,
                body: JSON.stringify({
                  from_port_id: fromPortId,
                  cable_device_id: currentCableId || null,
                  core_start: coreStartNum,
                  core_end: coreEndNum,
                  fiber_count: fiberCount,
                }),
              });
            } else {
              // Create new connection
              // Find feeder/input port of ODC
              const odcPort = odpPorts.find(p => p.direction?.toLowerCase() === 'in') || odpPorts[0];
              if (!odcPort) {
                throw new Error(t("detailPage.msg.odcHasNoInputPorts"));
              }

              // Find output/feeder port of OTB
              const otbPortsRes = await apiFetch<{ data: DevicePort[] }>(
                `/devicePorts?page=1&limit=100&device_id=${encodeURIComponent(currentOtbId)}`,
                { token }
              );
              const otbPorts = otbPortsRes.data || [];
              const otbPort = otbPorts.find(p => p.direction?.toLowerCase() === 'out') || otbPorts[0];
              if (!otbPort) {
                throw new Error(t("detailPage.msg.otbHasNoPorts"));
              }

              await apiFetch(`/topology/port-connections`, {
                method: "POST",
                token,
                body: JSON.stringify({
                  region_id: item.region_id,
                  from_port_id: otbPort.id,
                  to_port_id: odcPort.id,
                  connection_type: "feeder",
                  status: "active",
                  cable_device_id: currentCableId || null,
                  core_start: coreStartNum,
                  core_end: coreEndNum,
                  fiber_count: fiberCount,
                }),
              });
            }
          }
        }
      }

      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      setMessage(t("detailPage.msg.saved"));
      setIsEditing(false);
      setNewImageFiles([]);
      const refreshed = await apiFetch<{ data: GenericItem }>(`/${category.resource}/${item.id}`, { token });
      setItem(refreshed.data);

      let finalSummary = deviceTopologySummary;
      if (category.resource === "devices") {
        const topoResult = await apiFetch<{ data: DeviceTopologySummary }>(
          `/topology/devices/${encodeURIComponent(refreshed.data.id)}/summary?limit=200`,
          { token }
        );
        finalSummary = topoResult.data || null;
        const sortedPorts = (finalSummary?.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index));
        setOdpPorts(sortedPorts);
        setDevicePortConnections(finalSummary?.connections?.items || []);
        setDeviceTopologySummary(finalSummary);

        if (isOdcDevice) {
          setLoadingOdcChainSummary(true);
          try {
            const odcResult = await apiFetch<{ data: Parameters<typeof OdcCoreChainSummarySection>[0]["chainSummary"] }>(`/devices/${refreshed.data.id}/odc-chain-summary`, { token });
            setOdcChainSummary(odcResult.data || null);
          } catch {} finally {
            setLoadingOdcChainSummary(false);
          }
        }
      }

      setForm(buildEditableForm(refreshed.data, category.resource, finalSummary));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function openGalleryAt(index: number) {
    setGalleryIndex(index);
    const attachment = galleryImageAttachments[index];
    if (attachment) {
      setRenamingAttachmentId(attachment.id);
      setRenameDraft(attachmentNames[attachment.id] || attachment.name || "");
    }
    setGalleryOpen(true);
  }

  function handlePrevImage() {
    setGalleryIndex((prev) => {
      const total = galleryImageAttachments.length;
      if (total <= 1) return 0;
      const nextIndex = (prev - 1 + total) % total;
      const att = galleryImageAttachments[nextIndex];
      if (att) {
        setRenamingAttachmentId(att.id);
        setRenameDraft(attachmentNames[att.id] || att.name || "");
      }
      return nextIndex;
    });
  }

  function handleNextImage() {
    setGalleryIndex((prev) => {
      const total = galleryImageAttachments.length;
      if (total <= 1) return 0;
      const nextIndex = (prev + 1) % total;
      const att = galleryImageAttachments[nextIndex];
      if (att) {
        setRenamingAttachmentId(att.id);
        setRenameDraft(attachmentNames[att.id] || att.name || "");
      }
      return nextIndex;
    });
  }

  useEffect(() => {
    if (!galleryOpen || galleryImageAttachments.length <= 1) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextImage();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryOpen, galleryImageAttachments]);

  function handleNewImageFilesChange(files: FileList | null) {
    const list = Array.from(files || []);
    if (!list.length) {
      setNewImageFiles([]);
      return;
    }
    const existingCount = infoImageAttachments.length;
    if (existingCount + list.length > MAX_IMAGE_ATTACHMENTS) {
      setError(t("detailPage.msg.maxImages", { max: MAX_IMAGE_ATTACHMENTS }));
      return;
    }
    const invalidSize = list.find((file) => file.size > MAX_IMAGE_FILE_SIZE_BYTES);
    if (invalidSize) {
      setError(t("detailPage.msg.imageTooLarge", { name: invalidSize.name }));
      return;
    }
    const invalidType = list.find((file) => !file.type.startsWith("image/"));
    if (invalidType) {
      setError(t("detailPage.msg.imageInvalidType", { name: invalidType.name }));
      return;
    }
    setError("");
    setNewImageFiles((prev) => [...prev, ...list].slice(0, MAX_IMAGE_ATTACHMENTS - infoImageAttachments.length));
  }

  function removeNewImageAt(index: number) {
    setNewImageFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleRenameAttachment() {
    if (!renamingAttachmentId || !token) return;
    const nextName = renameDraft.trim();
    if (!nextName) {
      setError(t("detailPage.msg.fileNameRequired"));
      return;
    }

    setRenaming(true);
    setError("");
    try {
      await apiFetch(`/attachments/${renamingAttachmentId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ original_name: nextName }),
      });
      setAttachmentNames((prev) => ({ ...prev, [renamingAttachmentId]: nextName }));
      setRenamingAttachmentId("");
      setRenameDraft("");
      setMessage(t("detailPage.msg.attachmentRenamed"));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.attachmentRenameFailed"));
    } finally {
      setRenaming(false);
    }
  }

  async function handleProvisionOdpPorts() {
    if (!item || !token) return;
    setProvisioningPorts(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ data: { created_count?: number } }>(`/devices/${item.id}/provision-ports`, {
        method: "POST",
        token,
        body: JSON.stringify({ profile_name: "default" }),
      });
      const created = Number(result.data?.created_count || 0);
      setMessage(created ? t("detailPage.msg.odpPortsGenerated", { count: created }) : t("detailPage.msg.odpPortsAllExist"));
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>(
        `/topology/devices/${encodeURIComponent(item.id)}/summary?limit=200`,
        { token },
      );
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.odpPortsGenerateFailed"));
    } finally {
      setProvisioningPorts(false);
    }
  }

  async function handleUpdateOdpPort(port: DevicePort, changes: Partial<DevicePort>) {
    if (!token) return;
    setUpdatingPortId(port.id);
    setError("");
    setMessage("");
    try {
      if (changes.ont_device_id !== undefined) {
        const newOnt = changes.ont_device_id;
        const newCustomer = changes.customer_id !== undefined ? changes.customer_id : port.customer_id;
        const odpPortId = port.id;
        let result: { data?: { odp_port_id?: string; ont_port_id?: string; ont_device_id?: string | null } };
        if (newOnt) {
          result = await apiFetch<{ data: { odp_port_id: string; ont_port_id: string; ont_device_id: string } }>(
            `/devices/${odpPortId}/assign-ont`,
            {
              method: "POST",
              token,
              body: JSON.stringify({ ont_device_id: newOnt, customer_id: newCustomer || null }),
            },
          );
        } else {
          result = await apiFetch<{ data: { odp_port_id: string; ont_port_id: string; ont_device_id: null } }>(
            `/devices/${odpPortId}/disconnect-ont`,
            { method: "POST", token, body: JSON.stringify({}) },
          );
        }
        const odpPayload: Record<string, unknown> = {};
        if (changes.notes !== undefined) odpPayload.notes = changes.notes || null;
        if (changes.port_label !== undefined) odpPayload.port_label = changes.port_label || null;
        if (changes.occupied_at !== undefined) odpPayload.occupied_at = changes.occupied_at || null;
        if (Object.keys(odpPayload).length > 0) {
          const fallback = await apiFetch<{ data: DevicePort }>(`/devicePorts/${port.id}`, {
            method: "PATCH",
            token,
            body: JSON.stringify(odpPayload),
          });
          if (fallback.data) {
            setOdpPorts((prev) =>
              prev
                .map((item) => (item.id === port.id ? { ...item, ...fallback.data } : item))
                .sort((a, b) => Number(a.port_index) - Number(b.port_index)),
            );
          }
        }
        const refreshed = await apiFetch<{ data: DevicePort }>(`/devicePorts/${port.id}`, { token });
        if (refreshed.data) {
          setOdpPorts((prev) =>
            prev
              .map((item) => (item.id === port.id ? { ...item, ...refreshed.data } : item))
              .sort((a, b) => Number(a.port_index) - Number(b.port_index)),
          );
        }
        setMessage(
          newOnt
            ? t("detailPage.msg.ontAssigned", { port: port.port_label || port.port_index })
            : t("detailPage.msg.ontDisconnected", { port: port.port_label || port.port_index }),
        );
        return;
      }

      const payload: Record<string, unknown> = {};
      if (changes.status !== undefined) payload.status = changes.status;
      if (changes.notes !== undefined) payload.notes = changes.notes || null;
      if (changes.port_label !== undefined) payload.port_label = changes.port_label || null;
      if (changes.customer_id !== undefined) payload.customer_id = changes.customer_id || null;
      if (changes.ont_device_id !== undefined) payload.ont_device_id = changes.ont_device_id || null;
      if (changes.occupied_at !== undefined) payload.occupied_at = changes.occupied_at || null;

      const result = await apiFetch<{ data: DevicePort }>(`/devicePorts/${port.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      setOdpPorts((prev) =>
        prev
          .map((item) => (item.id === port.id ? { ...item, ...result.data } : item))
          .sort((a, b) => Number(a.port_index) - Number(b.port_index)),
      );
      setMessage(t("detailPage.msg.odpPortUpdated", { port: port.port_label || port.port_index }));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.odpPortUpdateFailed"));
    } finally {
      setUpdatingPortId("");
    }
  }

  async function handleArchiveOdpDevice() {
    if (!item || !token || !category) return;
    const ok = window.confirm(t("detailPage.msg.confirmArchiveOdp"));
    if (!ok) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "DELETE",
        token,
      });
      setMessage(t("detailPage.msg.odpArchived"));
      window.setTimeout(() => {
        window.location.href = `/trash?entity_type=${encodeURIComponent(category.resource)}&entity_id=${encodeURIComponent(item.id)}`;
      }, 450);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.odpArchiveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveOdpPort(port: DevicePort) {
    if (!token) return;
    const label = port.port_label || `Port ${port.port_index}`;
    const ok = window.confirm(t("detailPage.msg.confirmArchivePort", { label }));
    if (!ok) return;
    setUpdatingPortId(port.id);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/devicePorts/${port.id}`, {
        method: "DELETE",
        token,
      });
      setOdpPorts((prev) => prev.filter((item) => item.id !== port.id));
      setMessage(t("detailPage.msg.portArchived", { label }));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.portArchiveFailed", { label }));
    } finally {
      setUpdatingPortId("");
    }
  }

  async function handleCreateDraftLink(payload: {
    upstreamPortId: string;
    odpPortId: string;
    cableDeviceId?: string;
    coreStart?: number;
    coreEnd?: number;
    fiberCount?: number;
  }) {
    if (!item || !token) return;
    if (!payload.odpPortId) {
      setError(t("detailPage.msg.selectTargetOdpPort"));
      return;
    }

    setCreatingDraftLink(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ data?: { created?: boolean } }>(`/devices/${item.id}/core-chain-draft-link`, {
        method: "POST",
        token,
        body: JSON.stringify({
          upstream_port_id: payload.upstreamPortId,
          odp_port_id: payload.odpPortId,
          cable_device_id: payload.cableDeviceId || null,
          core_start: payload.coreStart ?? null,
          core_end: payload.coreEnd ?? null,
          fiber_count: payload.fiberCount ?? null,
        }),
      });
      setMessage(result?.data?.created ? t("detailPage.msg.draftLinkCreated") : t("detailPage.msg.draftLinkExists"));

      const refreshed = await apiFetch<{ data: OdpCoreChainSummary }>(`/devices/${item.id}/core-chain-draft`, { token });
      setOdpCoreChainSummary(refreshed.data || null);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.draftLinkFailed"));
    } finally {
      setCreatingDraftLink(false);
    }
  }

  function handleDownloadQrLabel() {
    if (!qrDataUrl || !item) return;
    const qrRelationDisplay = buildDeviceQrRelationDisplay(item, relationLabels);
    const download = async () => {
      const dataUrl = await buildQrLabelPngDataUrl({
        deviceName: valueOf(item.device_name, "-"),
        deviceCode: valueOf(item.device_id, "-"),
        deviceType: valueOf(item.device_type_key, "-"),
        popName: formatQrPopLabel(qrRelationDisplay.popName, qrRelationDisplay.popCode),
        projectName: qrRelationDisplay.projectName,
        tenantName: qrRelationDisplay.tenantName,
        qrDataUrl,
        logoDataUrl: qrLabelLogoDataUrl || undefined,
        footerText: qrLabelFooterText || undefined,
        validationDate: (item.validation_date as string) || (item.last_validation_at as string) || null,
        templateStyle: qrLabelTemplateStyle,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${sanitizeFileName(valueOf(item.device_id, "device"))}-qr-label.png`;
      link.click();
    };

    void download().catch((err) => {
      setError((err as Error).message || t("detailPage.msg.qrDownloadFailed"));
    });
  }

  function openReminderDialog() {
    setReminderError("");
    setReminderDialogOpen(true);
  }

  async function handleSendValidationReminder() {
    if (!item || !selectedReminderValidatorId) {
      setReminderError(t("detailPage.msg.selectValidatorFirst"));
      return;
    }

    setSendingReminder(true);
    setReminderError("");
    setError("");
    setMessage("");
    try {
      await apiFetch("/me/notifications/validation-reminders", {
        method: "POST",
        token,
        body: {
          device_id: item.id,
          validator_user_id: selectedReminderValidatorId,
        },
      });
      setReminderDialogOpen(false);
      setMessage(t("detailPage.msg.reminderSent"));
    } catch (err) {
      setReminderError((err as Error).message || t("detailPage.msg.reminderSendFailed"));
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleDownloadValidationEvidence(record: OdpValidationRecord) {
    if (!record.evidence_attachment_id || !token) return;
    try {
      await downloadAttachmentFile(record.evidence_attachment_id, token);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.evidenceDownloadFailed"));
    }
  }

  async function handleSubmitOdpValidation() {
    if (!item || !token || !category) return;

    setSubmittingOdpValidation(true);
    setError("");
    setMessage("");
    try {
      if (odpValidationDraft.status === "valid") {
        const chain = odpCoreChainSummary
          || (await apiFetch<{ data: OdpCoreChainSummary }>(`/devices/${item.id}/core-chain-draft`, { token })).data;
        if (!chain?.is_complete) {
          throw new Error(t("detailPage.msg.odpChainIncomplete"));
        }
      }

      const now = new Date().toISOString();
      await apiFetch("/validations", {
        method: "POST",
        token,
        body: JSON.stringify({
          entity_type: "device",
          entity_id: item.id,
          validation_type: "field-audit",
          status: odpValidationDraft.status,
          validated_at: now,
          validator_user_id: me.app_user.id,
          findings: odpValidationDraft.findings.trim() || null,
          payload: {
            device_type_key: "ODP",
            port_summary: summarizeOdpPorts(odpPorts, item),
            direct_link: deviceDirectHref,
          },
          tags: ["odp", "field-audit"],
        }),
      });

      setOdpValidationDraft((prev) => ({ ...prev, findings: "" }));
      setMessage(t("detailPage.msg.validationNoteSaved"));
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.validationSaveFailed"));
    } finally {
      setSubmittingOdpValidation(false);
    }
  }

  
  // ── Fase 2b — Port Tray Handlers
  function getActiveRelationRules(deviceTypeKey: string, direction: string) {
    const currentType = String(deviceTypeKey || '').toUpperCase();
    return topologyRelationRules.filter(
      (rule) =>
        String(rule.source_device_type_key || '').toUpperCase() === currentType &&
        String(rule.direction || '').toLowerCase() === direction &&
        rule.is_active !== false,
    );
  }

  function getPeerDeviceTypes(deviceTypeKey: string, direction: string): string[] {
    const relationRuleTypes = getActiveRelationRules(deviceTypeKey, direction)
      .map((rule) => String(rule.allowed_peer_device_type_key || '').toUpperCase())
      .filter(Boolean);

    return Array.from(new Set(relationRuleTypes));
  }

  async function loadPeerDevices(
    port: DevicePort,
    direction: string,
    signal: AbortSignal | undefined,
  ): Promise<Array<{ id: string; device_name?: string | null; device_id?: string | null; project_id?: string | null }>> {
    if (!item || !token) return [];
    const popId = valueOf(item.pop_id);
    const projectId = valueOf(item.project_id);
    const deviceTypeKey = valueOf(item.device_type_key).toUpperCase();
    const rules = getActiveRelationRules(deviceTypeKey, direction);
    if (!rules.length) return [];
    try {
      const promises = rules.map((rule) => {
        const params = new URLSearchParams({ page: "1", limit: "500", status: "active", device_type_key: String(rule.allowed_peer_device_type_key || '').toUpperCase() });
        if (rule.requires_same_pop !== false && popId) {
          params.set("pop_id", popId);
        }
        return apiFetch<{ data: Array<{ id: string; device_name?: string | null; device_id?: string | null; project_id?: string | null }> }>(
          "/devices?" + params.toString(),
          { token }
        ).catch(() => ({ data: [] }));
      });
      const results = await Promise.all(promises);
      if (signal?.aborted) return [];
      const allDevices = results.flatMap((r, index) => {
        const rule = rules[index];
        const rows = r.data || [];
        if (rule.requires_same_project && projectId) {
          return rows.filter((row) => !row.project_id || row.project_id === projectId);
        }
        return rows;
      });
      return Array.from(new Map(allDevices.map((row) => [row.id, row])).values());
    } catch { return []; }
  }

  async function loadPeerPorts(
    deviceId: string,
    signal: AbortSignal | undefined,
  ): Promise<Array<{ id: string; port_label?: string | null; port_index?: number | null }>> {
    if (!token) return [];
    try {
      const result = await apiFetch<{ data: Array<{ id: string; port_label?: string | null; port_index?: number | null }> }>(
        "/devicePorts?page=1&limit=200&device_id=" + encodeURIComponent(deviceId) + "&status=idle", { token }
      );
      if (signal?.aborted) return [];
      return result.data || [];
    } catch { return []; }
  }

  const trayAbortRef = useRef<AbortController | null>(null);

  function handlePortClick(port: DevicePort) {
    if (trayAbortRef.current) trayAbortRef.current.abort();
    const abortController = new AbortController();
    trayAbortRef.current = abortController;

    setTraySelectedPort(port);
    setTrayDirection("front");
    setTrayPeerDeviceValue("");
    setTrayPeerPortValue("");
    setTrayPeerDevices([]);
    setTrayPeerPorts([]);
    setTrayDrawerOpen(true);

    loadPeerDevices(port, "front", abortController.signal).then(devices => {
      if (!abortController.signal.aborted) {
        setTrayPeerDevices(devices.map(d => ({ value: d.id, label: [d.device_name, d.device_id].filter(Boolean).join(" - ") || d.id })));
      }
    });
  }

  function handleTrayPeerDeviceChange(value: string) {
    setTrayPeerDeviceValue(value);
    setTrayPeerPortValue("");
    if (value && value !== "__none__") {
      if (trayAbortRef.current) trayAbortRef.current.abort();
      const abortController = new AbortController();
      trayAbortRef.current = abortController;
      loadPeerPorts(value, abortController.signal).then(ports => {
        if (!abortController.signal.aborted) {
          setTrayPeerPorts(ports.map(p => ({ value: p.id, label: p.port_label || ("Port " + (p.port_index || "?")) })));
        }
      });
    } else {
      setTrayPeerPorts([]);
    }
  }

  function handleTrayPeerPortChange(value: string) {
    setTrayPeerPortValue(value);
  }

  async function handleTrayDirectionChange(direction: "front" | "rear") {
    setTrayDirection(direction);
    setTrayPeerDeviceValue("");
    setTrayPeerPortValue("");
    setTrayPeerDevices([]);
    setTrayPeerPorts([]);

    if (!traySelectedPort) return;
    if (trayAbortRef.current) trayAbortRef.current.abort();
    const abortController = new AbortController();
    trayAbortRef.current = abortController;
    const devices = await loadPeerDevices(traySelectedPort, direction, abortController.signal);
    if (!abortController.signal.aborted) {
      setTrayPeerDevices(devices.map(d => ({ value: d.id, label: [d.device_name, d.device_id].filter(Boolean).join(" - ") || d.id })));
    }
  }

  async function handleAssign() {
    if (!item || !token || !traySelectedPort || !trayPeerDeviceValue || !trayPeerPortValue) return;
    const activeItem = item;
    const activePort = traySelectedPort;
    setTrayAssignLoading(true);
    setError("");
    try {
      const isFront = trayDirection === "front";
      await apiFetch("/portConnections", {
        method: "POST",
        token,
        body: JSON.stringify({
          region_id: activeItem.region_id,
          from_port_id: isFront ? trayPeerPortValue : activePort.id,
          to_port_id: isFront ? activePort.id : trayPeerPortValue,
          connection_type: isFront ? "feeder" : "distribution",
          status: "active",
        }),
      });
      setMessage(t("detailPage.msg.portAssigned"));
      setTrayDrawerOpen(false);
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>("/topology/devices/" + encodeURIComponent(activeItem.id) + "/summary?limit=200", { token });
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
    const message = (err as Error).message || t("detailPage.msg.portAssignFailed");
    const isPortConflict = /already used|not idle|409|conflict/i.test(message);
    setError(isPortConflict ? t("detailPage.msg.portConflict") : message);

    if (isPortConflict && trayPeerDeviceValue && trayPeerDeviceValue !== "__none__") {
      const abortController = new AbortController();
      trayAbortRef.current = abortController;
      loadPeerPorts(trayPeerDeviceValue, abortController.signal).then((ports) => {
        if (!abortController.signal.aborted) {
          setTrayPeerPortValue("");
          setTrayPeerPorts(ports.map((p) => ({ value: p.id, label: p.port_label || `Port ${p.port_index ?? "?"}` })));
        }
      });
    }
  } finally {
      setTrayAssignLoading(false);
    }
  }


  async function handleDisconnect() {
    if (!token || !traySelectedPort || !item) return;
    const activeItem = item;
    const conn = devicePortConnections.find((c) => c.from_port_id === traySelectedPort.id || c.to_port_id === traySelectedPort.id);
    if (!conn) return;
    setTrayAssignLoading(true);
    setError("");
    try {
      await apiFetch("/topology/port-connections/" + conn.id, { method: "DELETE", token });
      setMessage(t("detailPage.msg.portDisconnected"));
      setTrayDrawerOpen(false);
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>("/topology/devices/" + encodeURIComponent(activeItem.id) + "/summary?limit=200", { token });
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
      setError((err as Error).message || t("detailPage.msg.portDisconnectFailed"));
    } finally {
      setTrayAssignLoading(false);
    }
  }
if (!category) {
    return (
    <ScrollArea className="h-full min-h-0 w-full thin-scrollbar">
      <div className="space-y-5 pr-3">
        <DeviceDetailSkeleton categoryLabel="" />
      </div>
    </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full thin-scrollbar">
      <div className="space-y-4 pr-3">
        <DeviceDetailHeader
          categoryLabel={category.label}
          title={title}
          backHref={backToListHref}
          actions={
            <>
              {(category?.resource === "devices" || category?.resource === "pops" || category?.resource === "customers") && item &&
               Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNavModalOpen(true)}
                >
                  {t("detailPage.ui.routeNavigation")}
                </Button>
              ) : null}
              {editable && !isEditing ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  {t("detailPage.ui.editData")}
                </Button>
              ) : null}
            </>
          }
        />

        {loading ? <DeviceDetailSkeleton categoryLabel={category.label} /> : null}
        {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        {!loading && item ? (
          <>
            {category.resource === "devices" ? (
              <div className="space-y-4">
                {editable && isEditing ? (
                  <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs glass-inset">
                    <CardHeader className="p-0 pb-4 border-b border-border/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{t("detailPage.ui.editDeviceTitle")}</CardTitle>
                          <CardDescription className="text-xs">{t("detailPage.ui.editDeviceDesc")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setForm(buildEditableForm(item, category.resource, deviceTopologySummary));
                              setNewImageFiles([]);
                              setIsEditing(false);
                            }}
                            disabled={saving}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                            <Save className="mr-1.5 size-3.5" />
                            {saving ? t("common.saving") : t("detailPage.ui.saveChanges")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                      <DeviceFormSelection
                        form={form}
                        onChange={setForm}
                        editing={isEditing}
                        relationLabels={relationLabels}
                        relationLoading={relationLabelsLoading}
                        deviceTypeKey={valueOf(item?.device_type_key)}
                        splitterProfiles={splitterProfiles}
                        odpTypes={odpTypes}
                        installationTypes={installationTypes}
                        tenants={tenants}
                        popOptions={popOptions}
                        projectOptions={projectOptions}
                        projectHref={buildProjectDetailHref(valueOf(item.project_id), valueOf(item.region_id))}
                        latestFieldValidation={latestApprovedOdpValidation?.payload?.field_validation || null}
                        effectiveValidationStatus={detailValidationStatus}
                        provinces={provinces}
                        cities={cities}
                        manufacturers={manufacturerOptions}
                        brands={brandOptions}
                        assetModels={modelOptions}
                        topologyLookup={topologyLookupData}
                        topologySummary={deviceTopologySummary}
                        coreCapacities={coreCapacities}
                        cableTypes={cableTypes}
                        routeTypes={routeTypes}
                        deviceCoreCapacities={deviceCoreCapacities}
                        closureTypes={closureTypes}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {/* 6-TILE BENTO GRID */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  {/* TILE 1: Main Identity & Status (8 Cols Desktop / 7 Tablet / 12 Mobile) */}
                  <div className="sm:col-span-7 lg:col-span-8">
                    <DeviceBentoHeroTile
                      deviceName={valueOf(item.device_name)}
                      deviceId={valueOf(item.device_id) || item.id}
                      deviceCode={valueOf(item.device_code)}
                      inventoryId={valueOf(item.inventory_id)}
                      deviceTypeKey={valueOf(item.device_type_key)}
                      deviceTypeLabel={valueOf(item.device_type_key)}
                      operationalStatus={valueOf(item.status, "active")}
                      validationStatus={detailValidationStatus}
                      popName={relationLabels.pop}
                      regionName={relationLabels.region}
                      tenantName={relationLabels.tenant}
                      projectName={relationLabels.project}
                      installationDate={valueOf(item.installation_date)}
                      updatedAt={valueOf(item.updated_at || item.created_at)}
                      notes={valueOf(item.notes)}
                      tags={Array.isArray(item.tags) ? (item.tags as string[]) : []}
                    />
                  </div>

                  {/* TILE 2: QR Code Action (4 Cols Desktop / 5 Tablet / 12 Mobile) */}
                  <div className="sm:col-span-5 lg:col-span-4">
                    <DeviceBentoQrTile
                      qrDataUrl={qrDataUrl}
                      deviceTypeLabel={valueOf(item.device_type_key, "Device")}
                      onDownloadQrLabel={handleDownloadQrLabel}
                      publicUrl={deviceDirectHref}
                      onOpenReminder={openReminderDialog}
                      reminderDisabled={loadingValidators || validatorOptions.length === 0}
                      canSendReminder={canEditAsset}
                    />
                  </div>

                  {/* TILE 3: Lokasi & Geotagging (5 Cols Desktop / 6 Tablet / 12 Mobile) */}
                  <div className="sm:col-span-6 lg:col-span-5">
                    <DeviceBentoLocationTile
                      latitude={item.latitude as number | string | null | undefined}
                      longitude={item.longitude as number | string | null | undefined}
                      address={valueOf(item.address)}
                      popName={relationLabels.pop}
                      cityName={relationLabels.city}
                      provinceName={relationLabels.province}
                      onOpenMapModal={() => setNavModalOpen(true)}
                    />
                  </div>

                  {/* TILE 4: Kapasitas Dasar & Spesifikasi Aset (7 Cols Desktop / 6 Tablet / 12 Mobile) */}
                  <div className="sm:col-span-6 lg:col-span-7">
                    <DeviceBentoCapacityTile
                      totalPorts={item.total_ports as number | string | null | undefined}
                      usedPorts={item.used_ports as number | string | null | undefined}
                      capacityCore={item.capacity_core as number | string | null | undefined}
                      usedCore={item.used_core as number | string | null | undefined}
                      splitterRatio={valueOf(item.splitter_ratio)}
                      odpType={valueOf(item.odp_type)}
                      modelName={relationLabels.model}
                      brandName={relationLabels.brand}
                      manufacturerName={relationLabels.manufacturer}
                      installationType={valueOf(item.installation_type)}
                      serialNumber={valueOf(item.serial_number)}
                      deviceTypeKey={valueOf(item.device_type_key)}
                      managementIp={valueOf(item.management_ip)}
                      vlan={valueOf(item.vlan)}
                      closureTypeName={closureTypes.find((c) => c.id === valueOf(item.closure_type_id))?.closure_type_name || undefined}
                      trayCount={(item.specifications as Record<string, unknown> | undefined)?.tray_count as number | string | undefined}
                      cableLengthM={item.cable_length_m as number | string | null | undefined}
                      cableType={valueOf(item.cable_type)}
                      routeType={valueOf(item.route_type)}
                      customerName={relationLabels.customer || (item.customer_name as string | undefined)}
                      customerNumber={item.customer_number as string | undefined}
                      uHeight={(item.u_height as string | undefined) || ((item.specifications as Record<string, unknown> | undefined)?.u_height as string | undefined)}
                      feederPortCount={item.feeder_port_count as number | string | null | undefined}
                      operationalStatus={valueOf(item.status, "active")}
                    />
                  </div>

                  {/* TILE 5: Inventaris Port (12 Cols Full Width) */}
                  <div className="col-span-1 sm:col-span-12">
                    <DevicePortSummarySection
                      deviceTypeLabel={valueOf(item.device_type_key, "device")}
                      ports={odpPorts}
                      connections={devicePortConnections}
                      coreSummary={deviceTopologySummary?.core_management?.summary}
                      fiberSummary={deviceTopologySummary?.fiber_cores?.summary}
                      readiness={deviceTopologySummary?.readiness}
                      loading={loadingOdpPorts}
                    />
                  </div>

                  {/* TILE 5B: Label Patch Cord Customer (12 Cols Full Width) */}
                  {valueOf(item.device_type_key).toUpperCase() === "ODP" && (
                    <div className="col-span-1 sm:col-span-12">
                      <PatchCordLabelsSection
                        odpName={valueOf(item.device_name, "ODP")}
                        odpCode={valueOf(item.device_id)}
                        popName={relationLabels.pop || relationLabels.region || valueOf(item.pop_name) || valueOf(item.region_name, "POP")}
                        ports={odpPorts}
                        defaultTemplateStyle={qrLabelPatchCordStyle}
                        loading={loadingOdpPorts}
                      />
                    </div>
                  )}

                  {/* TILE 6: Galeri Foto Aset (12 Cols Full Width) */}
                  <div className="col-span-1 sm:col-span-12">
                    <DeviceBentoGalleryTile
                      deviceTypeLabel={valueOf(item.device_type_key, "device")}
                      attachments={galleryImageAttachments}
                      imagePreviewUrls={imagePreviewUrls}
                      attachmentNames={attachmentNames}
                      loadingImagePreviews={loadingImagePreviews}
                      editing={editable && isEditing}
                      maxImageAttachments={MAX_IMAGE_ATTACHMENTS}
                      newImageFiles={newImageFiles}
                      newImagePreviewUrls={newImagePreviewUrls}
                      onOpenGallery={openGalleryAt}
                      onNewImageFilesChange={handleNewImageFilesChange}
                      onClearNewImages={() => setNewImageFiles([])}
                      onRemoveNewImage={removeNewImageAt}
                    />
                  </div>

                  {/* TILE 7: Riwayat Validasi Lapangan (12 Cols Full Width) */}
                  <div className="col-span-1 sm:col-span-12">
                    <DeviceBentoValidationHistoryTile
                      deviceTypeLabel={valueOf(item.device_type_key, "device")}
                      records={odpValidations}
                      loading={loadingOdpValidations}
                    />
                  </div>
                </div>
              </div>
            ) : category.resource === "pops" ? (
              <div className="space-y-4">
                {editable && isEditing ? (
                  <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs glass-inset">
                    <CardHeader className="p-0 pb-4 border-b border-border/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{t("detailPage.ui.editPopTitle")}</CardTitle>
                          <CardDescription className="text-xs">{t("detailPage.ui.editPopDesc")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setForm(buildEditableForm(item, category.resource, deviceTopologySummary));
                              setNewImageFiles([]);
                              setIsEditing(false);
                            }}
                            disabled={saving}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                            <Save className="mr-1.5 size-3.5" />
                            {saving ? t("common.saving") : t("detailPage.ui.saveChanges")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                      <PopDetailForm
                        form={form}
                        onChange={setForm}
                        editing={isEditing}
                        relationLabels={relationLabels}
                        relationLoading={relationLabelsLoading}
                        popTypes={popTypes}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {/* 6-TILE BENTO GRID POP + RACK ELEVATION */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  {/* SUMMARY STRIP: Total Device, ODP, Port, Customer */}
                  <div className="col-span-1 sm:col-span-12">
                    <PopDetailSummaryStrip
                      popId={item.id}
                      totalDevices={popDeviceCount}
                      totalOdp={popOdpCount}
                      totalPorts={popTotalPorts}
                      totalCustomers={popCustomerTotal}
                      loading={loadingPopDevices || loadingPopCustomerSummary}
                    />
                  </div>

                  {/* TAB CONTAINER */}
                  <div className="col-span-1 sm:col-span-12">
                    <Tabs value={activePopTab} onValueChange={setActivePopTab}>
                      {/* Tab Navigation */}
                      <TabsList className="mb-4 rounded-full border border-border/50 bg-muted/20 p-1 h-auto gap-1">
                        <TabsTrigger
                          value="overview"
                          className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:bg-card data-[state=active]:shadow-xs px-4 py-1.5"
                        >
                          {t("detailPage.ui.tabOverview")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="rack"
                          className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:bg-card data-[state=active]:shadow-xs px-4 py-1.5"
                        >
                          {t("detailPage.ui.tabRackInventory")}
                        </TabsTrigger>
                      </TabsList>

                      {/* TAB 1: Overview — Identitas, Lokasi, Properti, Dokumen, Galeri */}
                      <TabsContent value="overview" className="mt-0">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                          {/* TILE 1: POP Hero & Status & Power (7 Cols Desktop / 12 Mobile) */}
                          <div className="sm:col-span-7 lg:col-span-7">
                            <PopBentoHeroTile
                              popName={valueOf(item.pop_name)}
                              popCode={valueOf(item.pop_code)}
                              popType={relationLabels.popType || valueOf(item.pop_type)}
                              regionName={relationLabels.region}
                              statusPop={valueOf(item.status_pop, "active")}
                              validationStatus={detailValidationStatus}
                              tanggalPopAktif={valueOf(item.tanggal_pop_aktif)}
                              tenant={valueOf(item.tenant)}
                              plnCidNumber={valueOf(item.pln_cid_number)}
                              plnPaymentMethod={valueOf(item.pln_payment_method)}
                              plnPhase={valueOf(item.pln_phase)}
                              plnWattage={item.pln_wattage as number | string | null | undefined}
                              updatedAt={valueOf(item.updated_at || item.created_at)}
                              tags={Array.isArray(item.tags) ? (item.tags as string[]) : []}
                            />
                          </div>

                          {/* TILE 2: Peta & Lokasi POP (5 Cols Desktop / 12 Mobile) */}
                          <div className="sm:col-span-5 lg:col-span-5">
                            <PopBentoLocationTile
                              latitude={item.latitude as number | string | null | undefined}
                              longitude={item.longitude as number | string | null | undefined}
                              address={valueOf(item.address)}
                              popName={valueOf(item.pop_name)}
                              cityName={relationLabels.city}
                              provinceName={relationLabels.province}
                              onOpenMapModal={() => setNavModalOpen(true)}
                            />
                          </div>

                          {/* TILE 3: Legalitas Site, Pajak PBB & Kontrak Sewa (12 Cols Full Width) */}
                          <div className="col-span-1 sm:col-span-12">
                            <PopBentoPropertyTile property={popPropertyData} />
                          </div>

                          {/* TILE 4: Galeri Foto Ruang/Site POP (12 Cols Full Width) */}
                          <div className="col-span-1 sm:col-span-12">
                            <PopBentoGalleryTile
                              popName={typeof item?.name === "string" ? item.name : undefined}
                              attachments={galleryImageAttachments}
                              imagePreviewUrls={imagePreviewUrls}
                              attachmentNames={attachmentNames}
                              loadingImagePreviews={loadingImagePreviews}
                              editing={editable && isEditing}
                              maxImageAttachments={MAX_IMAGE_ATTACHMENTS}
                              newImageFiles={newImageFiles}
                              newImagePreviewUrls={newImagePreviewUrls}
                              onOpenGallery={openGalleryAt}
                              onNewImageFilesChange={handleNewImageFilesChange}
                              onClearNewImages={() => setNewImageFiles([])}
                              onRemoveNewImage={removeNewImageAt}
                            />
                          </div>

                          {/* TILE 5: Berkas & Dokumen Site POP (12 Cols Full Width) */}
                          <div className="col-span-1 sm:col-span-12">
                            <PopBentoDocumentsTile
                              documents={popDocuments}
                              token={token || undefined}
                              canEdit={editable}
                              onUploadDocument={handleUploadPopDocument}
                              onDeleteDocument={handleDeletePopDocument}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      {/* TAB 2: Rack & Inventaris */}
                      <TabsContent value="rack" className="mt-0">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                          {/* TILE 4: KPI Utilisasi Rak & Breakdown Perangkat Terfilter (12 Cols Full Width) */}
                          <div className="col-span-1 sm:col-span-12">
                            <PopBentoRackKpiTile
                              totalRacks={popRacks.length}
                              totalU={totalPopU}
                              usedU={usedPopU}
                              popId={item.id}
                              deviceTypeCounts={popDeviceTypeCounts}
                              visibleDeviceTypes={visiblePopDeviceTypes}
                              token={token || undefined}
                              onVisibleTypesChange={setVisiblePopDeviceTypes}
                            />
                          </div>

                          {/* TILE 5: Interactive Rack Elevation Canvas (Adaptive 8 or 12 Cols) */}
                          <div className={showUnmountedTray ? "sm:col-span-12 lg:col-span-8" : "col-span-1 sm:col-span-12 lg:col-span-12"}>
                            <PopRackElevationCanvas
                              racks={popRacks}
                              selectedRackId={activePopRackId}
                              mountedDevices={popMountedDevices}
                              onSelectRackId={setSelectedPopRackId}
                              onCreateNewRack={handleCreateNewPopRack}
                              onEditRack={handleEditPopRack}
                              onResetRack={handleResetPopRack}
                              onDeleteRack={handleDeletePopRack}
                              onMountDevice={handleMountPopDevice}
                              onUnmountDevice={handleUnmountPopDevice}
                              onEmptySlotClick={(u) => {
                                setPopMountTargetU(u);
                                setPopDeviceToMount(null);
                                setPopMountModalOpen(true);
                              }}
                              showUnmountedTray={showUnmountedTray}
                              unmountedCount={popUnmountedDevices.length}
                              onToggleUnmountedTray={toggleShowUnmountedTray}
                            />
                          </div>

                          {/* TILE 6: Unmounted Devices Tray (4 Cols Desktop / 12 Mobile, conditionally rendered) */}
                          {showUnmountedTray ? (
                            <div className="sm:col-span-12 lg:col-span-4">
                              <PopUnmountedTray
                                devices={popUnmountedDevices}
                                onSelectDeviceToMount={(dev) => {
                                  setPopDeviceToMount(dev);
                                  setPopMountTargetU(1);
                                  setPopMountModalOpen(true);
                                }}
                                onClose={toggleShowUnmountedTray}
                              />
                            </div>
                          ) : null}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                <PopRackMountModal
                  open={popMountModalOpen}
                  onOpenChange={setPopMountModalOpen}
                  racks={popRacks}
                  selectedRackId={activePopRackId}
                  initialU={popMountTargetU}
                  initialDevice={popDeviceToMount}
                  unmountedDevices={popUnmountedDevices}
                  onMount={handleMountPopDevice}
                />

                <PopRackFormDialog
                  open={createRackDialogOpen}
                  onOpenChange={setCreateRackDialogOpen}
                  mode="create"
                  defaultNextName={`Rack ${String(popRacks.length + 1).padStart(2, "0")}`}
                  onSubmit={handleCreateNewPopRackSubmit}
                />

                <PopRackFormDialog
                  open={editRackDialogOpen}
                  onOpenChange={setEditRackDialogOpen}
                  mode="edit"
                  rack={rackToEdit}
                  onSubmit={handleEditPopRackSubmit}
                />
              </div>
            ) : category.resource === "customers" ? (
              <div className="space-y-4">
                {editable && isEditing ? (
                  <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs glass-inset">
                    <CardHeader className="p-0 pb-4 border-b border-border/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{t("detailPage.ui.editCustomerTitle")}</CardTitle>
                          <CardDescription className="text-xs">{t("detailPage.ui.editCustomerDesc")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setForm(buildEditableForm(item, category.resource, deviceTopologySummary));
                              setIsEditing(false);
                            }}
                            disabled={saving}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                            <Save className="mr-1.5 size-3.5" />
                            {saving ? t("common.saving") : t("detailPage.ui.saveChanges")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                      <CustomerDetailEditForm
                        form={form}
                        onChange={setForm}
                        editing={isEditing}
                        popOptions={popOptions}
                        projectOptions={projectOptions}
                        relationLabels={relationLabels}
                        relationLoading={relationLabelsLoading}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {/* 4-TILE BENTO GRID FOR CUSTOMER */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  {/* TILE 1: Hero Tile (7 Cols Desktop / 12 Mobile) */}
                  <div className="sm:col-span-7 lg:col-span-7">
                    <CustomerBentoHeroTile
                      customerName={valueOf(item.customer_name || item.name)}
                      customerNumber={valueOf(item.customer_number || item.customer_code)}
                      status={valueOf(item.status, "active")}
                      serviceType={relationLabels.serviceType || valueOf(item.service_type)}
                      popName={relationLabels.pop || valueOf(item.pop_name)}
                      popCode={valueOf(item.pop_code)}
                      popId={valueOf(item.pop_id)}
                      projectName={relationLabels.project || valueOf(item.project_name)}
                      projectId={valueOf(item.project_id)}
                      regionName={relationLabels.region || valueOf(item.region_name)}
                      regionId={valueOf(item.region_id)}
                      installationDate={valueOf(item.installation_date)}
                      contactName={valueOf(item.contact_name)}
                      contactPhone={valueOf(item.contact_phone)}
                      email={valueOf(item.email)}
                      tags={Array.isArray(item.tags) ? (item.tags as string[]) : []}
                    />
                  </div>

                  {/* TILE 2: Label Patch Cord Download & Preview (5 Cols Desktop / 12 Mobile) */}
                  <div className="sm:col-span-5 lg:col-span-5">
                    <CustomerBentoLabelTile
                      customerId={item.id}
                      customerCode={valueOf(item.customer_number || item.customer_code)}
                      customerName={valueOf(item.customer_name || item.name)}
                      popName={relationLabels.pop || relationLabels.region || valueOf(item.pop_name) || valueOf(item.region_name)}
                      portLabel={servicePortRelations[0]?.port_label || (servicePortRelations[0]?.port_index ? `Port ${servicePortRelations[0].port_index}` : undefined)}
                      odpName={servicePortRelations[0]?.odpDevice?.device_name || undefined}
                      defaultTemplateStyle={qrLabelPatchCordStyle}
                      publicUrl={buildCustomerQrHref({ appBaseUrl: APP_BASE_URL, customerId: item.id })}
                    />
                  </div>

                  {/* TILE 3: Lokasi & Geotagging (6 Cols Desktop / 12 Mobile) */}
                  <div className="sm:col-span-6 lg:col-span-6">
                    <CustomerBentoLocationTile
                      address={valueOf(item.address)}
                      city={relationLabels.city || valueOf(item.city)}
                      province={relationLabels.province || valueOf(item.province)}
                      latitude={item.latitude as number | string | null | undefined}
                      longitude={item.longitude as number | string | null | undefined}
                      onOpenNavigation={() => setNavModalOpen(true)}
                    />
                  </div>

                  {/* TILE 4: Koneksi Jaringan & Port ODP (6 Cols Desktop / 12 Mobile) */}
                  <div className="sm:col-span-6 lg:col-span-6">
                    <CustomerBentoConnectionTile
                      ports={servicePortRelations}
                      loading={loadingServicePortRelations}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Non-device forms (projects, routes) */
              <div className="rounded-[2rem] border border-border/40 bg-muted/10 p-2 sm:p-3 shadow-xs">
                <Card className="rounded-[calc(2rem-0.5rem)] border-border/60 shadow-xs glass-inset">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>{t("detailPage.ui.categoryInfoTitle", { label: category.label })}</CardTitle>
                      {editable && !isEditing ? (
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          <Pencil className="mr-2 size-4" />
                          {t("detailPage.ui.edit")}
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {category.resource === "projects" ? (
                      <ProjectDetailForm
                        item={item}
                        relationLabels={relationLabels}
                        relationLoading={relationLabelsLoading}
                        projectAssets={projectAssets}
                        projectRoutes={projectRoutes}
                        projectAsBuiltDocuments={projectAsBuiltDocuments}
                        projectCoreRelations={projectCoreRelations}
                        projectRelationDevices={projectRelationDevices}
                        loadingProjectAssets={loadingProjectAssets}
                      />
                    ) : null}
                    {category.resource === "routes" ? (
                      <RouteDetailForm item={item} relationLabels={relationLabels} relationLoading={relationLabelsLoading} />
                    ) : null}
                    {category.resource !== "projects" && category.resource !== "routes" ? (
                      <GenericDeviceRawSection item={item} />
                    ) : null}

                    {editable && isEditing ? (
                      <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setForm(buildEditableForm(item, category.resource, deviceTopologySummary));
                            setIsEditing(false);
                          }}
                          disabled={saving}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={saving}>
                          <Save className="mr-2 size-4" />
                          {saving ? t("common.saving") : t("detailPage.ui.saveChanges")}
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : null}
      </div>
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent
          showCloseButton={false}
          className="!w-[min(96vw,1200px)] !max-w-[min(96vw,1200px)] p-3 sm:p-4 rounded-2xl border-border/60 glass-inset"
        >
          <DialogTitle className="sr-only">{t("detailPage.ui.galleryDialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("detailPage.ui.galleryDialogDesc")}
          </DialogDescription>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {t("detailPage.ui.galleryCounter", { current: Math.min(galleryIndex + 1, galleryImageAttachments.length), total: galleryImageAttachments.length })}
              </p>
              <div className="flex items-center gap-2">
                {galleryImageAttachments[galleryIndex]?.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadAttachmentFile(galleryImageAttachments[galleryIndex].id, token)}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    {t("detailPage.ui.download")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setGalleryOpen(false)}
                  aria-label={t("detailPage.ui.close")}
                >
                  <X className="size-4" />
                  <span className="sr-only">{t("detailPage.ui.close")}</span>
                </Button>
              </div>
            </div>
            <div className="relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {galleryImageAttachments[galleryIndex] && imagePreviewUrls[galleryImageAttachments[galleryIndex].id] ? (
                <Image
                  key={galleryImageAttachments[galleryIndex].id}
                  src={imagePreviewUrls[galleryImageAttachments[galleryIndex].id]}
                  alt={galleryImageAttachments[galleryIndex].name || t("detailPage.ui.attachmentUnavailable")}
                  width={1200}
                  height={800}
                  priority
                  className="h-[56vh] w-full object-contain sm:h-[64vh] lg:h-[70vh]"
                />
              ) : (
                <div className="flex h-[56vh] items-center justify-center text-sm text-muted-foreground sm:h-[64vh] lg:h-[70vh]">
                  {t("detailPage.ui.previewUnavailable")}
                </div>
              )}
              {galleryImageAttachments.length > 1 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-2.5 sm:p-3 z-20">
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label={t("detailPage.ui.prevSlide")}
                    style={{ transform: "none", transition: "none" }}
                    className="no-press pointer-events-auto flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm cursor-pointer hover:bg-muted select-none"
                  >
                    <ArrowLeft className="size-4 sm:size-5" />
                    <span className="sr-only">{t("detailPage.ui.prevSlide")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label={t("detailPage.ui.nextSlide")}
                    style={{ transform: "none", transition: "none" }}
                    className="no-press pointer-events-auto flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm cursor-pointer hover:bg-muted select-none"
                  >
                    <ArrowRight className="size-4 sm:size-5" />
                    <span className="sr-only">{t("detailPage.ui.nextSlide")}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {attachmentNames[galleryImageAttachments[galleryIndex]?.id || ""]
                    || galleryImageAttachments[galleryIndex]?.name
                    || galleryImageAttachments[galleryIndex]?.id
                    || "-"}
                </p>
                {editable && isEditing && galleryImageAttachments[galleryIndex] ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={
                        renamingAttachmentId === galleryImageAttachments[galleryIndex].id
                          ? renameDraft
                          : attachmentNames[galleryImageAttachments[galleryIndex].id]
                            || galleryImageAttachments[galleryIndex].name
                            || ""
                      }
                      onChange={(event) => {
                        setRenamingAttachmentId(galleryImageAttachments[galleryIndex].id);
                        setRenameDraft(event.target.value);
                      }}
                      placeholder={t("detailPage.ui.attachmentNamePlaceholder")}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={renaming}
                      onClick={() => {
                        const activeId = galleryImageAttachments[galleryIndex].id;
                        if (renamingAttachmentId !== activeId) {
                          setRenamingAttachmentId(activeId);
                          setRenameDraft(
                            attachmentNames[activeId] || galleryImageAttachments[galleryIndex].name || "",
                          );
                          return;
                        }
                        void handleRenameAttachment();
                      }}
                    >
                      {renaming ? t("common.saving") : t("detailPage.ui.rename")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ValidationReminderDialog
        open={reminderDialogOpen}
        validators={validatorOptions}
        loadingValidators={loadingValidators}
        sendingReminder={sendingReminder}
        selectedValidatorId={selectedReminderValidatorId}
        error={reminderError}
        deviceTypeLabel={valueOf(item?.device_type_key, t("detailPage.ui.deviceFallback"))}
        onOpenChange={setReminderDialogOpen}
        onSelectedValidatorChange={setSelectedReminderValidatorId}
        onSend={() => void handleSendValidationReminder()}
      />
      <ResponseDialog
        open={successDialogOpen}
        title={t("detailPage.ui.successTitle")}
        description={successDialogText}
        variant="success"
        actionLabel={t("detailPage.ui.close")}
        onOpenChange={setSuccessDialogOpen}
        onAction={() => setSuccessDialogOpen(false)}
      />

      {item &&
       Number.isFinite(Number(item.latitude)) &&
       Number.isFinite(Number(item.longitude)) && (
        <DeviceNavigationModal
          open={navModalOpen}
          onOpenChange={setNavModalOpen}
          token={token || ""}
          deviceId={String(item.id)}
          deviceName={String(item.customer_name || item.device_name || item.pop_name || item.device_id || item.pop_code || item.customer_number || "")}
          deviceLat={Number(item.latitude)}
          deviceLng={Number(item.longitude)}
        />
      )}
    </ScrollArea>
  );
}


