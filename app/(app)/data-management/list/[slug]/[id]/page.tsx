"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, ChevronDown, CircleHelp, Download, ImagePlus, Pencil, Save, X, XCircle } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import {
  DeviceFormSelection,
  OdcCoreChainSummarySection,
  OtbCoreChainSummarySection,
  DeviceDetailHeader,
  DeviceGallerySection,
  DeviceOperationalSummary,
  DevicePortSummarySection,
  DeviceQrActionPanel,
  DeviceTechnicalSummarySection,
  DeviceValidationHistorySection,
  GenericDeviceRawSection,
  OdpCoreChainSummarySection,
  OdpOperationsShell,
  OdpPortMetrics,
  OdpPortSection,
  OdpValidationHistorySection,
  ValidationReminderDialog,
  DeviceTopologyChainVisualizer,
  DeviceLinkBudgetSection,
  PortTrayContainer,
  OltPortContainer,
  SwitchPortContainer,
  PortAssignmentDrawer,
  type PeerDeviceOption,
  type PeerPortOption,
} from "@/components/features/data-management/device-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob } from "@/lib/attachment-utils";
import { resolveAttachment } from "@/lib/attachment-utils";
import { deviceTypeKeyToSlug, getCategoryBySlug } from "@/lib/data-management-config";
import { buildCustomerRelationDisplay, buildDeviceQrRelationDisplay } from "@/lib/display-adapters/device-display-adapter";
import { useReferenceData } from "@/hooks/use-reference-data";
import { normalizeDeviceName, normalizePopName } from "@/lib/name-normalization";
import { buildDeviceQrHref, buildQrLabelPngDataUrl, formatQrPopLabel, loadQrLabelLogoDataUrl, loadQrLabelSettings } from "@/lib/qr-label";
import { mapValidationStatus } from "@/lib/validation-status";
import { TopologyLookupData, emptyTopologyLookup, DeviceLookupOption, RouteLookupOption, PortLookupOption } from "@/components/features/data-management/device-detail/sections/device-topology-helpers";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "";

type GenericItem = Record<string, unknown> & {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
};
type RelationRecord = Record<string, unknown> & { id?: string | null };

type EditableForm = Record<string, string>;
type AttachmentRef = {
  id: string;
  name?: string;
};
type UploadResult = {
  id: string;
  attachment_id: string;
  original_name: string;
  mime_type: string;
  file_category: string;
  size_bytes: number;
};
type DevicePort = {
  id: string;
  port_id?: string | null;
  region_id?: string | null;
  device_id?: string | null;
  port_index: number;
  port_label?: string | null;
  port_type?: string | null;
  direction?: string | null;
  status?: string | null;
  splitter_ratio?: string | null;
  core_capacity?: number | null;
  core_used?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  ont_device_id?: string | null;
  occupied_at?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
};
type DevicePortConnection = {
  id: string;
  connection_id?: string | null;
  region_id?: string | null;
  from_port_id?: string | null;
  to_port_id?: string | null;
  connection_type?: string | null;
  status?: string | null;
  route_id?: string | null;
  cable_device_id?: string | null;
  core_start?: number | null;
  core_end?: number | null;
  fiber_count?: number | null;
  installed_at?: string | null;
  notes?: string | null;
  updated_at?: string | null;
};
type DeviceTopologySummary = {
  device?: GenericItem | null;
  ports?: {
    summary?: Record<string, unknown>;
    items?: DevicePort[];
  };
  connections?: {
    summary?: Record<string, unknown>;
    items?: DevicePortConnection[];
  };
  core_management?: {
    summary?: {
      total?: number;
      by_status?: Record<string, number>;
      core_count?: number;
      used_count?: number;
      reserved_count?: number;
    };
    items?: Array<Record<string, unknown>>;
  };
  fiber_cores?: {
    summary?: {
      total?: number;
      by_status?: Record<string, number>;
      loss_warnings?: number;
      damaged?: number;
    };
    items?: Array<Record<string, unknown>>;
  };
  readiness?: {
    has_ports?: boolean;
    has_connections?: boolean;
    has_core_summary?: boolean;
    has_fiber_core_inventory?: boolean;
    trace_endpoint?: string;
  };
  odc_relations?: any;
};
type OdpCustomerOption = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  status?: string | null;
  region_id?: string | null;
};
type OdpOntOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  status?: string | null;
  region_id?: string | null;
  customer_id?: string | null;
};
type ValidatorOption = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  user_code?: string | null;
  default_region_id?: string | null;
};
type OdpCableOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  region_id?: string | null;
};
type PopLookupOption = {
  id: string;
  pop_id?: string | null;
  pop_code?: string | null;
  pop_name?: string | null;
  region_id?: string | null;
  address?: string | null;
  city?: string | null;
  city_id?: string | null;
  province?: string | null;
  province_id?: string | null;
  longitude?: number | string | null;
  latitude?: number | string | null;
};
type ProjectLookupOption = {
  id: string;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};
type ProjectAssetItem = GenericItem & {
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  status?: string | null;
  validation_status?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
  project_id?: string | null;
  capacity_core?: number | string | null;
  used_core?: number | string | null;
  total_ports?: number | string | null;
  used_ports?: number | string | null;
};
type ProjectRouteItem = GenericItem & {
  route_id?: string | null;
  route_code?: string | null;
  route_name?: string | null;
  route_type?: string | null;
  status?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
  project_id?: string | null;
};
type ProjectAsBuiltDocumentItem = GenericItem & {
  document_id?: string | null;
  title?: string | null;
  revision_code?: string | null;
  status?: string | null;
  primary_format?: string | null;
  generated_at?: string | null;
  project_id?: string | null;
  route_id?: string | null;
  attachment_id?: string | null;
};
type ProjectCoreRelationItem = GenericItem & {
  core_id?: string | null;
  core_code?: string | null;
  cable_device_id?: string | null;
  route_id?: string | null;
  project_id?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
  from_device_id?: string | null;
  to_device_id?: string | null;
  core_no_start?: number | string | null;
  core_no_end?: number | string | null;
  core_count?: number | string | null;
  used_count?: number | string | null;
  reserved_count?: number | string | null;
  status?: string | null;
};
type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  allowed_device_type_keys?: string[] | null;
  is_active?: boolean | null;
};
type TopologyRelationRuleOption = {
  id: string;
  source_device_type_key: string;
  direction: 'front' | 'rear';
  allowed_peer_device_type_key: string;
  requires_same_pop?: boolean | null;
  requires_same_project?: boolean | null;
  is_active?: boolean | null;
};
type DeviceTypeMasterOption = {
  id: string;
  device_type_key: string;
  layout_type?: string | null;
  default_front_label?: string | null;
  default_rear_label?: string | null;
  topology_role?: string | null;
  supports_ports?: boolean | null;
  supports_core_management?: boolean | null;
  is_assignable?: boolean | null;
};
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type OdpCoreChainSummary = {
  is_odp: boolean;
  is_complete: boolean;
  checks: {
    has_ports: boolean;
    has_upstream_link: boolean;
    has_main_splitter: boolean;
    has_distribution_cable: boolean;
    has_core_mapping: boolean;
    has_odc_source_path: boolean;
  };
  summary?: {
    port_count: number;
    upstream_link_count: number;
    upstream_device_count: number;
    distribution_cable_count: number;
    fiber_core_total: number;
    fiber_core_used: number;
  };
  upstream_devices?: Array<{
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    device_type_key?: string | null;
  }>;
  distribution_cables?: Array<{
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    device_type_key?: string | null;
  }>;
  missing_checks?: string[];
  draft_ready?: boolean;
  suggestions?: Array<{
    key: string;
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
  upstream_port_candidates?: Array<{
    port_id: string;
    port_label?: string | null;
    port_index?: number | null;
    port_type?: string | null;
    status?: string | null;
    device?: {
      id?: string | null;
      device_id?: string | null;
      device_name?: string | null;
      device_type_key?: string | null;
    };
  }>;
};
type OdpValidationDraft = {
  physical_ok: boolean;
  splitter_ok: boolean;
  port_mapping_ok: boolean;
  qr_label_ok: boolean;
  label_ok: boolean;
  status: "valid" | "warning" | "invalid";
  findings: string;
  evidenceFile: File | null;
};
type OdpValidationChecklistKey = "physical_ok" | "splitter_ok" | "port_mapping_ok" | "qr_label_ok" | "label_ok";
type OdpFieldInspectionPayload = {
  initial_photos?: Record<string, { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
  condition_checks?: Record<string, { label?: string; condition?: string | null; note?: string | null; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
};
type OdpEvidenceAttachment = {
  id?: string | null;
  attachment_id?: string | null;
  name?: string | null;
  original_name?: string | null;
};
type OdpFieldValidationPayload = {
  validation_date?: string | null;
  inventory_id?: string | null;
  old_device_name?: string | null;
  new_device_name?: string | null;
  pop_id?: string | null;
  pop_name?: string | null;
  address?: string | null;
  longitude?: string | number | null;
  latitude?: string | number | null;
  odp_type?: string | null;
  installation_type?: string | null;
  splitter_ratio?: string | null;
  total_ports?: number | null;
};
type OdpValidationPortSnapshot = {
  id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};
type OdpValidationRecord = {
  id: string;
  validation_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  validation_type?: string | null;
  status?: "valid" | "warning" | "invalid" | null;
  validated_at?: string | null;
  validator_user_id?: string | null;
  validator_name?: string | null;
  validator_email?: string | null;
  validator_user_code?: string | null;
  findings?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  adminregion_actor_name?: string | null;
  adminregion_actor_email?: string | null;
  adminregion_actor_user_code?: string | null;
  adminregion_action_at?: string | null;
  superadmin_actor_name?: string | null;
  superadmin_actor_email?: string | null;
  superadmin_actor_user_code?: string | null;
  superadmin_action_at?: string | null;
  payload?: {
    checklist?: Partial<Record<OdpValidationChecklistKey, boolean>>;
    field_validation_type?: string | null;
    general_validation?: Record<string, unknown>;
    technical_validation?: Record<string, unknown>;
    field_inspection?: OdpFieldInspectionPayload;
    field_validation?: OdpFieldValidationPayload;
    relation_summary?: Record<string, unknown>;
    core_summary?: Record<string, unknown>;
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
    device_ports?: OdpValidationPortSnapshot[];
    direct_link?: string;
  } | null;
  evidence_attachment_id?: string | null;
  evidence_attachments?: OdpEvidenceAttachment[] | null;
  request_status?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type ValidationRequestRecord = {
  id: string;
  request_id?: string | null;
  current_status?: string | null;
  submitted_by_user_id?: string | null;
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
  submitted_by_user_code?: string | null;
  adminregion_actor_name?: string | null;
  adminregion_actor_email?: string | null;
  adminregion_actor_user_code?: string | null;
  adminregion_action_at?: string | null;
  superadmin_actor_name?: string | null;
  superadmin_actor_email?: string | null;
  superadmin_actor_user_code?: string | null;
  superadmin_action_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  finding_note?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  checklist?: Partial<Record<OdpValidationChecklistKey, boolean>> | null;
  payload_snapshot?: {
    field_validation_type?: string | null;
    general_validation?: Record<string, unknown>;
    technical_validation?: Record<string, unknown>;
    field_inspection?: OdpFieldInspectionPayload;
    field_validation?: OdpFieldValidationPayload;
    relation_summary?: Record<string, unknown>;
    core_summary?: Record<string, unknown>;
    port_summary?: {
      total?: number;
      used?: number;
      idle?: number;
      reserved?: number;
      down?: number;
    };
    device_ports?: OdpValidationPortSnapshot[];
  } | null;
  evidence_attachments?: OdpEvidenceAttachment[] | null;
};
type ServicePortRelation = DevicePort & {
  odpDevice?: {
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    device_type_key?: string | null;
    status?: string | null;
  } | null;
};
type RelationLabels = {
  region?: string;
  pop?: string;
  project?: string;
  serviceType?: string;
  manufacturer?: string;
  brand?: string;
  model?: string;
  tenant?: string;
  popCode?: string;
  popType?: string;
  province?: string;
  city?: string;
  startAsset?: string;
  endAsset?: string;
};

const POP_STATUS_OPTIONS = ["planning", "active", "inactive", "maintenance"];
const VALIDATION_STATUS_OPTIONS = ["unvalidated", "valid", "warning", "invalid"];
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
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
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
  const [cableTypes, setCableTypes] = useState<Array<{ id: string; cable_type_code: string; cable_type_name: string }>>([]);
  const [routeTypes, setRouteTypes] = useState<Array<{ id: string; route_type_code?: string | null; route_type_name: string }>>([]);
  const [deviceTypeMasters, setDeviceTypeMasters] = useState<DeviceTypeMasterOption[]>([]);
  const [topologyRelationRules, setTopologyRelationRules] = useState<TopologyRelationRuleOption[]>([]);
  const [deviceCoreCapacities, setDeviceCoreCapacities] = useState<Array<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>([]);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
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
  const editable = canEditAsset && (category?.resource === "pops" || category?.resource === "devices");
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
        setError((err as Error).message || "Gagal memuat detail data.");
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
    if (category.resource === "devices") {
      return `${valueOf(item.device_name)} (${valueOf(item.device_id)})`;
    }
    return `Detail ${category.label}`;
  }, [item, category]);

  const infoImageAttachments = useMemo(
    () => extractImageAttachments(item?.image_attachments, valueOf(item?.image_attachment_id)),
    [item],
  );
  const galleryImageAttachments = useMemo<AttachmentRef[]>(
    () => mergeAttachmentRefs([
      ...infoImageAttachments,
      ...odpValidations.filter(isFinalValidationRecord).flatMap(extractValidationEvidenceAttachments),
    ]),
    [infoImageAttachments, odpValidations],
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
    const objectUrls: string[] = [];

    async function loadImagePreviews() {
      setLoadingImagePreviews(true);
      const nextMap: Record<string, string> = {};
      const nextNames: Record<string, string> = {};
      await Promise.all(
        galleryImageAttachments.map(async (attachment) => {
          const resolvedIds = await resolveAttachmentIds(attachment.id, token);
          const candidates = resolvedIds.length ? resolvedIds : [attachment.id];
          const resolvedMeta = await resolveAttachment(attachment.id, token);
          try {
            if (resolvedMeta?.original_name) {
              nextNames[attachment.id] = resolvedMeta.original_name;
            } else if (attachment.name) {
              nextNames[attachment.id] = attachment.name;
            }
          } catch {
            if (attachment.name) {
              nextNames[attachment.id] = attachment.name;
            }
          }

          try {
            let response: Response | null = null;
            for (const candidateId of candidates) {
              try {
                const result = await fetchAttachmentBlob(candidateId, token, "preview");
                response = new Response(result.blob, { status: 200 });
                break;
              } catch {
                try {
                  const result = await fetchAttachmentBlob(candidateId, token, "download");
                  response = new Response(result.blob, { status: 200 });
                  break;
                } catch {
                  // try next
                }
              }
            }
            if (!response || !response.ok) return;
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            nextMap[attachment.id] = url;
          } catch {
            // Skip broken preview silently to keep detail page stable.
          }
        }),
      );
      if (cancelled) return;
      setImagePreviewUrls(nextMap);
      setAttachmentNames(nextNames);
      setLoadingImagePreviews(false);
    }

    void loadImagePreviews();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryImageAttachments, token]);

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
          const embeddedManufacturer = getRelationRecord(activeItem.manufacturer);
          const embeddedBrand = getRelationRecord(activeItem.brand);
          const embeddedModel = getRelationRecord(activeItem.model);
          const embeddedTenant = getRelationRecord(activeItem.tenant);
          const referenceRegion = relationReferenceMaps.regions.get(valueOf(activeItem.region_id));
          const referencePop = relationReferenceMaps.pops.get(valueOf(activeItem.pop_id));
          const referenceManufacturer = relationReferenceMaps.manufacturers.get(valueOf(activeItem.manufacturer_id));
          const referenceBrand = relationReferenceMaps.brands.get(valueOf(activeItem.brand_id));
          const referenceModel = relationReferenceMaps.models.get(valueOf(activeItem.model_id));
          const referenceTenant = relationReferenceMaps.tenants.get(valueOf(activeItem.tenant_id));

          labels.region = valueOf(embeddedRegion?.region_name || referenceRegion?.region_name);
          labels.pop = valueOf(embeddedPop?.pop_name || referencePop?.pop_name);
          labels.popCode = valueOf(embeddedPop?.pop_code || referencePop?.pop_code);
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
        const [splitterResponse, deviceTypesResponse, topologyRelationRulesResponse, odpTypesResponse, installationTypesResponse, tenantsResponse, deviceCoreCapacitiesResponse, closureTypesResponse, cableTypesResponse, routeTypesResponse] = await Promise.allSettled([
          apiFetch<PaginatedResponse<SplitterProfileOption>>("/splitterProfiles?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<DeviceTypeMasterOption>>("/deviceTypes?page=1&limit=300&is_active=true", { token }),
          apiFetch<PaginatedResponse<TopologyRelationRuleOption>>("/topologyRelationRules?page=1&limit=500&is_active=true", { token }),
          apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<TenantOption>>("/tenants?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ core_capacity_value: number; label: string; allowed_device_type_keys?: string[] | null }>>("/deviceCoreCapacities?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; closure_type_name: string; closure_type_code?: string | null; max_core_capacity?: number | null; max_splice_capacity?: number | null; supports_pass_through?: boolean | null; supports_branching?: boolean | null }>>("/closureTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; cable_type_code: string; cable_type_name: string }>>("/cableTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<{ id: string; route_type_code?: string | null; route_type_name: string }>>("/routeTypes?page=1&limit=200&is_active=true", { token }),
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
        const summary = result.data || {};
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
          setError((err as Error).message || "Gagal memuat topology summary device.");
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


  useEffect(() => {
    if (!isOdpDevice || !item || !token) {
      setOdpCustomers([]);
      setOdpOntDevices([]);
      setOdpCableDevices([]);
      setLoadingOdpLookups(false);
      return;
    }

    const activeRegionId = valueOf(item.region_id);
    const regionQuery = activeRegionId ? `&region_id=${encodeURIComponent(activeRegionId)}` : "";
    let cancelled = false;

    async function loadOdpLookups() {
      setLoadingOdpLookups(true);
      try {
        const [customers, onts, cables] = await Promise.all([
          apiFetch<PaginatedResponse<OdpCustomerOption>>(`/customers?page=1&limit=500${regionQuery}`, { token }),
          apiFetch<PaginatedResponse<OdpOntOption>>(`/devices?page=1&limit=500&device_type_key=ONT${regionQuery}`, { token }),
          apiFetch<PaginatedResponse<OdpCableOption>>(`/devices?page=1&limit=500&device_type_key=CABLE${regionQuery}`, { token }),
        ]);
        if (cancelled) return;
        setOdpCustomers(customers.data || []);
        setOdpOntDevices(onts.data || []);
        setOdpCableDevices(cables.data || []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat lookup customer/ONT.");
      } finally {
        if (!cancelled) setLoadingOdpLookups(false);
      }
    }

    void loadOdpLookups();
    return () => {
      cancelled = true;
    };
  }, [isOdpDevice, item, token]);
  // ── Fetch topology lookup data (ODC devices, routes, ports) ──────────────
  useEffect(() => {
    if (category?.resource !== "devices" || !item || !token) {
      setTopologyLookupData(emptyTopologyLookup());
      return;
    }

    const activeRegionId = valueOf(item.region_id);
    const regionQuery = activeRegionId ? `&region_id=${encodeURIComponent(activeRegionId)}` : "";
    let cancelled = false;

    async function loadTopologyLookups() {
      setTopologyLookupData((prev) => ({ ...prev, loadingDevices: true, loadingPorts: true, loadingRoutes: true }));
      try {
        const deviceTypeFilter = "device_type_key=ODC";
        const [devicesResult, routesResult] = await Promise.all([
          apiFetch<PaginatedResponse<DeviceLookupOption>>(`/devices?page=1&limit=500&${deviceTypeFilter}${regionQuery}`, { token }),
          apiFetch<PaginatedResponse<RouteLookupOption>>(`/routes?page=1&limit=500${regionQuery}`, { token }),
        ]);
        if (cancelled) return;

        const devices = devicesResult.data || [];
        const routes = routesResult.data || [];
        const deviceIds = new Set(devices.map((d) => d.id));

        // Fetch ports for all fetched ODC devices in one query
        let ports: PortLookupOption[] = [];
        if (deviceIds.size > 0) {
          const portsResult = await apiFetch<PaginatedResponse<PortLookupOption>>(
            `/devicePorts?page=1&limit=1000${regionQuery}`,
            { token },
          );
          if (!cancelled) {
            ports = (portsResult.data || []).filter((p) => p.device_id && deviceIds.has(p.device_id));
          }
        }

        if (!cancelled) {
          setTopologyLookupData({
            devices,
            ports,
            routes,
            customers: [],
            loadingDevices: false,
            loadingPorts: false,
            loadingRoutes: false,
          });
        }
      } catch {
        if (!cancelled) {
          setTopologyLookupData(emptyTopologyLookup());
        }
      }
    }

    void loadTopologyLookups();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item, token]);


  useEffect(() => {
    if (!isOdpDevice || !item || !token) {
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
  }, [isOdpDevice, item, token]);

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
        if (!cancelled) setError((err as Error).message || "Gagal memuat histori validasi device.");
      } finally {
        if (!cancelled) setLoadingOdpValidations(false);
      }
    }

    void loadOdpValidations();
    return () => {
      cancelled = true;
    };
  }, [category?.resource, item, token]);

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
        setError((err as Error).message || "Gagal memuat ringkasan rantai core ODP.");
      } finally {
        if (!cancelled) setLoadingOdpCoreChainSummary(false);
      }
    }

    void loadCoreChainSummary();
    return () => {
      cancelled = true;
    };
  }, [isOdpDevice, item, token]);

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
        if (!cancelled) setError((err as Error).message || "Gagal memuat relasi ODP service.");
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

  const isDeviceResource = category?.resource === "devices";

  useEffect(() => {
    if (!token || !isDeviceResource) {
      setQrLabelLogoDataUrl("");
      setQrLabelFooterText("");
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
      setQrLabelReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token, isDeviceResource]);

  async function handleSave() {
    if (!category || !item || !editable) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (category.resource === "pops" || category.resource === "devices") {
        const latitudeValidation = validateCoordinateFormat(form.latitude, "latitude");
        if (!latitudeValidation.valid) {
          throw new Error(`Latitude tidak valid: ${latitudeValidation.message}`);
        }
        const longitudeValidation = validateCoordinateFormat(form.longitude, "longitude");
        if (!longitudeValidation.valid) {
          throw new Error(`Longitude tidak valid: ${longitudeValidation.message}`);
        }
      }

      const payload = buildUpdatePayload(form, category.resource, item) as Record<string, unknown>;
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
                  throw new Error("Perangkat OTB terpilih tidak memiliki port.");
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
                throw new Error("ODC tidak memiliki port input/feeder. Silakan buat port input terlebih dahulu.");
              }

              // Find output/feeder port of OTB
              const otbPortsRes = await apiFetch<{ data: DevicePort[] }>(
                `/devicePorts?page=1&limit=100&device_id=${encodeURIComponent(currentOtbId)}`,
                { token }
              );
              const otbPorts = otbPortsRes.data || [];
              const otbPort = otbPorts.find(p => p.direction?.toLowerCase() === 'out') || otbPorts[0];
              if (!otbPort) {
                throw new Error("Perangkat OTB terpilih tidak memiliki port.");
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
      setMessage("Perubahan berhasil disimpan.");
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
            const odcResult = await apiFetch<{ data: any }>(`/devices/${refreshed.data.id}/odc-chain-summary`, { token });
            setOdcChainSummary(odcResult.data || null);
          } catch {} finally {
            setLoadingOdcChainSummary(false);
          }
        }
      }

      setForm(buildEditableForm(refreshed.data, category.resource, finalSummary));
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan perubahan.");
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

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setGalleryIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!galleryOpen || !carouselApi) return;
    carouselApi.scrollTo(galleryIndex, true);
  }, [galleryOpen, carouselApi, galleryIndex]);

  function handleNewImageFilesChange(files: FileList | null) {
    const list = Array.from(files || []);
    if (!list.length) {
      setNewImageFiles([]);
      return;
    }
    const existingCount = infoImageAttachments.length;
    if (existingCount + list.length > MAX_IMAGE_ATTACHMENTS) {
      setError(`Maksimal ${MAX_IMAGE_ATTACHMENTS} gambar per data.`);
      return;
    }
    const invalidSize = list.find((file) => file.size > MAX_IMAGE_FILE_SIZE_BYTES);
    if (invalidSize) {
      setError(`File "${invalidSize.name}" melebihi batas 5MB.`);
      return;
    }
    const invalidType = list.find((file) => !file.type.startsWith("image/"));
    if (invalidType) {
      setError(`File "${invalidType.name}" bukan format gambar.`);
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
      setError("Nama file tidak boleh kosong.");
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
      setMessage("Nama file attachment berhasil diperbarui.");
    } catch (err) {
      setError((err as Error).message || "Gagal rename attachment.");
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
      setMessage(created ? `${created} port ODP berhasil dibuat.` : "Semua port ODP sudah tersedia.");
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>(
        `/topology/devices/${encodeURIComponent(item.id)}/summary?limit=200`,
        { token },
      );
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
      setError((err as Error).message || "Gagal generate port ODP.");
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
      setMessage(`Port ${port.port_label || port.port_index} berhasil diperbarui.`);
    } catch (err) {
      setError((err as Error).message || "Gagal update port ODP.");
    } finally {
      setUpdatingPortId("");
    }
  }

  async function handleArchiveOdpDevice() {
    if (!item || !token || !category) return;
    const ok = window.confirm("Archive ODP ini? Data akan masuk ke Trash dan bisa di-restore.");
    if (!ok) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "DELETE",
        token,
      });
      setMessage("ODP berhasil di-archive. Mengarahkan ke halaman Trash...");
      window.setTimeout(() => {
        window.location.href = `/trash?entity_type=${encodeURIComponent(category.resource)}&entity_id=${encodeURIComponent(item.id)}`;
      }, 450);
    } catch (err) {
      setError((err as Error).message || "Gagal archive ODP.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveOdpPort(port: DevicePort) {
    if (!token) return;
    const label = port.port_label || `Port ${port.port_index}`;
    const ok = window.confirm(`Archive ${label}? Port akan masuk ke Trash.`);
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
      setMessage(`${label} berhasil di-archive.`);
    } catch (err) {
      setError((err as Error).message || `Gagal archive ${label}.`);
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
      setError("Pilih port ODP target terlebih dahulu.");
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
      setMessage(result?.data?.created ? "Draft link berhasil dibuat." : "Draft link sudah ada.");

      const refreshed = await apiFetch<{ data: OdpCoreChainSummary }>(`/devices/${item.id}/core-chain-draft`, { token });
      setOdpCoreChainSummary(refreshed.data || null);
    } catch (err) {
      setError((err as Error).message || "Gagal membuat draft link ODP.");
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
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${sanitizeFileName(valueOf(item.device_id, "device"))}-qr-label.png`;
      link.click();
    };

    void download().catch((err) => {
      setError((err as Error).message || "Gagal download QR label.");
    });
  }

  function openReminderDialog() {
    setReminderError("");
    setReminderDialogOpen(true);
  }

  async function handleSendValidationReminder() {
    if (!item || !selectedReminderValidatorId) {
      setReminderError("Pilih validator terlebih dahulu.");
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
      setMessage("Reminder validasi berhasil dikirim ke validator.");
    } catch (err) {
      setReminderError((err as Error).message || "Gagal mengirim reminder validasi.");
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleDownloadValidationEvidence(record: OdpValidationRecord) {
    if (!record.evidence_attachment_id || !token) return;
    try {
      await downloadAttachmentFile(record.evidence_attachment_id, token);
    } catch (err) {
      setError((err as Error).message || "Gagal download evidence validasi.");
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
          throw new Error("ODP belum bisa ditandai valid karena rantai core belum lengkap (ODC, splitter, kabel distribusi, dan mapping core).");
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
      setMessage("Catatan validasi tersimpan sebagai histori. Status dan detail ODP tidak berubah sampai request disetujui adminregion dan superadmin.");
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan validasi lapangan ODP.");
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
      setMessage("Port berhasil di-assign.");
      setTrayDrawerOpen(false);
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>("/topology/devices/" + encodeURIComponent(activeItem.id) + "/summary?limit=200", { token });
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
    const message = (err as Error).message || "Gagal assign port.";
    const isPortConflict = /already used|not idle|409|conflict/i.test(message);
    setError(isPortConflict ? "Port sudah digunakan oleh koneksi lain. Daftar port sudah diperbarui, silakan pilih port lain." : message);

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
      setMessage("Koneksi port diputuskan.");
      setTrayDrawerOpen(false);
      const refreshed = await apiFetch<{ data: DeviceTopologySummary }>("/topology/devices/" + encodeURIComponent(activeItem.id) + "/summary?limit=200", { token });
      const summary = refreshed.data || {};
      setOdpPorts((summary.ports?.items || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      setDevicePortConnections(summary.connections?.items || []);
      setDeviceTopologySummary(summary);
    } catch (err) {
      setError((err as Error).message || "Gagal putuskan koneksi.");
    } finally {
      setTrayAssignLoading(false);
    }
  }
if (!category) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="space-y-3 pr-3">
          <p className="text-sm text-destructive">Kategori tidak ditemukan.</p>
          <Button asChild variant="outline">
            <Link href="/data-management">
              <ArrowLeft className="mr-2 size-4" />
              Kembali
            </Link>
          </Button>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
        <DeviceDetailHeader
          categoryLabel={category.label}
          title={title}
          backHref={backToListHref}
          actions={
            <>
              {canOpenTopology && item ? (
                <Button asChild variant="outline">
                  <Link href={topologyHref}>{category.resource === "devices" ? "Trace Topology" : "Open Topology"}</Link>
                </Button>
              ) : null}
              {canOpenTopology && category.resource === "devices" && item ? (
                <Button asChild variant="outline">
                  <Link href={topologyConnectionHref}>Create Connection</Link>
                </Button>
              ) : null}
              {canOpenAsBuilt && category?.resource === "devices" && item ? (
                <Button asChild variant="outline">
                  <Link href={asBuiltHref}>Open As-Built</Link>
                </Button>
              ) : null}
            </>
          }
        />

        {loading ? <DeviceDetailLoadingSkeleton categoryLabel={category.label} /> : null}
        {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        {!loading && item ? (
          <>
            {category.resource === "devices" ? (
              <DeviceOperationalSummary
                item={item}
                relationLabels={relationLabels}
                relationLoading={relationLabelsLoading}
                effectiveValidationStatus={detailValidationStatus}
              />
            ) : null}

            <Collapsible open={isOdpDevice ? odpInfoOpen : true} onOpenChange={isOdpDevice ? setOdpInfoOpen : undefined}>
              <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>{isOdpDevice ? "Informasi ODP" : `Informasi ${category.label}`}</CardTitle>
                    
          {/* Fase 2b --- Port Assignment Drawer untuk OTB */}
          {isOtbDevice && (
            <PortAssignmentDrawer
              open={trayDrawerOpen}
              onOpenChange={setTrayDrawerOpen}
              port={traySelectedPort}
              deviceTypeKey={valueOf(item?.device_type_key)}
              direction={trayDirection}
              onDirectionChange={handleTrayDirectionChange}
              peerDevices={trayPeerDevices}
              peerDeviceValue={trayPeerDeviceValue}
              onPeerDeviceChange={handleTrayPeerDeviceChange}
              peerPorts={trayPeerPorts}
              peerPortValue={trayPeerPortValue}
              onPeerPortChange={handleTrayPeerPortChange}
              onAssign={handleAssign}
              onDisconnect={handleDisconnect}
              loading={trayAssignLoading}
            />
          )}
{isOdpDevice ? (
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="size-8">
                          <ChevronDown className={`size-4 transition-transform ${odpInfoOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                    ) : null}
                  {/* SWITCH-style grid layout (driven by layout_type) */}
                  {resolvedLayoutType === "switch_grid" ? (
                    <SwitchPortContainer
                      devicePorts={odpPorts}
                      connections={devicePortConnections}
                      totalPorts={Math.max(Number(valueOf(item?.total_ports)) || 0, Number(valueOf(item?.capacity_core)) || 0) || 0}
                      accessPortCount={(() => {
                        const specs = (item as any)?.specifications;
                        return specs?.access_port_count ? Number(specs.access_port_count) : undefined;
                      })()}
                      uplinkPortCount={(() => {
                        const specs = (item as any)?.specifications;
                        return specs?.uplink_port_count ? Number(specs.uplink_port_count) : undefined;
                      })()}
                      loading={loadingOdpPorts}
                      onPortClick={handlePortClick}
                    />
                  ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {editable && !isEditing ? (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </Button>
                    ) : null}
                    {category.resource === "pops" ? <Badge variant="outline">{valueOf(item.status_pop)}</Badge> : null}
                    {category.resource === "devices" ? <Badge variant="outline">{valueOf(item.status)}</Badge> : null}
                    {category.resource !== "customers" ? (
                      <Badge variant="outline" className={mapValidationStatus(detailValidationStatus).className}>
                        {mapValidationStatus(detailValidationStatus).label}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {category.resource !== "customers" ? (
                  <CardDescription>
                    Updated: {formatDateTime(valueOf(item.updated_at || item.created_at))}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-5">
                  {category.resource === "pops" ? (
                    <PopDetailForm
                      form={form}
                      onChange={setForm}
                      editing={isEditing}
                      relationLabels={relationLabels}
                      relationLoading={relationLabelsLoading}
                    />
                  ) : null}

              {category.resource === "customers" ? (
                <CustomerDetailForm item={item} relationLabels={relationLabels} relationLoading={relationLabelsLoading} />
              ) : null}

              {category.resource === "devices" ? (
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
                  provinces={[]}
                  cities={[]}
                  topologyLookup={topologyLookupData}
                  topologySummary={deviceTopologySummary}
                  coreCapacities={[]}
                  cableTypes={cableTypes}
                  routeTypes={routeTypes}
                  deviceCoreCapacities={deviceCoreCapacities}
                  closureTypes={closureTypes}
                  odcChainSummary={isOdcDevice ? odcChainSummary : undefined}
                  odcChainLoading={isOdcDevice ? loadingOdcChainSummary : undefined}
                  otbChainSummary={isOtbDevice ? otbChainSummary : undefined}
                  otbChainLoading={isOtbDevice ? loadingOtbChainSummary : undefined}
                />
              ) : null}

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

              {category.resource === "devices" && !isOdpDevice ? (
                <div className="space-y-3">
                  <DeviceTechnicalSummarySection
                    item={item}
                    topologySummary={deviceTopologySummary}
                    loading={loadingOdpPorts}
                  />
                  {(isOdcDevice || isOtbDevice) && (
                    <DeviceTopologyChainVisualizer deviceId={item.id} token={token} />
                  )}
                  <DeviceLinkBudgetSection deviceId={item.id} regionId={valueOf(item.region_id)} token={token} />
                  {/* OLT-style slot layout (driven by layout_type) */}
                  {resolvedLayoutType === "olt_slot" ? (
                    <OltPortContainer
                      devicePorts={odpPorts}
                      connections={devicePortConnections}
                      totalPorts={Math.max(Number(valueOf(item?.total_ports)) || 0, Number(valueOf(item?.capacity_core)) || 0) || 0}
                      ponPortCount={(() => {
                        const specs = (item as any)?.specifications;
                        return specs?.pon_port_count ? Number(specs.pon_port_count) : undefined;
                      })()}
                      uplinkPortCount={(() => {
                        const specs = (item as any)?.specifications;
                        return specs?.uplink_port_count ? Number(specs.uplink_port_count) : undefined;
                      })()}
                      loading={loadingOdpPorts}
                      onPortClick={handlePortClick}
                    />
                  ) : null}
                  {/* Port Tray untuk OTB/ODC/JC / Summary Grid untuk lainnya */}
                  {showPortTray ? (
                    <PortTrayContainer
                      devicePorts={odpPorts}
                      connections={devicePortConnections}
                      totalPorts={Math.max(Number(valueOf(item?.total_ports)) || 0, Number(valueOf(item?.capacity_core)) || 0) || 0}
                      usedCore={Number(valueOf(item?.used_core)) || 0}
                      deviceTypeKey={valueOf(item?.device_type_key)}
                      deviceTypeLabel={valueOf(item?.device_type_key)}
                      loading={loadingOdpPorts}
                      trayConfigPayload={(() => {
                        if (!item || category?.resource !== "devices") return undefined;
                        const mId = valueOf(item.model_id);
                        if (!mId) return undefined;
                        const mdl = relationReferenceMaps.models.get(mId);
                        if (!mdl) return undefined;
                        // Langsung baca tray_config dari asset_model response
                        return (mdl as Record<string, unknown>)["tray_config"] as Record<string, unknown> | undefined;
                      })()}
                      onPortClick={handlePortClick}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="lg:max-w-[280px]">
                        <DeviceQrActionPanel
                          qrDataUrl={qrDataUrl}
                          logoDataUrl={qrLabelLogoDataUrl}
                          logoReady={qrLabelReady}
                          deviceTypeLabel={valueOf(item.device_type_key, "Device")}
                          showReminder={false}
                          reminderDisabled
                          onOpenReminder={() => undefined}
                          onDownloadQrLabel={handleDownloadQrLabel}
                        />
                      </div>
                      <DevicePortSummarySection
                        deviceTypeLabel={valueOf(item.device_type_key, "Device")}
                        ports={odpPorts}
                        connections={devicePortConnections}
                        coreSummary={deviceTopologySummary?.core_management?.summary || null}
                        fiberSummary={deviceTopologySummary?.fiber_cores?.summary || null}
                        readiness={deviceTopologySummary?.readiness || null}
                        loading={loadingOdpPorts}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {category.resource === "devices" && !isOdpDevice ? (
                <DeviceValidationHistorySection
                  deviceTypeLabel={valueOf(item.device_type_key, "Device")}
                  records={odpValidations}
                  loading={loadingOdpValidations}
                  onDownloadEvidence={(record) => void handleDownloadValidationEvidence(record as OdpValidationRecord)}
                />
              ) : null}

              {category.resource !== "pops" && category.resource !== "devices" && category.resource !== "customers" && category.resource !== "projects" && category.resource !== "routes" ? (
                <GenericDeviceRawSection item={item} />
              ) : null}

              {showServicePortRelations ? (
                <ServicePortRelationsPanel
                  title={category.resource === "customers" ? "ODP Service Link" : "ONT Upstream ODP"}
                  description={
                    category.resource === "customers"
                      ? "Port ODP yang terhubung ke customer ini."
                      : "Port ODP yang mengarah ke ONT ini."
                  }
                  relations={servicePortRelations}
                  loading={loadingServicePortRelations}
                />
              ) : null}

              <DeviceGallerySection
                deviceTypeLabel={category.resource === "devices" ? valueOf(item.device_type_key, "device") : category.label}
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

                  {editable && isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setForm(buildEditableForm(item, category.resource, deviceTopologySummary));
                          setNewImageFiles([]);
                          setIsEditing(false);
                        }}
                        disabled={saving}
                      >
                        Batal
                      </Button>
                      <Button onClick={() => void handleSave()} disabled={saving}>
                        <Save className="mr-2 size-4" />
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </CollapsibleContent>
              </Card>
            </Collapsible>
            {isOdpDevice ? (
              <OdpOperationsPanel
                device={item}
                ports={odpPorts}
                customers={odpCustomers}
                ontDevices={odpOntDevices}
                loadingPorts={loadingOdpPorts}
                loadingLookups={loadingOdpLookups}
                provisioning={provisioningPorts}
                updatingPortId={updatingPortId}
                validationDraft={odpValidationDraft}
                validationHistory={odpValidations}
                loadingValidationHistory={loadingOdpValidations}
                submittingValidation={submittingOdpValidation}
                qrDataUrl={qrDataUrl}
                qrLabelLogoDataUrl={qrLabelLogoDataUrl}
                qrLabelReady={qrLabelReady}
                onProvisionPorts={() => void handleProvisionOdpPorts()}
                onUpdatePort={(port, changes) => void handleUpdateOdpPort(port, changes)}
                onValidationDraftChange={setOdpValidationDraft}
                onSubmitValidation={() => void handleSubmitOdpValidation()}
                onDownloadValidationEvidence={(record) => void handleDownloadValidationEvidence(record)}
                validators={validatorOptions}
                loadingValidators={loadingValidators}
                onOpenReminder={openReminderDialog}
                onDownloadQrLabel={handleDownloadQrLabel}
                onArchiveDevice={() => void handleArchiveOdpDevice()}
                onArchivePort={(port) => void handleArchiveOdpPort(port)}
                coreChainSummary={odpCoreChainSummary}
                topologySummary={deviceTopologySummary}
                loadingCoreChainSummary={loadingOdpCoreChainSummary}
                creatingDraftLink={creatingDraftLink}
                cableDevices={odpCableDevices}
                onCreateDraftLink={(nextPayload) => void handleCreateDraftLink(nextPayload)}
                editing={isEditing}
                onStartEdit={() => setIsEditing(true)}
                token={token}
              />
            ) : null}
          </>
        ) : null}
      </div>
      <AlertDialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <AlertDialogContent className="!w-[min(96vw,1200px)] !max-w-[min(96vw,1200px)] p-3 sm:p-4">
          <AlertDialogTitle className="sr-only">Preview Gambar Attachment</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Dialog untuk melihat, navigasi, dan mengelola nama file image attachment.
          </AlertDialogDescription>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Image {Math.min(galleryIndex + 1, galleryImageAttachments.length)} / {galleryImageAttachments.length}
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
                    Download
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="icon" onClick={() => setGalleryOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <Carousel setApi={setCarouselApi} opts={{ startIndex: galleryIndex, loop: galleryImageAttachments.length > 1 }}>
              <CarouselContent>
                {galleryImageAttachments.map((attachment) => {
                  const src = imagePreviewUrls[attachment.id];
                  const fileName = attachment.name || "Attachment tidak tersedia";
                  return (
                    <CarouselItem key={attachment.id}>
                      <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                        {src ? (
                          <Image
                            src={src}
                            alt={fileName}
                            width={1200}
                            height={800}
                            className="h-[56vh] w-full object-contain sm:h-[64vh] lg:h-[70vh]"
                          />
                        ) : (
                          <div className="flex h-[56vh] items-center justify-center text-sm text-muted-foreground sm:h-[64vh] lg:h-[70vh]">
                            Preview belum tersedia
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              {galleryImageAttachments.length > 1 ? (
                <>
                  <CarouselPrevious className="left-2 top-1/2 z-20 -translate-y-1/2" />
                  <CarouselNext className="right-2 top-1/2 z-20 -translate-y-1/2" />
                </>
              ) : null}
            </Carousel>
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
                      placeholder="Nama file attachment"
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
                      {renaming ? "Menyimpan..." : "Rename"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <ValidationReminderDialog
        open={reminderDialogOpen}
        validators={validatorOptions}
        loadingValidators={loadingValidators}
        sendingReminder={sendingReminder}
        selectedValidatorId={selectedReminderValidatorId}
        error={reminderError}
        onOpenChange={setReminderDialogOpen}
        onSelectedValidatorChange={setSelectedReminderValidatorId}
        onSend={() => void handleSendValidationReminder()}
      />
      <ResponseDialog
        open={successDialogOpen}
        title="Berhasil"
        description={successDialogText}
        variant="success"
        actionLabel="Tutup"
        onOpenChange={setSuccessDialogOpen}
        onAction={() => setSuccessDialogOpen(false)}
      />
    </ScrollArea>
  );
}

function OdpTopologyReadinessSummary({
  summary,
  loading,
}: {
  summary: DeviceTopologySummary | null;
  loading: boolean;
}) {
  if (loading && !summary) {
    return (
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const portTotal = Number(summary?.ports?.summary?.total ?? summary?.ports?.items?.length ?? 0);
  const connectionTotal = Number(summary?.connections?.summary?.total ?? summary?.connections?.items?.length ?? 0);
  const coreCount = Number(summary?.core_management?.summary?.core_count ?? 0);
  const usedCoreCount = Number(summary?.core_management?.summary?.used_count ?? 0);
  const reservedCoreCount = Number(summary?.core_management?.summary?.reserved_count ?? 0);
  const fiberCoreTotal = Number(summary?.fiber_cores?.summary?.total ?? 0);
  const fiberLossWarnings = Number(summary?.fiber_cores?.summary?.loss_warnings ?? 0);
  const fiberDamaged = Number(summary?.fiber_cores?.summary?.damaged ?? 0);
  const readiness = summary?.readiness || {};
  const readinessItems = [
    { label: "Port", ready: Boolean(readiness.has_ports) },
    { label: "Connection", ready: Boolean(readiness.has_connections) },
    { label: "Core summary", ready: Boolean(readiness.has_core_summary) },
    { label: "Fiber core", ready: Boolean(readiness.has_fiber_core_inventory) },
  ];

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Topology Readiness</p>
          <p className="text-xs text-muted-foreground">Ringkasan port, connection, core, dan fiber dari inventory.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {readinessItems.map((item) => (
            <Badge key={item.label} variant="outline" className={item.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
              {item.label}: {item.ready ? "ready" : "pending"}
            </Badge>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <OdpTopologyMetric label="Port" value={portTotal} description="Provisioned endpoint" />
        <OdpTopologyMetric label="Connection" value={connectionTotal} description="Relasi port aktif/planned" />
        <OdpTopologyMetric label="Core" value={coreCount} description={`${usedCoreCount} used, ${reservedCoreCount} reserved`} />
        <OdpTopologyMetric label="Fiber Core" value={fiberCoreTotal} description={`${fiberLossWarnings} warning, ${fiberDamaged} damaged`} />
      </div>
    </div>
  );
}

function OdpTopologyMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none">{Number.isFinite(value) ? value : 0}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}

function OdpOperationsPanel({
  device,
  ports,
  customers,
  ontDevices,
  loadingPorts,
  loadingLookups,
  provisioning,
  updatingPortId,
  validationDraft,
  validationHistory,
  loadingValidationHistory,
  submittingValidation,
  qrDataUrl,
  qrLabelLogoDataUrl,
  qrLabelReady,
  onProvisionPorts,
  onUpdatePort,
  onValidationDraftChange,
  onSubmitValidation,
  onDownloadValidationEvidence,
  validators,
  loadingValidators,
  onOpenReminder,
  onDownloadQrLabel,
  onArchiveDevice,
  onArchivePort,
  coreChainSummary,
  topologySummary,
  loadingCoreChainSummary,
  creatingDraftLink,
  cableDevices,
  onCreateDraftLink,
  editing,
  onStartEdit,
  token,
}: {
  device: GenericItem;
  ports: DevicePort[];
  customers: OdpCustomerOption[];
  ontDevices: OdpOntOption[];
  loadingPorts: boolean;
  loadingLookups: boolean;
  provisioning: boolean;
  updatingPortId: string;
  validationDraft: OdpValidationDraft;
  validationHistory: OdpValidationRecord[];
  loadingValidationHistory: boolean;
  submittingValidation: boolean;
  qrDataUrl: string;
  qrLabelLogoDataUrl: string;
  qrLabelReady: boolean;
  onProvisionPorts: () => void;
  onUpdatePort: (port: DevicePort, changes: Partial<DevicePort>) => void;
  onValidationDraftChange: (next: OdpValidationDraft | ((prev: OdpValidationDraft) => OdpValidationDraft)) => void;
  onSubmitValidation: () => void;
  onDownloadValidationEvidence: (record: OdpValidationRecord) => void;
  validators: ValidatorOption[];
  loadingValidators: boolean;
  onOpenReminder: () => void;
  onDownloadQrLabel: () => void;
  onArchiveDevice: () => void;
  onArchivePort: (port: DevicePort) => void;
  coreChainSummary: OdpCoreChainSummary | null;
  topologySummary: DeviceTopologySummary | null;
  loadingCoreChainSummary: boolean;
  creatingDraftLink: boolean;
  cableDevices: OdpCableOption[];
  editing: boolean;
  onStartEdit: () => void;
  token: string | null;
  onCreateDraftLink: (payload: {
    upstreamPortId: string;
    odpPortId: string;
    cableDeviceId?: string;
    coreStart?: number;
    coreEnd?: number;
    fiberCount?: number;
  }) => void;
}) {
  const totalPorts = ports.length || Number(device.total_ports || 0) || 0;
  const usedPorts = ports.filter((port) => port.status === "used").length || Number(device.used_ports || 0) || 0;
  const reservedPorts = ports.filter((port) => port.status === "reserved").length;
  const downPorts = ports.filter((port) => port.status === "down" || port.status === "maintenance").length;
  const idlePorts = Math.max(0, totalPorts - usedPorts - reservedPorts - downPorts);
  const latestValidationRecord = validationHistory[0] || null;
  const latestRequestStatus = latestValidationRecord?.request_status || null;
  const effectiveDeviceValidationStatus = getEffectiveDeviceValidationStatus(
    device,
    latestRequestStatus,
    latestValidationRecord ? isFinalValidationRecord(latestValidationRecord) : false,
  );
  const currentDeviceValidationUi = mapValidationStatus(effectiveDeviceValidationStatus);
  const latestRejectNote =
    latestValidationRecord?.superadmin_review_note ||
    latestValidationRecord?.adminregion_review_note ||
    "";
  const odpPortOptions = ports.map((port) => ({
    value: port.id,
    label: `${port.port_label || `Port ${port.port_index}`} (${port.status || "idle"})`,
  }));
  const cableOptions = [
    { value: "__none__", label: "Tanpa cable device" },
    ...cableDevices.map((cable) => ({
      value: cable.id,
      label: [cable.device_name, cable.device_id].filter(Boolean).join(" - ") || "Cable device tidak tersedia",
    })),
  ];
  const [draftTargetPortId, setDraftTargetPortId] = useState("");
  const [draftCableDeviceId, setDraftCableDeviceId] = useState("__none__");
  const [draftCoreStart, setDraftCoreStart] = useState("");
  const [draftCoreEnd, setDraftCoreEnd] = useState("");
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [validationOpen, setValidationOpen] = useState(false);
  const defaultOdpPortId = (ports.find((port) => (port.status || "").toLowerCase() === "idle") || ports[0])?.id || "";
  const effectiveDraftTargetPortId = draftTargetPortId || defaultOdpPortId;
  const latestPortSnapshotByIndex = useMemo(() => {
    const latest = validationHistory.find((record) => isFinalValidationRecord(record) && record.payload?.device_ports?.length);
    return new Map((latest?.payload?.device_ports || []).map((port) => [Number(port.port_index), port]));
  }, [validationHistory]);

  return (
    <div className="space-y-3">
      <OdpOperationsShell
        open={operationsOpen}
        editing={editing}
        provisioning={provisioning}
        onOpenChange={setOperationsOpen}
        onStartEdit={onStartEdit}
        onProvisionPorts={onProvisionPorts}
        onArchiveDevice={onArchiveDevice}
      >
          <OdpPortMetrics
            totalPorts={totalPorts}
            usedPorts={usedPorts}
            idlePorts={idlePorts}
            reservedPorts={reservedPorts}
            downPorts={downPorts}
          />

          <OdpCoreChainSummarySection
            coreChainSummary={coreChainSummary}
            loading={loadingCoreChainSummary}
            odpPortOptions={odpPortOptions}
            cableOptions={cableOptions}
            effectiveDraftTargetPortId={effectiveDraftTargetPortId}
            draftCableDeviceId={draftCableDeviceId}
            draftCoreStart={draftCoreStart}
            draftCoreEnd={draftCoreEnd}
            creatingDraftLink={creatingDraftLink}
            onDraftTargetPortChange={setDraftTargetPortId}
            onDraftCableDeviceChange={setDraftCableDeviceId}
            onDraftCoreStartChange={setDraftCoreStart}
            onDraftCoreEndChange={setDraftCoreEnd}
            onCreateDraftLink={onCreateDraftLink}
           />

          <DeviceTopologyChainVisualizer deviceId={device.id} token={token} />

          <OdpTopologyReadinessSummary summary={topologySummary} loading={loadingPorts} />

          <DeviceLinkBudgetSection deviceId={device.id} regionId={valueOf(device.region_id)} token={token || ""} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
            <DeviceQrActionPanel
              qrDataUrl={qrDataUrl}
              logoDataUrl={qrLabelLogoDataUrl}
              logoReady={qrLabelReady}
              deviceTypeLabel={valueOf(device.device_type_key, "ODP")}
              reminderDisabled={loadingValidators || validators.length === 0}
              onOpenReminder={onOpenReminder}
              onDownloadQrLabel={onDownloadQrLabel}
            />

            <OdpPortSection
              ports={ports}
              customers={customers}
              ontDevices={ontDevices}
              loadingPorts={loadingPorts}
              loadingLookups={loadingLookups}
              updatingPortId={updatingPortId}
              editing={editing}
              latestPortSnapshotByIndex={latestPortSnapshotByIndex}
              onUpdatePort={onUpdatePort}
              onArchivePort={onArchivePort}
            />
          </div>
      </OdpOperationsShell>

      <Card>
        <Collapsible open={validationOpen} onOpenChange={setValidationOpen}>
          <CardHeader className="px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                <div>
                  <CardTitle className="text-sm">Validasi Lapangan</CardTitle>
                  <CardDescription>Simpan status validasi dan catatan lapangan.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8">
                    <ChevronDown className={`size-4 transition-transform ${validationOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                </div>
                <div className="flex items-center gap-2">
                  {!editing ? (
                    <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : null}
                  <Badge variant="outline" className={currentDeviceValidationUi.className}>
                    Current: {currentDeviceValidationUi.label}
                  </Badge>
                </div>
              </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 px-3 pb-3 pt-0">
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-[180px_1fr_240px_auto]">
                <Combobox
                  value={validationDraft.status}
                  onValueChange={(status) =>
                    onValidationDraftChange((prev) => ({ ...prev, status: status as OdpValidationDraft["status"] }))
                  }
                  disabled={submittingValidation || !editing}
                  triggerClassName="h-9 text-xs"
                  options={[
                    { value: "valid", label: "Valid" },
                    { value: "warning", label: "Warning" },
                    { value: "invalid", label: "Invalid" },
                  ]}
                />
                <Input
                  value={validationDraft.findings}
                  onChange={(event) => onValidationDraftChange((prev) => ({ ...prev, findings: event.target.value }))}
                  disabled={submittingValidation || !editing}
                  placeholder="Temuan lapangan atau catatan validasi"
                  className="h-9 text-xs"
                />
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Checklist format baru tersedia di halaman Field Validation.
                </div>
                <Button type="button" onClick={onSubmitValidation} disabled={submittingValidation || !editing} className="h-9">
                  <ImagePlus className="mr-2 size-4" />
                  {submittingValidation ? "Menyimpan..." : "Submit"}
                </Button>
              </div>

              <OdpValidationHistorySection
                records={validationHistory}
                validators={validators}
                loading={loadingValidationHistory}
                latestRequestStatus={latestRequestStatus}
                latestUpdatedAt={latestValidationRecord?.validated_at || latestValidationRecord?.updated_at || null}
                latestRejectNote={latestRejectNote}
                onDownloadEvidence={(record) => onDownloadValidationEvidence(record)}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

function ServicePortRelationsPanel({
  title,
  description,
  relations,
  loading,
}: {
  title: string;
  description: string;
  relations: ServicePortRelation[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">{relations.length} link</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {loading ? (
          <AppLoading label="Memuat relasi ODP..." />
        ) : relations.length ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {relations.map((port) => {
              const odp = port.odpDevice;
              return (
                <div key={port.id} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 shrink-0 rounded-full ${getOdpPortStatusClass(port.status)}`} />
                        <p className="truncate text-sm font-medium">{odp?.device_name || "ODP"}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{odp?.device_id || port.device_id || "-"}</p>
                    </div>
                    <Badge variant="secondary">{port.status || "idle"}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <RelationInfo label="Port" value={port.port_label || `Port ${port.port_index}`} />
                    <RelationInfo label="Customer" value={port.customer_number || port.customer_name || "-"} />
                    <RelationInfo label="Occupied" value={formatDate(valueOf(port.occupied_at))} />
                    <RelationInfo label="Port ID" value={port.port_id || "-"} />
                  </div>
                  {port.notes ? <p className="mt-2 text-xs text-muted-foreground">{port.notes}</p> : null}

                  {odp?.id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/data-management/list/odp/${odp.id}`}>Open ODP</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada port ODP yang terhubung ke data ini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceDetailLoadingSkeleton({ categoryLabel }: { categoryLabel: string }) {
  const identityFields = ["Device Name", "Inventory ID", "Type", "Region", "POP", "Installation Date"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {identityFields.map((field) => (
            <div key={field} className="min-h-[6.5rem] rounded-lg border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</p>
              <Skeleton className="mt-4 h-5 w-3/4 rounded-md" />
              <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`${categoryLabel}-${index}`} className="space-y-1.5">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDetailForm({
  item,
  relationLabels,
  relationLoading = false,
}: {
  item: GenericItem;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
}) {
  const display = buildCustomerRelationDisplay(item, relationLabels);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      <DisplayField label="Customer Name" value={valueOf(item.customer_name, "-")} compact />
      <DisplayField label="CID" value={valueOf(item.customer_number, "-")} compact />
      <DisplayField label="Service Type" value={display.serviceType} loading={relationLoading} compact />
      <DisplayField label="POP" value={display.pop} loading={relationLoading} compact />
      <DisplayField label="Project" value={display.project} loading={relationLoading} compact />
      <DisplayField label="Region" value={display.region} loading={relationLoading} compact />
      <DisplayField label="Status" value={valueOf(item.status, "-")} compact />
      <DisplayField label="Installation Date" value={formatDate(valueOf(item.installation_date))} compact />
      <DisplayField label="Tags" value={arrayToCsv(item.tags) || "-"} compact />
      <DisplayField className="md:col-span-2 xl:col-span-3" label="Address" value={valueOf(item.address, "-")} compact />
      <DisplayField label="Province" value={relationLabels.province || valueOf(item.province, "-")} loading={relationLoading} compact />
      <DisplayField label="City/Kabupaten" value={relationLabels.city || valueOf(item.city, "-")} loading={relationLoading} compact />
      <DisplayField label="Longitude" value={valueOf(item.longitude, "-")} compact />
      <DisplayField label="Latitude" value={valueOf(item.latitude, "-")} compact />
    </div>
  );
}

function ProjectDetailForm({
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
  const attachmentCount = countAttachmentRefs(item.image_attachments, item.image_attachment_id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <DisplayField label="Project Name" value={valueOf(item.project_name, "-")} compact />
        <DisplayField label="Project ID" value={valueOf(item.project_id, "-")} compact />
        <DisplayField label="Project Code" value={valueOf(item.project_code, "-")} compact />
        <DisplayField label="Region" value={relationLabels.region || "-"} loading={relationLoading} compact />
        <DisplayField label="POP" value={formatPopDisplay(relationLabels.pop, relationLabels.popCode)} loading={relationLoading} compact />
        <DisplayField label="Status" value={valueOf(item.status, "-")} compact />
        <DisplayField className="md:col-span-2 xl:col-span-3" label="Description" value={valueOf(item.description, "-")} compact />
        <DisplayField label="BAST Number" value={valueOf(item.bast_number, "-")} compact />
        <DisplayField label="SPK Number" value={valueOf(item.spk_number, "-")} compact />
        <DisplayField label="Vendor" value={valueOf(item.vendor_name, "-")} compact />
        <DisplayField label="Start Date" value={formatDate(valueOf(item.start_date))} compact />
        <DisplayField label="End Date" value={formatDate(valueOf(item.end_date))} compact />
        <DisplayField label="Budget" value={valueOf(item.budget_value, "-")} compact />
        <DisplayField label="Tags" value={arrayToCsv(item.tags) || "-"} compact />
        <DisplayField label="Attachments" value={attachmentCount ? `${attachmentCount} file` : "-"} compact />
        <DisplayField label="Created" value={formatDateTime(valueOf(item.created_at))} compact />
        <DisplayField label="Updated" value={formatDateTime(valueOf(item.updated_at))} compact />
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

function ProjectEvidenceHubSection({
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
          <h3 className="text-sm font-semibold text-foreground">Project Evidence Hub</h3>
          <p className="text-xs text-muted-foreground">Route, as-built document, dan evidence project dari resource existing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={asBuiltWorkspaceHref}>Open As-Built</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={asBuiltDocumentsHref}>Documents</Link>
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
            <ProjectAssetMetric label="Routes" value={`${routes.length}`} />
            <ProjectAssetMetric label="As-Built Docs" value={`${asBuiltDocuments.length}`} />
            <ProjectAssetMetric label="Evidence Files" value={attachmentCount ? `${attachmentCount}` : "-"} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ProjectLinkedList
              title="Project Routes"
              emptyText="Belum ada route yang terhubung ke project ini."
              items={routes.slice(0, 5).map((route) => ({
                id: route.id,
                href: `/data-management/list/route/${route.id}${regionId ? `?region_id=${encodeURIComponent(regionId)}` : ""}`,
                title: valueOf(route.route_name, valueOf(route.route_id, route.id)),
                subtitle: [valueOf(route.route_code), valueOf(route.route_type), valueOf(route.status)].filter(Boolean).join(" | "),
              }))}
            />
            <ProjectLinkedList
              title="As-Built Documents"
              emptyText="Belum ada as-built document yang terhubung ke project ini."
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

function ProjectLinkedList({
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

function ProjectAssetRollupSection({
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
  const totalCableCore = cableAssets.reduce((sum, asset) => sum + numberValue(asset.capacity_core), 0);
  const usedCableCore = cableAssets.reduce((sum, asset) => sum + numberValue(asset.used_core), 0);
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
          <h3 className="text-sm font-semibold text-foreground">Project Assets</h3>
          <p className="text-xs text-muted-foreground">Aset pasif yang terhubung melalui project_id.</p>
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
            <ProjectAssetMetric label="By Type" value={formatCounts(typeCounts)} />
            <ProjectAssetMetric label="Validation" value={formatCounts(validationCounts)} />
            <ProjectAssetMetric label="Cable Core" value={totalCableCore ? `${usedCableCore}/${totalCableCore} used` : "-"} />
            <ProjectAssetMetric label="Passive Assets" value={`${passiveAssets.length}/${assets.length}`} />
            <ProjectAssetMetric label="Topology Relations" value={`${coreRelations.length}`} />
            <ProjectAssetMetric label="Relation Status" value={formatCounts(relationStatusCounts)} />
            <ProjectAssetMetric label="Route/Cable Linked" value={`${relationsWithRoute}/${relationsWithCable}`} />
            <ProjectAssetMetric label="Project Warnings" value={`${crossProjectWarnings.length}`} />
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Topology Relation Consistency</p>
                <p className="text-xs text-muted-foreground">Cross-project relation bersifat warning-first, bukan hard-block.</p>
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
                      Asset berbeda project: {mismatchedAssets.map(formatProjectAssetName).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Tidak ada cross-project relation yang terdeteksi dari data project ini.</p>
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
                      <Link href={topologyHref}>Trace</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {assetsForSummary.length > visibleAssets.length ? (
            <p className="text-xs text-muted-foreground">Menampilkan {visibleAssets.length} dari {assetsForSummary.length} aset terkait.</p>
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
          Belum ada OTB, ODC, ODP, JC, HH/MH, atau kabel yang terhubung ke project ini. Isi Project pada form asset agar material, BAST/SPK, dan evidence project bisa dilacak.
        </div>
      )}
    </section>
  );
}

function ProjectAssetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

function formatProjectAssetName(asset: ProjectAssetItem) {
  return valueOf(asset.device_name, valueOf(asset.device_id, asset.id));
}

function RouteDetailForm({
  item,
  relationLabels,
  relationLoading = false,
}: {
  item: GenericItem;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
}) {
  const geometryStatus = hasRouteGeometry(item.path_geojson) ? "Geometry tersedia" : "Geometry belum tersedia";
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      <DisplayField label="Route Name" value={valueOf(item.route_name, "-")} compact />
      <DisplayField label="Route ID" value={valueOf(item.route_id, "-")} compact />
      <DisplayField label="Route Code" value={valueOf(item.route_code, "-")} compact />
      <DisplayField label="Region" value={relationLabels.region || "-"} loading={relationLoading} compact />
      <DisplayField label="POP" value={formatPopDisplay(relationLabels.pop, relationLabels.popCode)} loading={relationLoading} compact />
      <DisplayField label="Project" value={relationLabels.project || "-"} loading={relationLoading} compact />
      <DisplayField label="Route Type" value={valueOf(item.route_type, "-")} compact />
      <DisplayField label="Status" value={valueOf(item.status, "-")} compact />
      <DisplayField label="Distance" value={formatDistanceMeters(item.distance_meters)} compact />
      <DisplayField label="Start Asset" value={relationLabels.startAsset || "-"} loading={relationLoading} compact />
      <DisplayField label="End Asset" value={relationLabels.endAsset || "-"} loading={relationLoading} compact />
      <DisplayField label="Map Geometry" value={geometryStatus} compact />
      <DisplayField label="Tags" value={arrayToCsv(item.tags) || "-"} compact />
      <DisplayField label="Created" value={formatDateTime(valueOf(item.created_at))} compact />
      <DisplayField label="Updated" value={formatDateTime(valueOf(item.updated_at))} compact />
    </div>
  );
}

function RelationInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function getOdpPortStatusClass(status?: string | null) {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance") return "bg-rose-500";
  return "bg-slate-300";
}

function summarizeOdpPorts(ports: DevicePort[], device: GenericItem) {
  const total = ports.length || Number(device.total_ports || 0) || 0;
  const used = ports.filter((port) => port.status === "used").length || Number(device.used_ports || 0) || 0;
  const reserved = ports.filter((port) => port.status === "reserved").length;
  const down = ports.filter((port) => port.status === "down" || port.status === "maintenance").length;
  return {
    total,
    used,
    idle: Math.max(0, total - used - reserved - down),
    reserved,
    down,
  };
}

function PopDetailForm({
  form,
  onChange,
  editing,
  relationLabels,
  relationLoading = false,
}: {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Identitas POP</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field label="POP Name" value={form.pop_name} onChange={(v) => onChange((p) => ({ ...p, pop_name: v }))} disabled={!editing} compact />
          <Field label="POP Code" value={form.pop_code} onChange={(v) => onChange((p) => ({ ...p, pop_code: v.toUpperCase() }))} disabled={!editing} compact />
          <DisplayField label="Region" value={relationLabels.region || "-"} loading={relationLoading} compact />
          <DisplayField label="POP Type" value={relationLabels.popType || form.pop_type || "-"} loading={relationLoading} compact />
          <Field label="Tanggal POP Aktif" type="date" value={form.tanggal_pop_aktif} onChange={(v) => onChange((p) => ({ ...p, tanggal_pop_aktif: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Status & Operasional</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label="Status POP"
            value={form.status_pop}
            options={POP_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, status_pop: v }))}
            disabled={!editing}
            compact
          />
          <SelectField
            label="Validation Status"
            value={form.validation_status}
            options={VALIDATION_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, validation_status: v }))}
            disabled={!editing}
            compact
          />
          <Field label="Validation Date" type="date" value={form.validation_date} onChange={(v) => onChange((p) => ({ ...p, validation_date: v }))} disabled={!editing} compact />
          <Field label="Tenant" value={form.tenant} onChange={(v) => onChange((p) => ({ ...p, tenant: v }))} disabled={!editing} compact />
          <Field label="PLN CID Number" value={form.pln_cid_number} onChange={(v) => onChange((p) => ({ ...p, pln_cid_number: v }))} disabled={!editing} compact />
          <Field label="PLN Payment Method" value={form.pln_payment_method} onChange={(v) => onChange((p) => ({ ...p, pln_payment_method: v }))} disabled={!editing} compact />
          <Field label="PLN Phase" value={form.pln_phase} onChange={(v) => onChange((p) => ({ ...p, pln_phase: v }))} disabled={!editing} compact />
          <Field label="PLN Wattage" type="number" value={form.pln_wattage} onChange={(v) => onChange((p) => ({ ...p, pln_wattage: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Lokasi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field className="md:col-span-2 xl:col-span-3" label="Address" value={form.address} onChange={(v) => onChange((p) => ({ ...p, address: v }))} disabled={!editing} compact />
          <DisplayField label="Province" value={relationLabels.province || form.province || "-"} loading={relationLoading} compact />
          <DisplayField label="City" value={relationLabels.city || form.city || "-"} loading={relationLoading} compact />
          <CoordinateField label="Longitude" value={form.longitude} onChange={(v) => onChange((p) => ({ ...p, longitude: v }))} disabled={!editing} compact kind="longitude" />
          <CoordinateField label="Latitude" value={form.latitude} onChange={(v) => onChange((p) => ({ ...p, latitude: v }))} disabled={!editing} compact kind="latitude" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Tags</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <Field label="Tags (CSV)" value={form.tags} onChange={(v) => onChange((p) => ({ ...p, tags: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>
    </div>
  );
}

function DisplayField({
  label,
  value,
  className = "",
  compact = false,
  loading = false,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      {loading ? (
        <Skeleton className={compact ? "h-8 w-full rounded-md" : "h-10 w-full rounded-md"} />
      ) : (
        <Input value={value} disabled className={compact ? "h-8 text-xs" : undefined} />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  className = "",
  compact = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
    </div>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
  disabled,
  compact = false,
  kind,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  kind: "longitude" | "latitude";
}) {
  const validation = validateCoordinateFormat(value, kind);
  const placeholder = kind === "latitude" ? "-6.200000" : "106.816666";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Info ${label}`}>
                <CircleHelp className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {kind === "latitude"
                ? "Format: -x.xxxxxx (contoh: -6.200000). Wajib minus di depan, minimal 6 digit desimal."
                : "Format: xxx.xxxxxx (contoh: 106.816666). Tiga digit di depan, minimal 6 digit desimal."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={compact ? "h-8 text-xs" : undefined}
      />
      {validation.state !== "idle" ? (
        <Badge variant="outline" className={`${validation.state === "valid" ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"} h-4 w-fit gap-0.5 px-1.5 text-[10px]`}>
          {validation.state === "valid" ? <CheckCircle2 className="mr-0.5 size-3" /> : <XCircle className="mr-0.5 size-3" />}
          {validation.message}
        </Badge>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onValueChange,
  disabled,
  compact = false,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label>{label}</Label>
      <Combobox
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        triggerClassName={compact ? "h-8 text-xs" : undefined}
        options={options.map((option) => ({ value: option, label: option }))}
      />
    </div>
  );
}

function buildEditableForm(item: GenericItem, resource: string, topologySummary?: DeviceTopologySummary | null): EditableForm {
  if (resource === "pops") {
    return {
      pop_id: valueOf(item.pop_id),
      pop_name: valueOf(item.pop_name),
      pop_code: valueOf(item.pop_code),
      status_pop: valueOf(item.status_pop, "planning"),
      validation_status: valueOf(item.validation_status, "unvalidated"),
      validation_date: valueOf(item.validation_date),
      tenant: valueOf(item.tenant),
      pop_type: valueOf(item.pop_type),
      tanggal_pop_aktif: valueOf(item.tanggal_pop_aktif),
      pln_cid_number: valueOf(item.pln_cid_number),
      pln_payment_method: valueOf(item.pln_payment_method),
      pln_phase: valueOf(item.pln_phase),
      pln_wattage: valueOf(item.pln_wattage),
      address: valueOf(item.address),
      city: valueOf(item.city),
      province: valueOf(item.province),
      longitude: valueOf(item.longitude),
      latitude: valueOf(item.latitude),
      tags: arrayToCsv(item.tags),
    };
  }

  if (resource === "devices") {
    const isOdc = valueOf(item.device_type_key).toUpperCase() === "ODC";
    const upConn = isOdc ? topologySummary?.odc_relations?.upstream?.[0] : null;
    const specs = (item.specifications || {}) as Record<string, unknown>;

    return {
      device_id: valueOf(item.device_id),
      device_code: valueOf(item.device_code),
      device_name: valueOf(item.device_name),
      device_type_key: valueOf(item.device_type_key),
      asset_group: valueOf(item.asset_group),
      status: valueOf(item.status, "draft"),
      installation_date: valueOf(item.installation_date),
      validation_status: valueOf(item.validation_status, "unvalidated"),
      validation_date: valueOf(item.validation_date),
      region_id: valueOf(item.region_id),
      pop_id: valueOf(item.pop_id),
      project_id: valueOf(item.project_id),
      tenant_id: valueOf(item.tenant_id),
      manufacturer_id: valueOf(item.manufacturer_id),
      brand_id: valueOf(item.brand_id),
      model_id: valueOf(item.model_id),
      serial_number: valueOf(item.serial_number),
      management_ip: valueOf(item.management_ip),
      capacity_core: valueOf(item.capacity_core),
      used_core: valueOf(item.used_core),
      total_ports: valueOf(item.total_ports),
      used_ports: valueOf(item.used_ports),
      splitter_ratio: valueOf(item.splitter_ratio),
      odp_type: valueOf(item.odp_type),
      installation_type: valueOf(item.installation_type),
      address: valueOf(item.address),
      longitude: valueOf(item.longitude),
      latitude: valueOf(item.latitude),
      tags: arrayToCsv(item.tags),
      // ODC upstream connection fields
      upstream_device_id: upConn?.peer_device?.id || "",
      upstream_cable_id: upConn?.cable_device?.id || "",
      upstream_core_start: upConn?.core_start != null ? String(upConn.core_start) : "",
      upstream_core_end: upConn?.core_end != null ? String(upConn.core_end) : "",
      // ODP topology fields (direct columns on devices table)
      source_odc_id: valueOf(item.source_odc_id),
      source_odc_port_id: valueOf(item.source_odc_port_id),
      feeder_cable_id: valueOf(item.feeder_cable_id),
      feeder_core_start: valueOf(item.feeder_core_start),
      feeder_core_end: valueOf(item.feeder_core_end),
      // OLT uplink fields (direct columns on devices table)
      uplink_switch_id: valueOf(item.uplink_switch_id),
      uplink_router_id: valueOf(item.uplink_router_id),
      // ODC port count fields
      feeder_port_count: valueOf(item.feeder_port_count),
      distribution_port_count: valueOf(item.distribution_port_count),
      // JC & Rack specifications fields
      from_cable_id: valueOf(specs.from_cable_id),
      to_cable_id: valueOf(specs.to_cable_id),
      core_start: specs.core_start != null ? String(specs.core_start) : "",
      core_end: specs.core_end != null ? String(specs.core_end) : "",
      splice_tray_count: specs.splice_tray_count != null ? String(specs.splice_tray_count) : "",
      rack_device_id: valueOf(specs.rack_device_id),
      rack_unit_position: specs.rack_unit_position != null ? String(specs.rack_unit_position) : "",
      u_height: specs.u_height != null ? String(specs.u_height) : "1",
    };
  }

  return {};
}

function buildUpdatePayload(form: EditableForm, resource: string, originalItem?: GenericItem | null): Record<string, unknown> {
  const normalizedValidation = normalizeValidationPayload(form.validation_status, form.validation_date);

  if (resource === "pops") {
    const normalizedPopCode = nullIfEmpty(form.pop_code)?.toUpperCase() || null;
    if (normalizedPopCode && !/^[A-Z]{3}$/.test(normalizedPopCode)) {
      throw new Error("POP Code harus tepat 3 huruf A-Z (contoh: CBO).");
    }

    return {
      pop_name: normalizePopName(form.pop_name) || null,
      pop_code: normalizedPopCode,
      status_pop: nullIfEmpty(form.status_pop),
      validation_status: normalizedValidation.validation_status,
      validation_date: normalizedValidation.validation_date,
      tenant: nullIfEmpty(form.tenant),
      pop_type: nullIfEmpty(form.pop_type),
      tanggal_pop_aktif: nullIfEmpty(form.tanggal_pop_aktif),
      pln_cid_number: nullIfEmpty(form.pln_cid_number),
      pln_payment_method: nullIfEmpty(form.pln_payment_method),
      pln_phase: nullIfEmpty(form.pln_phase),
      pln_wattage: numberOrNull(form.pln_wattage),
      address: nullIfEmpty(form.address),
      city: nullIfEmpty(form.city),
      province: nullIfEmpty(form.province),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
    };
  }

  if (resource === "devices") {
    // Reconstruct and merge specifications JSONB
    const originalSpecs = (originalItem?.specifications || {}) as Record<string, unknown>;
    const specs = { ...originalSpecs };

    if (form.from_cable_id !== undefined) {
      if (form.from_cable_id) specs.from_cable_id = form.from_cable_id;
      else delete specs.from_cable_id;
    }
    if (form.to_cable_id !== undefined) {
      if (form.to_cable_id) specs.to_cable_id = form.to_cable_id;
      else delete specs.to_cable_id;
    }
    if (form.core_start !== undefined) {
      if (form.core_start) specs.core_start = numberOrNull(form.core_start);
      else delete specs.core_start;
    }
    if (form.core_end !== undefined) {
      if (form.core_end) specs.core_end = numberOrNull(form.core_end);
      else delete specs.core_end;
    }
    if (form.splice_tray_count !== undefined) {
      if (form.splice_tray_count) specs.splice_tray_count = numberOrNull(form.splice_tray_count);
      else delete specs.splice_tray_count;
    }

    if (form.rack_device_id !== undefined) {
      if (form.rack_device_id) {
        specs.rack_device_id = form.rack_device_id;
        if (form.rack_unit_position) specs.rack_unit_position = numberOrNull(form.rack_unit_position);
        if (form.u_height) specs.u_height = numberOrNull(form.u_height);
      } else {
        delete specs.rack_device_id;
        delete specs.rack_unit_position;
        delete specs.u_height;
      }
    }

    return {
      device_name: normalizeDeviceName(form.device_name) || null,
      status: nullIfEmpty(form.status),
      installation_date: nullIfEmpty(form.installation_date),
      region_id: nullIfEmpty(form.region_id),
      pop_id: nullIfEmpty(form.pop_id),
      project_id: nullIfEmpty(form.project_id),
      tenant_id: nullIfEmpty(form.tenant_id),
      manufacturer_id: nullIfEmpty(form.manufacturer_id),
      brand_id: nullIfEmpty(form.brand_id),
      model_id: nullIfEmpty(form.model_id),
      serial_number: nullIfEmpty(form.serial_number),
      management_ip: nullIfEmpty(form.management_ip),
      capacity_core: numberOrNull(form.capacity_core),
      used_core: numberOrNull(form.used_core),
      total_ports: numberOrNull(form.total_ports),
      used_ports: numberOrNull(form.used_ports),
      splitter_ratio: nullIfEmpty(form.splitter_ratio),
      odp_type: nullIfEmpty(form.odp_type),
      installation_type: nullIfEmpty(form.installation_type),
      // ODP topology fields (direct columns on devices table)
      source_odc_id: nullIfEmpty(form.source_odc_id),
      source_odc_port_id: nullIfEmpty(form.source_odc_port_id),
      feeder_cable_id: nullIfEmpty(form.feeder_cable_id),
      feeder_core_start: numberOrNull(form.feeder_core_start),
      feeder_core_end: numberOrNull(form.feeder_core_end),
      // OLT uplink fields (direct columns on devices table)
      uplink_switch_id: nullIfEmpty(form.uplink_switch_id),
      uplink_router_id: nullIfEmpty(form.uplink_router_id),
      // ODC port count fields
      feeder_port_count: numberOrNull(form.feeder_port_count),
      distribution_port_count: numberOrNull(form.distribution_port_count),
      address: nullIfEmpty(form.address),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
      specifications: Object.keys(specs).length > 0 ? specs : {},
    };
  }

  return {};
}

function valueOf(value: unknown, fallback = "") {
  if (value == null) return fallback;
  const text = String(value);
  return text === "null" || text === "undefined" ? fallback : text;
}

function numberValue(value: unknown) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (!entries.length) return "-";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
}

function buildProjectDetailHref(projectId: string, regionId = "") {
  if (!projectId) return "";
  const query = regionId ? `?region_id=${encodeURIComponent(regionId)}` : "";
  return `/data-management/list/projects/${projectId}${query}`;
}

function getRelationRecord(value: unknown): RelationRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RelationRecord;
}

function buildReferenceMap(rows: Array<Record<string, unknown>> | undefined) {
  const map = new Map<string, Record<string, unknown>>();
  (rows || []).forEach((row) => {
    const id = valueOf(row.id).trim();
    if (id) map.set(id, row);
  });
  return map;
}

function getEffectiveDeviceValidationStatus(
  item: Record<string, unknown>,
  requestStatusOverride?: string | null,
  hasFinalValidationRecord = false,
) {
  const requestStatus = String(requestStatusOverride || item.latest_validation_request_status || "").trim().toLowerCase();
  if (requestStatus && requestStatus !== "validated") return requestStatus;
  if (requestStatus === "validated") return "valid";

  const status = valueOf(item.validation_status, "unvalidated").trim().toLowerCase();
  if (["valid", "validated"].includes(status) && !hasFinalValidationRecord && !item.validation_date && !item.last_validation_at) {
    return "unvalidated";
  }

  return status || "unvalidated";
}

function isFieldValidationRequestRecord(request: ValidationRequestRecord) {
  const snapshot = request.payload_snapshot || {};
  return Boolean(snapshot.field_validation || snapshot.field_inspection || snapshot.port_summary);
}

function isFinalValidationRecord(record: OdpValidationRecord) {
  const requestStatus = String(record.request_status || "").trim().toLowerCase();
  return !requestStatus || requestStatus === "validated";
}

function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "device";
}

function nullIfEmpty(value: string) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function numberOrNull(value: string) {
  const text = String(value || "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function validateCoordinateFormat(value: string, kind: "longitude" | "latitude") {
  const text = String(value || "").trim();
  if (!text) {
    return { valid: true, state: "idle" as const, message: "" };
  }

  if (text.includes(",")) {
    return { valid: false, state: "invalid" as const, message: "Gunakan titik (.) sebagai pemisah desimal, bukan koma (,)." };
  }

  if (!text.includes(".")) {
    return { valid: false, state: "invalid" as const, message: "Format harus menggunakan titik (.) desimal." };
  }

  const allowedPattern = kind === "latitude" ? /^[-0-9.]+$/ : /^[0-9.]+$/;
  if (!allowedPattern.test(text)) {
    const invalidChars = Array.from(new Set((text.match(/[^0-9.\-]/g) || []).filter((ch) => ch.trim() !== "")));
    if (invalidChars.length > 0) {
      return {
        valid: false,
        state: "invalid" as const,
        message: `Ada karakter tidak valid: ${invalidChars.join(" ")}. Gunakan hanya angka dan titik${kind === "latitude" ? ", plus minus (-) di depan" : ""}.`,
      };
    }
    if (/\s/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Koordinat tidak boleh mengandung spasi." };
    }
    return {
      valid: false,
      state: "invalid" as const,
      message: `Koordinat hanya boleh berisi angka, titik${kind === "latitude" ? ", dan minus (-) di depan" : ""}.`,
    };
  }

  if (kind === "latitude") {
    if (!text.startsWith("-")) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus diawali tanda minus (-)." };
    }
    if (!/^-?\d+\.\d+$/.test(text)) {
      return { valid: false, state: "invalid" as const, message: "Latitude hanya boleh berisi angka, minus, dan titik desimal." };
    }

    const parts = text.slice(1).split(".");
    if (parts.length !== 2) {
      return { valid: false, state: "invalid" as const, message: "Latitude harus memiliki satu titik desimal." };
    }

    const [whole, decimal] = parts;
    if (whole.length !== 1) {
      return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk latitude harus tepat 1 angka." };
    }
    if (decimal.length < 6) {
      return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk latitude minimal 6 angka." };
    }

    return {
      valid: true,
      state: "valid" as const,
      message: "Format benar.",
    };
  }

  if (text.startsWith("-")) {
    return { valid: false, state: "invalid" as const, message: "Longitude tidak boleh diawali minus (-)." };
  }
  if (!/^\d+\.\d+$/.test(text)) {
    return { valid: false, state: "invalid" as const, message: "Longitude hanya boleh berisi angka dan titik desimal." };
  }

  const parts = text.split(".");
  if (parts.length !== 2) {
    return { valid: false, state: "invalid" as const, message: "Longitude harus memiliki satu titik desimal." };
  }

  const [whole, decimal] = parts;
  if (whole.length !== 3) {
    return { valid: false, state: "invalid" as const, message: "Digit sebelum titik untuk longitude harus tepat 3 angka." };
  }
  if (decimal.length < 6) {
    return { valid: false, state: "invalid" as const, message: "Digit setelah titik untuk longitude minimal 6 angka." };
  }

  return {
    valid: true,
    state: "valid" as const,
    message: "Format benar.",
  };
}

function csvToArray(value: string) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

function arrayToCsv(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).join(", ");
}

function formatPopDisplay(popName?: string, popCode?: string) {
  const name = valueOf(popName, "-");
  const code = valueOf(popCode);
  if (name === "-" || !code || name.includes(code)) return name;
  return `${name} (${code})`;
}

function formatDeviceRelationLabel(item?: Record<string, unknown> | null) {
  if (!item) return "";
  const name = valueOf(item.device_name);
  const inventory = valueOf(item.device_id);
  const type = valueOf(item.device_type_key);
  const primary = name || inventory;
  if (!primary) return "";
  const suffix = [type, inventory && inventory !== primary ? inventory : ""].filter(Boolean).join(" | ");
  return suffix ? `${primary} (${suffix})` : primary;
}

function hasRouteGeometry(value: unknown) {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0 && value.trim() !== "{}";
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function formatDistanceMeters(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  if (number >= 1000) return `${(number / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} km`;
  return `${number.toLocaleString("id-ID", { maximumFractionDigits: 0 })} m`;
}

function countAttachmentRefs(attachments: unknown, primaryAttachmentId: unknown) {
  const ids = new Set<string>();
  const primary = valueOf(primaryAttachmentId).trim();
  if (primary) ids.add(primary);

  if (Array.isArray(attachments)) {
    attachments.forEach((attachment) => {
      if (typeof attachment === "string") {
        const id = attachment.trim();
        if (id) ids.add(id);
        return;
      }
      if (attachment && typeof attachment === "object") {
        const row = attachment as Record<string, unknown>;
        const id = valueOf(row.id || row.attachment_id || row.storage_file_id).trim();
        if (id) ids.add(id);
      }
    });
  }

  return ids.size;
}

function formatDateTime(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapValidationRequestStatusToFieldStatus(status?: string | null): OdpValidationRecord["status"] {
  if (status === "validated") return "valid";
  if (status === "pending_async" || status === "ongoing_validated") return "warning";
  if (status === "rejected_by_adminregion" || status === "rejected_by_superadmin") return "invalid";
  return "invalid";
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function normalizeValidationPayload(statusRaw: string, dateRaw: string) {
  const status = nullIfEmpty(statusRaw)?.toLowerCase() || null;
  const date = nullIfEmpty(dateRaw);

  if (!status) {
    return { validation_status: null, validation_date: null };
  }

  if (status === "unvalidated") {
    return { validation_status: status, validation_date: null };
  }

  if (date) {
    return { validation_status: status, validation_date: date };
  }

  return { validation_status: status, validation_date: currentDateISO() };
}

function currentDateISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractImageAttachments(value: unknown, primaryId: string): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();

  const pushRef = (id: string, name?: string) => {
    const cleanId = valueOf(id);
    if (!cleanId || seen.has(cleanId)) return;
    seen.add(cleanId);
    refs.push({ id: cleanId, name: name ? valueOf(name) : undefined });
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        pushRef(item);
        continue;
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const attachmentId = valueOf(row.id || row.attachment_id);
        const attachmentName = valueOf(row.file_name || row.filename || row.original_name);
        if (attachmentId) pushRef(attachmentId, attachmentName || undefined);
      }
    }
  }

  if (primaryId) {
    pushRef(primaryId);
  }

  return refs;
}

function mergeAttachmentRefs(refs: AttachmentRef[]) {
  const merged = new Map<string, AttachmentRef>();
  refs.forEach((ref) => {
    const id = valueOf(ref.id);
    if (!id || merged.has(id)) return;
    merged.set(id, { id, name: ref.name });
  });
  return Array.from(merged.values());
}

function extractValidationEvidenceAttachments(record: OdpValidationRecord): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();

  const pushRef = (id: unknown, name?: unknown) => {
    const cleanId = valueOf(id);
    if (!cleanId || seen.has(cleanId)) return;
    seen.add(cleanId);
    refs.push({ id: cleanId, name: valueOf(name) || undefined });
  };

  (record.evidence_attachments || []).forEach((attachment, index) => {
    pushRef(
      attachment.id || attachment.attachment_id,
      attachment.name || `validation-evidence-${index + 1}`,
    );
  });
  pushRef(record.evidence_attachment_id, "validation-evidence");

  const inspection = record.payload?.field_inspection || {};
  Object.values(inspection.initial_photos || {}).forEach((item) => {
    pushInspectionAttachmentRef(item, pushRef);
  });
  Object.values(inspection.condition_checks || {}).forEach((item) => {
    pushInspectionAttachmentRef(item, pushRef);
  });

  return refs;
}

function pushInspectionAttachmentRef(
  item: { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } } | undefined,
  pushRef: (id: unknown, name?: unknown) => void,
) {
  if (!item) return;
  pushRef(item.attachment?.id || item.attachment?.attachment_id, item.attachment?.name || item.label);
}

async function uploadAttachment({
  token,
  file,
  fileCategory,
  entityType,
  entityId,
}: {
  token: string;
  file: File;
  fileCategory: string;
  entityType: string;
  entityId?: string;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_category", fileCategory);
  formData.append("entity_type", entityType);
  if (entityId) {
    formData.append("entity_id", entityId);
  }

  const response = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
    method: "POST",
    token,
    body: formData,
  });

  return response.data;
}

async function resolveAttachmentIds(identifier: string, token: string): Promise<string[]> {
  const clean = valueOf(identifier);
  if (!clean) return [];
  const ordered = new Set<string>([clean]);
  const resolved = await resolveAttachment(clean, token);
  if (resolved?.id) ordered.add(String(resolved.id));
  if (resolved?.attachment_id) ordered.add(String(resolved.attachment_id));
  if (resolved?.storage_file_id) ordered.add(String(resolved.storage_file_id));
  return Array.from(ordered);
}
