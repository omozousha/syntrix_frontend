"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, ChevronDown, CircleHelp, Copy, Download, ImagePlus, Pencil, QrCode, RefreshCw, Save, Trash2, X, XCircle } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSession } from "@/components/session-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { downloadAttachmentFile, fetchAttachmentBlob } from "@/lib/attachment-utils";
import { resolveAttachment } from "@/lib/attachment-utils";
import { getCategoryBySlug } from "@/lib/data-management-config";
import { mapValidationStatus } from "@/lib/validation-status";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "";

type GenericItem = Record<string, unknown> & {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
};

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
  ont_device_id?: string | null;
  occupied_at?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
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
type OdpCableOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  region_id?: string | null;
};
type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  is_active?: boolean | null;
};
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
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
  findings?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  payload?: {
    checklist?: Partial<Record<OdpValidationChecklistKey, boolean>>;
    field_inspection?: OdpFieldInspectionPayload;
    field_validation?: OdpFieldValidationPayload;
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
  updated_at?: string | null;
  created_at?: string | null;
  finding_note?: string | null;
  adminregion_review_note?: string | null;
  superadmin_review_note?: string | null;
  checklist?: Partial<Record<OdpValidationChecklistKey, boolean>> | null;
  payload_snapshot?: {
    field_inspection?: OdpFieldInspectionPayload;
    field_validation?: OdpFieldValidationPayload;
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
  manufacturer?: string;
  brand?: string;
  model?: string;
  popType?: string;
  province?: string;
  city?: string;
};

const POP_STATUS_OPTIONS = ["planning", "active", "inactive", "maintenance"];
const DEVICE_STATUS_OPTIONS = ["draft", "installed", "active", "inactive", "maintenance", "retired"];
const VALIDATION_STATUS_OPTIONS = ["unvalidated", "valid", "warning", "invalid"];
const ODP_PORT_STATUS_OPTIONS = ["idle", "used", "reserved", "down", "maintenance"];
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
  const [splitterProfiles, setSplitterProfiles] = useState<SplitterProfileOption[]>([]);
  const [odpTypes, setOdpTypes] = useState<OdpTypeOption[]>([]);
  const [installationTypes, setInstallationTypes] = useState<InstallationTypeOption[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [renamingAttachmentId, setRenamingAttachmentId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [odpPorts, setOdpPorts] = useState<DevicePort[]>([]);
  const [loadingOdpPorts, setLoadingOdpPorts] = useState(false);
  const [updatingPortId, setUpdatingPortId] = useState("");
  const [provisioningPorts, setProvisioningPorts] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [odpCustomers, setOdpCustomers] = useState<OdpCustomerOption[]>([]);
  const [odpOntDevices, setOdpOntDevices] = useState<OdpOntOption[]>([]);
  const [odpCableDevices, setOdpCableDevices] = useState<OdpCableOption[]>([]);
  const [loadingOdpLookups, setLoadingOdpLookups] = useState(false);
  const [odpValidations, setOdpValidations] = useState<OdpValidationRecord[]>([]);
  const [loadingOdpValidations, setLoadingOdpValidations] = useState(false);
  const [odpCoreChainSummary, setOdpCoreChainSummary] = useState<OdpCoreChainSummary | null>(null);
  const [loadingOdpCoreChainSummary, setLoadingOdpCoreChainSummary] = useState(false);
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
  const isOdpDevice = category?.resource === "devices" && valueOf(item?.device_type_key).toUpperCase() === "ODP";
  const isOntDevice = category?.resource === "devices" && valueOf(item?.device_type_key).toUpperCase() === "ONT";
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
    const path = isOdpDevice ? `/field/odp/${item.id}` : `/data-management/list/${category.slug}/${item.id}`;
    if (APP_BASE_URL) return `${APP_BASE_URL.replace(/\/+$/, "")}${path}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
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

  const title = useMemo(() => {
    if (!item || !category) return "Detail";
    if (category.resource === "pops") {
      return `${valueOf(item.pop_name)} (${valueOf(item.pop_id)})`;
    }
    if (category.resource === "devices") {
      return `${valueOf(item.device_name)} (${valueOf(item.device_id)})`;
    }
    return `${category.label} Detail`;
  }, [item, category]);

  const infoImageAttachments = useMemo(
    () => extractImageAttachments(item?.image_attachments, valueOf(item?.image_attachment_id)),
    [item],
  );
  const validationImageAttachments = useMemo<AttachmentRef[]>(
    () =>
      (odpValidations || []).flatMap((record, index) => extractValidationImageAttachments(record, index)),
    [odpValidations],
  );
  const galleryImageAttachments = useMemo<AttachmentRef[]>(() => {
    const merged = new Map<string, AttachmentRef>();
    [...infoImageAttachments, ...validationImageAttachments].forEach((attachment) => {
      if (!attachment?.id) return;
      if (!merged.has(attachment.id)) {
        merged.set(attachment.id, attachment);
      }
    });
    return Array.from(merged.values());
  }, [infoImageAttachments, validationImageAttachments]);

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
      return;
    }

    const activeCategory = category;
    const activeItem = item;
    let cancelled = false;

    async function loadRelationLabels() {
      const labels: RelationLabels = {};
      try {
        if (activeCategory.resource === "devices") {
          const [region, pop, manufacturer, brand, model] = await Promise.all([
            valueOf(activeItem.region_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/regions/${valueOf(activeItem.region_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.pop_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/pops/${valueOf(activeItem.pop_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.manufacturer_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/manufacturers/${valueOf(activeItem.manufacturer_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.brand_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/brands/${valueOf(activeItem.brand_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
            valueOf(activeItem.model_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/assetModels/${valueOf(activeItem.model_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
          ]);

          labels.region = region ? valueOf(region.data.region_name) : "";
          labels.pop = pop ? valueOf(pop.data.pop_name) : "";
          labels.manufacturer = manufacturer ? valueOf(manufacturer.data.manufacturer_name) : "";
          labels.brand = brand ? valueOf(brand.data.brand_name) : "";
          labels.model = model ? valueOf(model.data.model_name) : "";
        }

        if (activeCategory.resource === "pops") {
          const [region, popType, province, city] = await Promise.all([
            valueOf(activeItem.region_id)
              ? apiFetch<{ data: Record<string, unknown> }>(`/regions/${valueOf(activeItem.region_id)}`, { token }).catch(() => null)
              : Promise.resolve(null),
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

          labels.region = region ? valueOf(region.data.region_name) : "";
          labels.popType = popType ? valueOf(popType.data.pop_type_name) : valueOf(activeItem.pop_type);
          labels.province = province ? valueOf(province.data.province_name) : valueOf(activeItem.province);
          labels.city = city ? valueOf(city.data.city_name) : valueOf(activeItem.city);
        }
      } finally {
        if (!cancelled) setRelationLabels(labels);
      }
    }

    void loadRelationLabels();
    return () => {
      cancelled = true;
    };
  }, [item, category, token]);

  useEffect(() => {
    if (!token) {
      setSplitterProfiles([]);
      setOdpTypes([]);
      setInstallationTypes([]);
      return;
    }
    let cancelled = false;
    async function loadSplitterProfiles() {
      try {
        const [splitterResponse, odpTypesResponse, installationTypesResponse] = await Promise.all([
          apiFetch<PaginatedResponse<SplitterProfileOption>>("/splitterProfiles?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<OdpTypeOption>>("/odpTypes?page=1&limit=200&is_active=true", { token }),
          apiFetch<PaginatedResponse<InstallationTypeOption>>("/installationTypes?page=1&limit=200&is_active=true", { token }),
        ]);
        if (cancelled) return;
        setSplitterProfiles(splitterResponse.data || []);
        setOdpTypes(odpTypesResponse.data || []);
        setInstallationTypes(installationTypesResponse.data || []);
      } catch {
        if (cancelled) return;
        setSplitterProfiles([]);
        setOdpTypes([]);
        setInstallationTypes([]);
      }
    }
    void loadSplitterProfiles();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!isOdpDevice || !item || !token) {
      setOdpPorts([]);
      setLoadingOdpPorts(false);
      return;
    }

    const activeItem = item;
    let cancelled = false;

    async function loadPorts() {
      setLoadingOdpPorts(true);
      try {
        const result = await apiFetch<{ data: DevicePort[] }>(
          `/devicePorts?page=1&limit=200&device_id=${encodeURIComponent(activeItem.id)}`,
          { token },
        );
        if (cancelled) return;
        setOdpPorts((result.data || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat port ODP.");
      } finally {
        if (!cancelled) setLoadingOdpPorts(false);
      }
    }

    void loadPorts();
    return () => {
      cancelled = true;
    };
  }, [isOdpDevice, item, token]);

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

  useEffect(() => {
    if (!isOdpDevice || !item || !token) {
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
          const mappedRows: OdpValidationRecord[] = (requestResult.data || []).slice(0, 10).map((request) => ({
            id: request.id,
            validation_id: request.request_id || request.id,
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
              field_inspection: request.payload_snapshot?.field_inspection || {},
              field_validation: request.payload_snapshot?.field_validation || {},
              port_summary: request.payload_snapshot?.port_summary || {},
              device_ports: request.payload_snapshot?.device_ports || [],
            },
            evidence_attachment_id:
              request.evidence_attachments?.[0]?.id ||
              request.evidence_attachments?.[0]?.attachment_id ||
              null,
            evidence_attachments: request.evidence_attachments || [],
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
        if (!cancelled) setError((err as Error).message || "Gagal memuat histori validasi ODP.");
      } finally {
        if (!cancelled) setLoadingOdpValidations(false);
      }
    }

    void loadOdpValidations();
    return () => {
      cancelled = true;
    };
  }, [isOdpDevice, item, token]);

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
      errorCorrectionLevel: "M",
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

      const payload = buildUpdatePayload(form, category.resource) as Record<string, unknown>;
      let mergedImageAttachments = infoImageAttachments.map((attachment) => ({
        id: attachment.id,
        original_name: attachmentNames[attachment.id] || attachment.name || attachment.id,
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
      setForm(buildEditableForm(refreshed.data, category.resource));
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
      const refreshed = await apiFetch<{ data: DevicePort[] }>(
        `/devicePorts?page=1&limit=200&device_id=${encodeURIComponent(item.id)}`,
        { token },
      );
      setOdpPorts((refreshed.data || []).sort((a, b) => Number(a.port_index) - Number(b.port_index)));
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

  async function handleCopyQrLink() {
    if (!deviceDirectHref) return;
    try {
      await navigator.clipboard.writeText(deviceDirectHref);
      setMessage("Link QR ODP berhasil disalin.");
    } catch {
      setError("Browser tidak mengizinkan copy otomatis.");
    }
  }

  function handleDownloadQrLabel() {
    if (!qrDataUrl || !item) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${valueOf(item.device_id, "odp")}-qr.png`;
    link.click();
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
      const today = currentDateISO();
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

      await apiFetch(`/${category.resource}/${item.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          validation_status: odpValidationDraft.status,
          validation_date: today,
          last_validation_at: now,
        }),
      });

      setItem((prev) =>
        prev
          ? {
              ...prev,
              validation_status: odpValidationDraft.status,
              validation_date: today,
              last_validation_at: now,
            }
          : prev,
      );
      setForm((prev) => ({
        ...prev,
        validation_status: odpValidationDraft.status,
        validation_date: today,
      }));
      setOdpValidationDraft((prev) => ({ ...prev, findings: "" }));
      setMessage("Validasi lapangan ODP berhasil disimpan.");
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan validasi lapangan ODP.");
    } finally {
      setSubmittingOdpValidation(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Detail {category.label}</h2>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {canOpenTopology && item ? (
              <Button asChild variant="outline">
                <Link href={topologyHref}>{category.resource === "devices" ? "Trace Topology" : "Open Topology"}</Link>
              </Button>
            ) : null}
            {canOpenAsBuilt && category?.resource === "devices" && item ? (
              <Button asChild variant="outline">
                <Link href={asBuiltHref}>Open As-Built</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={backToListHref}>
                <ArrowLeft className="mr-2 size-4" />
                Kembali
              </Link>
            </Button>
          </div>
        </div>

        {loading ? <AppLoading label="Sedang memuat detail data..." /> : null}
        {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        {!loading && item ? (
          <>
            <Collapsible open={isOdpDevice ? odpInfoOpen : true} onOpenChange={isOdpDevice ? setOdpInfoOpen : undefined}>
              <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>{isOdpDevice ? "Informasi ODP" : `Informasi ${category.label}`}</CardTitle>
                    {isOdpDevice ? (
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="size-8">
                          <ChevronDown className={`size-4 transition-transform ${odpInfoOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
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
                    <Badge variant="outline" className={mapValidationStatus(valueOf(item.validation_status, "unvalidated")).className}>
                      {mapValidationStatus(valueOf(item.validation_status, "unvalidated")).label}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Updated: {formatDateTime(valueOf(item.updated_at || item.created_at))}
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-5">
                  {category.resource === "pops" ? (
                    <PopDetailForm form={form} onChange={setForm} editing={isEditing} relationLabels={relationLabels} />
                  ) : null}

              {category.resource === "devices" ? (
                <DeviceDetailForm
                  form={form}
                  onChange={setForm}
                  editing={isEditing}
                  relationLabels={relationLabels}
                  isOdpDevice={isOdpDevice}
                  splitterProfiles={splitterProfiles}
                  odpTypes={odpTypes}
                  installationTypes={installationTypes}
                  latestFieldValidation={odpValidations[0]?.payload?.field_validation || null}
                />
              ) : null}

              {category.resource !== "pops" && category.resource !== "devices" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{key}</Label>
                      <Input value={stringifyValue(value)} disabled />
                    </div>
                  ))}
                </div>
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

              <div className="space-y-1.5 md:max-w-xs">
                <Label>Total Image Attachments</Label>
                <Input value={String(galleryImageAttachments.length)} disabled />
              </div>
              {galleryImageAttachments.length > 0 ? (
                <div className="space-y-2">
                  <Label>Mini Gallery</Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {galleryImageAttachments.map((attachment, index) => {
                      const src = imagePreviewUrls[attachment.id];
                      const fileName = attachmentNames[attachment.id] || attachment.name || attachment.id;
                      return (
                        <button
                          type="button"
                          key={attachment.id}
                          className="overflow-hidden rounded-md border bg-muted/30 text-left transition hover:ring-2 hover:ring-primary/40"
                          title={fileName}
                          onClick={() => openGalleryAt(index)}
                        >
                          {src ? (
                            <Image
                              src={src}
                              alt={fileName}
                              width={120}
                              height={90}
                              className="h-20 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-20 items-center justify-center text-[10px] text-muted-foreground">
                              {loadingImagePreviews ? "Loading..." : "No preview"}
                            </div>
                          )}
                          <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{fileName}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {editable && isEditing ? (
                <div className="space-y-2">
                  <Label>Tambah Image Attachment</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleNewImageFilesChange(event.target.files)}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImagePlus className="size-3.5" />
                    Maksimal total {MAX_IMAGE_ATTACHMENTS} file (existing + baru), masing-masing max 5MB.
                  </div>
                  {newImageFiles.length ? (
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{newImageFiles.length} file baru</Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewImageFiles([])}>
                          <Trash2 className="mr-1 size-4" />
                          Clear
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                        {newImageFiles.map((file, index) => (
                          <div key={`${file.name}-${file.size}-${index}`} className="relative overflow-hidden rounded-md border bg-background">
                            {newImagePreviewUrls[index] ? (
                              <Image
                                src={newImagePreviewUrls[index]}
                                alt={file.name}
                                width={120}
                                height={90}
                                className="h-20 w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-20 w-full bg-muted" />
                            )}
                            <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{file.name}</p>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute right-1 top-1 size-5"
                              onClick={() => removeNewImageAt(index)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

                  {editable && isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setForm(buildEditableForm(item, category.resource));
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
                directHref={deviceDirectHref}
                onProvisionPorts={() => void handleProvisionOdpPorts()}
                onUpdatePort={(port, changes) => void handleUpdateOdpPort(port, changes)}
                onValidationDraftChange={setOdpValidationDraft}
                onSubmitValidation={() => void handleSubmitOdpValidation()}
                onDownloadValidationEvidence={(record) => void handleDownloadValidationEvidence(record)}
                onCopyQrLink={() => void handleCopyQrLink()}
                onDownloadQrLabel={handleDownloadQrLabel}
                onArchiveDevice={() => void handleArchiveOdpDevice()}
                onArchivePort={(port) => void handleArchiveOdpPort(port)}
                coreChainSummary={odpCoreChainSummary}
                loadingCoreChainSummary={loadingOdpCoreChainSummary}
                creatingDraftLink={creatingDraftLink}
                cableDevices={odpCableDevices}
                onCreateDraftLink={(nextPayload) => void handleCreateDraftLink(nextPayload)}
                editing={isEditing}
                onStartEdit={() => setIsEditing(true)}
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
                  const fileName = attachment.name || attachment.id;
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
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Berhasil</AlertDialogTitle>
            <AlertDialogDescription>{successDialogText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Tutup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
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
  directHref,
  onProvisionPorts,
  onUpdatePort,
  onValidationDraftChange,
  onSubmitValidation,
  onDownloadValidationEvidence,
  onCopyQrLink,
  onDownloadQrLabel,
  onArchiveDevice,
  onArchivePort,
  coreChainSummary,
  loadingCoreChainSummary,
  creatingDraftLink,
  cableDevices,
  onCreateDraftLink,
  editing,
  onStartEdit,
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
  directHref: string;
  onProvisionPorts: () => void;
  onUpdatePort: (port: DevicePort, changes: Partial<DevicePort>) => void;
  onValidationDraftChange: (next: OdpValidationDraft | ((prev: OdpValidationDraft) => OdpValidationDraft)) => void;
  onSubmitValidation: () => void;
  onDownloadValidationEvidence: (record: OdpValidationRecord) => void;
  onCopyQrLink: () => void;
  onDownloadQrLabel: () => void;
  onArchiveDevice: () => void;
  onArchivePort: (port: DevicePort) => void;
  coreChainSummary: OdpCoreChainSummary | null;
  loadingCoreChainSummary: boolean;
  creatingDraftLink: boolean;
  cableDevices: OdpCableOption[];
  editing: boolean;
  onStartEdit: () => void;
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
  const currentDeviceValidationUi = mapValidationStatus(String(device.validation_status || "unvalidated"));
  const latestRejectNote =
    latestValidationRecord?.superadmin_review_note ||
    latestValidationRecord?.adminregion_review_note ||
    "";
  const customerOptions = [
    { value: "__none__", label: "Tanpa customer" },
    ...customers.map((customer) => ({
      value: customer.id,
      label: [customer.customer_name, customer.customer_id || customer.customer_number].filter(Boolean).join(" - ") || customer.id,
    })),
  ];
  const ontOptions = [
    { value: "__none__", label: "Tanpa ONT" },
    ...ontDevices.map((device) => ({
      value: device.id,
      label: [device.device_name, device.device_id].filter(Boolean).join(" - ") || device.id,
    })),
  ];
  const odpPortOptions = ports.map((port) => ({
    value: port.id,
    label: `${port.port_label || `Port ${port.port_index}`} (${port.status || "idle"})`,
  }));
  const cableOptions = [
    { value: "__none__", label: "Tanpa cable device" },
    ...cableDevices.map((cable) => ({
      value: cable.id,
      label: [cable.device_name, cable.device_id].filter(Boolean).join(" - ") || cable.id,
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
    const latest = validationHistory.find((record) => record.payload?.device_ports?.length);
    return new Map((latest?.payload?.device_ports || []).map((port) => [Number(port.port_index), port]));
  }, [validationHistory]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div>
                <CardTitle className="text-sm">ODP Operations</CardTitle>
                <CardDescription>Port, splitter, QR label, dan validasi lapangan.</CardDescription>
              </div>
              <Collapsible open={operationsOpen} onOpenChange={setOperationsOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8">
                    <ChevronDown className={`size-4 transition-transform ${operationsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </Button>
              ) : null}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="sm" onClick={onProvisionPorts} disabled={provisioning || !editing}>
                      <RefreshCw className="mr-2 size-4" />
                      {provisioning ? "Generating..." : "Generate Ports"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-72 text-xs">
                    Generate port detail awal sesuai total port ODP. Tombol ini tidak dipakai untuk menaikkan kapasitas port.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button type="button" variant="destructive" size="sm" onClick={onArchiveDevice} disabled={!editing}>
                <Trash2 className="mr-2 size-4" />
                Archive ODP
              </Button>
            </div>
          </div>
        </CardHeader>
        <Collapsible open={operationsOpen} onOpenChange={setOperationsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4 px-3 pb-3 pt-0">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <OdpMetric label="Total Port" value={totalPorts} />
            <OdpMetric label="Used" value={usedPorts} tone="used" />
            <OdpMetric label="Idle" value={idlePorts} tone="idle" />
            <OdpMetric label="Reserved" value={reservedPorts} tone="reserved" />
            <OdpMetric label="Down/Maint." value={downPorts} tone="down" />
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Core Chain Summary</p>
              <Badge variant={coreChainSummary?.is_complete ? "secondary" : "outline"}>
                {coreChainSummary?.is_complete ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            {loadingCoreChainSummary ? (
              <AppLoading label="Memuat rantai core ODP..." />
            ) : coreChainSummary ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <ChainCheck label="Port Inventory" ok={coreChainSummary.checks.has_ports} />
                  <ChainCheck label="Upstream Link" ok={coreChainSummary.checks.has_upstream_link} />
                  <ChainCheck label="Main Splitter" ok={coreChainSummary.checks.has_main_splitter} />
                  <ChainCheck label="Distribution Cable" ok={coreChainSummary.checks.has_distribution_cable} />
                  <ChainCheck label="Core Mapping" ok={coreChainSummary.checks.has_core_mapping} />
                  <ChainCheck label="ODC Source Path" ok={coreChainSummary.checks.has_odc_source_path} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
                  <p>Upstream Devices: <span className="font-medium text-foreground">{coreChainSummary.summary?.upstream_device_count ?? 0}</span></p>
                  <p>Distribution Cables: <span className="font-medium text-foreground">{coreChainSummary.summary?.distribution_cable_count ?? 0}</span></p>
                  <p>Fiber Cores Used/Total: <span className="font-medium text-foreground">{coreChainSummary.summary?.fiber_core_used ?? 0}/{coreChainSummary.summary?.fiber_core_total ?? 0}</span></p>
                </div>
                {coreChainSummary.suggestions?.length ? (
                  <div className="space-y-1 rounded-md border bg-muted/20 p-2">
                    <p className="text-xs font-medium">Auto Suggest Actions</p>
                    {coreChainSummary.suggestions.map((item) => (
                      <p key={item.key} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.title}:</span> {item.description}
                      </p>
                    ))}
                  </div>
                ) : null}
                {coreChainSummary.upstream_port_candidates?.length ? (
                  <div className="space-y-1 rounded-md border p-2">
                    <p className="text-xs font-medium">Suggested Upstream Ports</p>
                    <div className="grid grid-cols-1 gap-2 pb-1 md:grid-cols-2">
                      <Combobox
                        value={effectiveDraftTargetPortId || "__none__"}
                        onValueChange={(value) => setDraftTargetPortId(value === "__none__" ? "" : value)}
                        options={[
                          { value: "__none__", label: "Pilih port ODP target" },
                          ...odpPortOptions,
                        ]}
                        triggerClassName="h-8 text-xs"
                      />
                      <Combobox
                        value={draftCableDeviceId}
                        onValueChange={setDraftCableDeviceId}
                        options={cableOptions}
                        triggerClassName="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Core start (opsional)"
                        value={draftCoreStart}
                        onChange={(event) => setDraftCoreStart(event.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Core end (opsional)"
                        value={draftCoreEnd}
                        onChange={(event) => setDraftCoreEnd(event.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                      {coreChainSummary.upstream_port_candidates.slice(0, 8).map((candidate) => (
                        <div key={candidate.port_id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{candidate.device?.device_id || candidate.device?.device_name || "-"}</span>
                            {" · "}
                            {candidate.port_label || `Port ${candidate.port_index ?? "-"}`}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            disabled={creatingDraftLink}
                            onClick={() =>
                              onCreateDraftLink({
                                upstreamPortId: candidate.port_id,
                                odpPortId: effectiveDraftTargetPortId,
                                cableDeviceId: draftCableDeviceId === "__none__" ? "" : draftCableDeviceId,
                                coreStart: draftCoreStart ? Number(draftCoreStart) : undefined,
                                coreEnd: draftCoreEnd ? Number(draftCoreEnd) : undefined,
                              })
                            }
                          >
                            {creatingDraftLink ? "..." : "Draft Link"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Ringkasan rantai core belum tersedia.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <QrCode className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">QR Label ODP</p>
              </div>
              <div className="flex items-center justify-center rounded-md border bg-background p-3">
                {qrDataUrl ? (
                  <Image src={qrDataUrl} alt="QR ODP" width={180} height={180} unoptimized className="size-40" />
                ) : (
                  <div className="flex size-40 items-center justify-center text-xs text-muted-foreground">QR belum tersedia</div>
                )}
              </div>
              <p className="break-all text-[11px] text-muted-foreground">{directHref}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCopyQrLink}>
                  <Copy className="mr-1.5 size-3.5" />
                  Copy
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onDownloadQrLabel} disabled={!qrDataUrl}>
                  Download
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Port ODP</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <LegendDot className="bg-emerald-500" label="used" />
                  <LegendDot className="bg-slate-300" label="idle" />
                  <LegendDot className="bg-amber-400" label="reserved" />
                  <LegendDot className="bg-rose-500" label="down" />
                </div>
              </div>

              {loadingPorts ? (
                <AppLoading label="Memuat port ODP..." />
              ) : ports.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {ports.map((port) => {
                    const portSnapshot = latestPortSnapshotByIndex.get(Number(port.port_index));
                    return (
                    <div key={port.id} className="rounded-md border bg-background p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{port.port_label || `#${port.port_index}`}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {describePortAssignmentState(port)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 shrink-0 rounded-full ${getOdpPortStatusClass(port.status)}`} />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            disabled={updatingPortId === port.id || !editing}
                            onClick={() => onArchivePort(port)}
                            title="Archive Port"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                        <RelationInfo label="Status Aktual" value={port.status || "idle"} />
                        <RelationInfo
                          label="Redaman Terakhir"
                          value={portSnapshot?.attenuation_db == null ? "-" : `${portSnapshot.attenuation_db} dB`}
                        />
                        <RelationInfo label="Status Validasi" value={portSnapshot?.status || "-"} />
                        <RelationInfo label="Catatan" value={portSnapshot?.notes || port.notes || "-"} />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Combobox
                          value={port.status || "idle"}
                          onValueChange={(status) => onUpdatePort(port, { status })}
                          disabled={updatingPortId === port.id || !editing}
                          triggerClassName="h-9"
                          options={ODP_PORT_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                        />
                        <Combobox
                          value={port.customer_id || "__none__"}
                          onValueChange={(value) => {
                            const customerId = value === "__none__" ? null : value;
                            const changes: Partial<DevicePort> = { customer_id: customerId };
                            if (customerId) changes.status = "used";
                            if (!customerId && !port.ont_device_id) changes.status = "idle";
                            onUpdatePort(port, changes);
                          }}
                          disabled={updatingPortId === port.id || loadingLookups || !editing}
                          triggerClassName="h-9"
                          searchPlaceholder="Cari customer..."
                          emptyText="Customer tidak ditemukan."
                          options={customerOptions}
                        />
                        <Combobox
                          value={port.ont_device_id || "__none__"}
                          onValueChange={(value) => {
                            const ontDeviceId = value === "__none__" ? null : value;
                            const changes: Partial<DevicePort> = { ont_device_id: ontDeviceId };
                            if (ontDeviceId) changes.status = "used";
                            if (!ontDeviceId && !port.customer_id) changes.status = "idle";
                            onUpdatePort(port, changes);
                          }}
                          disabled={updatingPortId === port.id || loadingLookups || !editing}
                          triggerClassName="h-9"
                          searchPlaceholder="Cari ONT..."
                          emptyText="ONT tidak ditemukan."
                          options={ontOptions}
                        />
                        <Input
                          key={`${port.id}-notes-${port.notes || ""}`}
                          defaultValue={port.notes || ""}
                          onBlur={(event) => {
                            if (event.target.value !== (port.notes || "")) {
                              onUpdatePort(port, { notes: event.target.value });
                            }
                          }}
                          disabled={updatingPortId === port.id || !editing}
                          placeholder="Catatan port"
                          className="h-9"
                        />
                      </div>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Belum ada port untuk ODP ini. Gunakan tombol Generate Ports untuk membuat port dari template ODP.
                </div>
              )}
            </div>
          </div>

            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

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

              <div className="space-y-2">
                {latestRequestStatus ? (
                  <OdpValidationWorkflowTimeline status={latestRequestStatus} updatedAt={latestValidationRecord?.validated_at || latestValidationRecord?.updated_at || null} />
                ) : null}
                {latestRejectNote ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
                    <p className="font-medium">Reject note terakhir</p>
                    <p className="mt-1">{latestRejectNote}</p>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Histori Validasi</p>
                  <p className="text-xs text-muted-foreground">{validationHistory.length} record terbaru</p>
                </div>
                {loadingValidationHistory ? (
                  <AppLoading label="Memuat histori validasi..." />
                ) : validationHistory.length ? (
                  <div className="space-y-2">
                    {validationHistory.map((record, index) => {
                      const evidenceCount = extractValidationImageAttachments(record, index).length;
                      const validation = record.payload?.field_validation;
                      return (
                      <div key={record.id} className="rounded-md border bg-background p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={record.status === "valid" ? "default" : "outline"}>
                                {record.status || "-"}
                              </Badge>
                              {record.request_status ? (
                                <Badge variant="outline" className={mapValidationStatus(record.request_status).className}>
                                  {mapValidationStatus(record.request_status).label}
                                </Badge>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                {record.validation_id || record.id} - {formatDateTime(valueOf(record.validated_at || record.created_at))}
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>Nama: {valueOf(validation?.new_device_name || validation?.old_device_name, "-")}</span>
                              <span>Tanggal validasi: {formatDate(valueOf(validation?.validation_date))}</span>
                              <span>Evidence: {evidenceCount}</span>
                            </div>
                            {record.findings ? <p className="mt-2 text-sm">{record.findings}</p> : null}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!evidenceCount}
                            onClick={() => onDownloadValidationEvidence(record)}
                          >
                            <Download className="mr-1.5 size-3.5" />
                            Evidence ({evidenceCount})
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>Kondisi {formatOdpInspectionSummary(record.payload?.field_inspection)}</span>
                          <span>Splitter {valueOf(record.payload?.field_validation?.splitter_ratio, "-")}</span>
                          <span>Total {record.payload?.port_summary?.total ?? "-"}</span>
                          <span>Used {record.payload?.port_summary?.used ?? "-"}</span>
                          <span>Idle {record.payload?.port_summary?.idle ?? "-"}</span>
                          <span>Down {record.payload?.port_summary?.down ?? "-"}</span>
                        </div>
                        <OdpFieldValidationSummary validation={record.payload?.field_validation} />
                        <OdpPortSnapshotSummary ports={record.payload?.device_ports} />
                        <OdpInspectionSummary inspection={record.payload?.field_inspection} />
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    Belum ada histori validasi lapangan untuk ODP ini.
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

function OdpInspectionSummary({ inspection }: { inspection?: OdpFieldInspectionPayload | null }) {
  const checks = Object.values(inspection?.condition_checks || {});
  if (!checks.length) return null;

  return (
    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {checks.map((item, index) => (
        <div key={`${item.label || "condition"}-${index}`} className="rounded border bg-muted/20 px-2 py-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{item.label || "Checklist kondisi"}</span>
            <span className={isGoodOdpInspectionCondition(item.condition) ? "text-emerald-700" : "text-amber-700"}>
              {item.condition || "-"}
            </span>
          </div>
          {item.note ? <p className="mt-1 text-muted-foreground">Keterangan: {item.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

function OdpValidationWorkflowTimeline({
  status,
  updatedAt,
}: {
  status: string;
  updatedAt?: string | null;
}) {
  const steps = getOdpWorkflowSteps(status);
  return (
    <div className="rounded-md border p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Timeline Workflow</p>
        <span className="text-xs text-muted-foreground">Update: {formatDateTime(valueOf(updatedAt))}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.label} className={`rounded-md border px-2 py-1.5 text-xs ${step.className}`}>
            <p className="font-medium">{step.label}</p>
            <p className="mt-0.5">{step.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getOdpWorkflowSteps(status: string) {
  const raw = String(status || "").trim();
  const submitted = { label: "Validator", value: "Submitted", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (raw === "rejected_by_adminregion") {
    return [
      submitted,
      { label: "Admin Region", value: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" },
      { label: "Superadmin", value: "Belum masuk", className: "border-slate-200 bg-slate-50 text-slate-700" },
    ];
  }
  if (raw === "ongoing_validated") {
    return [
      submitted,
      { label: "Admin Region", value: "Menunggu review", className: "border-amber-200 bg-amber-50 text-amber-800" },
      { label: "Superadmin", value: "Belum masuk", className: "border-slate-200 bg-slate-50 text-slate-700" },
    ];
  }
  if (raw === "rejected_by_superadmin") {
    return [
      submitted,
      { label: "Admin Region", value: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
      { label: "Superadmin", value: "Rejected", className: "border-rose-200 bg-rose-50 text-rose-800" },
    ];
  }
  if (raw === "validated") {
    return [
      submitted,
      { label: "Admin Region", value: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
      { label: "Superadmin", value: "Approved final", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    ];
  }
  return [
    submitted,
    { label: "Admin Region", value: raw === "pending_async" ? "Approved" : "Menunggu", className: raw === "pending_async" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700" },
    { label: "Superadmin", value: raw === "pending_async" ? "Menunggu approval final" : "Belum masuk", className: raw === "pending_async" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-700" },
  ];
}

function OdpFieldValidationSummary({ validation }: { validation?: OdpFieldValidationPayload | null }) {
  if (!validation || !Object.keys(validation).length) return null;

  const fields = [
    { label: "Tanggal", value: formatDate(valueOf(validation.validation_date)) },
    { label: "Inventory", value: valueOf(validation.inventory_id, "-") },
    { label: "Nama Lama", value: valueOf(validation.old_device_name, "-") },
    { label: "Nama Baru", value: valueOf(validation.new_device_name, "-") },
    { label: "POP", value: valueOf(validation.pop_name || validation.pop_id, "-") },
    { label: "Tipe ODP", value: valueOf(validation.odp_type, "-") },
    { label: "Instalasi", value: valueOf(validation.installation_type, "-") },
    { label: "Splitter", value: valueOf(validation.splitter_ratio, "-") },
    { label: "Kapasitas", value: valueOf(validation.total_ports, "-") },
    { label: "Longitude", value: valueOf(validation.longitude, "-") },
    { label: "Latitude", value: valueOf(validation.latitude, "-") },
  ];

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
      {fields.map((field) => (
        <RelationInfo key={field.label} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

function OdpPortSnapshotSummary({ ports }: { ports?: OdpValidationPortSnapshot[] | null }) {
  if (!ports?.length) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/10 p-2">
      <p className="mb-1.5 text-xs font-medium">Snapshot Port & Redaman</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {ports.map((port, index) => (
          <div key={`${port.id || port.port_index || index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{port.port_label || `Port ${port.port_index || index + 1}`}</span>
              <span className="text-muted-foreground">{port.status || "-"}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              Redaman: {port.attenuation_db == null ? "-" : `${port.attenuation_db} dB`}
            </p>
            {port.notes ? <p className="mt-1 text-muted-foreground">Catatan: {port.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatOdpInspectionSummary(inspection?: OdpFieldInspectionPayload | null) {
  const checks = Object.values(inspection?.condition_checks || {});
  if (!checks.length) return "-";
  const good = checks.filter((item) => isGoodOdpInspectionCondition(item.condition)).length;
  return `${good}/${checks.length} baik`;
}

function isGoodOdpInspectionCondition(value?: string | null) {
  return ["Baik", "Bersih", "Lengkap", "Rapi"].includes(String(value || ""));
}

function OdpMetric({ label, value, tone }: { label: string; value: number; tone?: "used" | "idle" | "reserved" | "down" }) {
  const toneClass =
    tone === "used"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "idle"
        ? "border-slate-200 bg-slate-50 text-slate-800"
        : tone === "reserved"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : tone === "down"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-border bg-muted/30";
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ChainCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 text-xs ${ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
      <p className="font-medium">{label}</p>
      <p className={ok ? "text-emerald-700" : "text-amber-700"}>{ok ? "OK" : "Pending"}</p>
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
                    <RelationInfo label="Customer" value={port.customer_id || "-"} />
                    <RelationInfo label="Occupied" value={formatDate(valueOf(port.occupied_at))} />
                    <RelationInfo label="Port ID" value={port.port_id || "-"} />
                  </div>
                  {port.notes ? <p className="mt-2 text-xs text-muted-foreground">{port.notes}</p> : null}

                  {odp?.id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/data-management/list/odp/${odp.id}`}>Open ODP</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/field/odp/${odp.id}`}>Field View</Link>
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

function RelationInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function extractValidationImageAttachments(record: OdpValidationRecord, recordIndex: number): AttachmentRef[] {
  const refs: AttachmentRef[] = [];
  const seen = new Set<string>();
  const baseName = record.validation_id || `validation-${recordIndex + 1}`;
  const pushRef = (id: unknown, name: unknown) => {
    const normalizedId = String(id || "").trim();
    if (!normalizedId || seen.has(normalizedId)) return;
    seen.add(normalizedId);
    refs.push({ id: normalizedId, name: String(name || `${baseName}-evidence-${refs.length + 1}`) });
  };

  (record.evidence_attachments || []).forEach((attachment, index) => {
    pushRef(attachment.id || attachment.attachment_id, attachment.original_name || attachment.name || `${baseName}-evidence-${index + 1}`);
  });
  pushRef(record.evidence_attachment_id, `${baseName}-evidence`);

  Object.values(record.payload?.field_inspection?.initial_photos || {}).forEach((item) => {
    pushRef(item.attachment?.id || item.attachment?.attachment_id, item.attachment?.name || item.label);
  });
  Object.values(record.payload?.field_inspection?.condition_checks || {}).forEach((item) => {
    pushRef(item.attachment?.id || item.attachment?.attachment_id, item.attachment?.name || item.label);
  });

  return refs;
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function getOdpPortStatusClass(status?: string | null) {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance") return "bg-rose-500";
  return "bg-slate-300";
}

function describePortAssignmentState(port: DevicePort) {
  if (port.customer_id || port.ont_device_id) return "Endpoint terhubung";
  return "Belum terhubung customer/ONT";
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
}: {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Identitas POP</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field label="POP ID" value={form.pop_id} disabled compact />
          <Field label="POP Name" value={form.pop_name} onChange={(v) => onChange((p) => ({ ...p, pop_name: v }))} disabled={!editing} compact />
          <Field label="POP Code" value={form.pop_code} onChange={(v) => onChange((p) => ({ ...p, pop_code: v.toUpperCase() }))} disabled={!editing} compact />
          <DisplayField label="Region" value={relationLabels.region || "-"} compact />
          <DisplayField label="POP Type" value={relationLabels.popType || form.pop_type || "-"} compact />
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
          <DisplayField label="Province" value={relationLabels.province || form.province || "-"} compact />
          <DisplayField label="City" value={relationLabels.city || form.city || "-"} compact />
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

function DeviceDetailForm({
  form,
  onChange,
  editing,
  relationLabels,
  isOdpDevice,
  splitterProfiles,
  odpTypes,
  installationTypes,
  latestFieldValidation,
}: {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  isOdpDevice: boolean;
  splitterProfiles: SplitterProfileOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  latestFieldValidation?: OdpFieldValidationPayload | null;
}) {
  const selectedSplitterProfile =
    splitterProfiles.find((item) => item.ratio_label === form.splitter_ratio) || null;
  const selectedSplitterOutputPort = Number(selectedSplitterProfile?.output_port_count || 0);
  const needsPortPresetSelector = isOdpDevice && Number.isFinite(selectedSplitterOutputPort) && selectedSplitterOutputPort >= 16;
  const splitterPortPresetOptions = (() => {
    if (!needsPortPresetSelector) return [] as number[];
    const maxPort = selectedSplitterOutputPort;
    const presets = [8, 16, 32, 64].filter((value) => value <= maxPort);
    if (!presets.includes(maxPort)) presets.push(maxPort);
    return Array.from(new Set(presets)).sort((a, b) => a - b);
  })();

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{isOdpDevice ? "Identitas ODP" : "Identitas Device"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field label={isOdpDevice ? "ID Inventory" : "Device ID"} value={form.device_id} disabled compact />
          <Field label={isOdpDevice ? "Nama ODP" : "Device Name"} value={form.device_name} onChange={(v) => onChange((p) => ({ ...p, device_name: v }))} disabled={!editing} compact />
          {isOdpDevice ? (
            <DisplayField label="Nama ODP Baru" value={valueOf(latestFieldValidation?.new_device_name, "-")} compact />
          ) : null}
          {isOdpDevice ? (
            <div className="space-y-1">
              <Label>Tipe ODP</Label>
              <Combobox
                value={form.odp_type || "__none__"}
                onValueChange={(value) => onChange((p) => ({ ...p, odp_type: value === "__none__" ? "" : value }))}
                disabled={!editing}
                triggerClassName="h-8 text-xs"
                options={[
                  { value: "__none__", label: "Pilih tipe ODP" },
                  ...odpTypes.map((item) => ({
                    value: item.odp_type_name,
                    label: [item.odp_type_name, item.odp_type_code].filter(Boolean).join(" - "),
                  })),
                ]}
                searchPlaceholder="Cari tipe ODP..."
              />
            </div>
          ) : null}
          {isOdpDevice ? (
            <div className="space-y-1">
              <Label>Jenis Instalasi</Label>
              <Combobox
                value={form.installation_type || "__none__"}
                onValueChange={(value) => onChange((p) => ({ ...p, installation_type: value === "__none__" ? "" : value }))}
                disabled={!editing}
                triggerClassName="h-8 text-xs"
                options={[
                  { value: "__none__", label: "Pilih jenis instalasi" },
                  ...installationTypes.map((item) => ({
                    value: item.installation_type_name,
                    label: [item.installation_type_name, item.installation_type_code].filter(Boolean).join(" - "),
                  })),
                ]}
                searchPlaceholder="Cari jenis instalasi..."
              />
            </div>
          ) : null}
          <Field label={isOdpDevice ? "Kategori Device" : "Device Type"} value={form.device_type_key} disabled compact />
          <Field label="Asset Group" value={form.asset_group} disabled compact />
          <SelectField
            label="Status"
            value={form.status}
            options={DEVICE_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, status: v }))}
            disabled={!editing}
            compact
          />
          {!isOdpDevice ? (
            <Field
              label="Installation Date"
              type="date"
              value={form.installation_date}
              onChange={(v) => onChange((p) => ({ ...p, installation_date: v }))}
              disabled={!editing}
              compact
            />
          ) : null}
          <SelectField
            label="Validation Status"
            value={form.validation_status}
            options={VALIDATION_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, validation_status: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label="Validation Date"
            type="date"
            value={form.validation_date}
            onChange={(v) => onChange((p) => ({ ...p, validation_date: v }))}
            disabled={!editing}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Relasi & Vendor</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <DisplayField label="Region" value={relationLabels.region || "-"} compact />
          <DisplayField label="POP" value={relationLabels.pop || "-"} compact />
          <DisplayField label="Manufacturer" value={relationLabels.manufacturer || "-"} compact />
          <DisplayField label="Brand" value={relationLabels.brand || "-"} compact />
          <DisplayField label="Model" value={relationLabels.model || "-"} compact />
          <Field label="Serial Number" value={form.serial_number} onChange={(v) => onChange((p) => ({ ...p, serial_number: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Kapasitas & Jaringan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          {!isOdpDevice ? (
            <Field label="Management IP" value={form.management_ip} onChange={(v) => onChange((p) => ({ ...p, management_ip: v }))} disabled={!editing} compact />
          ) : null}
          {!isOdpDevice ? (
            <>
              <Field label="Capacity Core" type="number" value={form.capacity_core} onChange={(v) => onChange((p) => ({ ...p, capacity_core: v }))} disabled={!editing} compact />
              <Field label="Used Core" type="number" value={form.used_core} onChange={(v) => onChange((p) => ({ ...p, used_core: v }))} disabled={!editing} compact />
            </>
          ) : (
            <DisplayField label="Capacity Core" value="Auto from core chain" compact />
          )}
          {needsPortPresetSelector ? (
            <div className="space-y-1">
              <Label>{isOdpDevice ? "Kapasitas ODP" : "Total Ports"}</Label>
              <Combobox
                value={form.total_ports || "__none__"}
                onValueChange={(value) => onChange((p) => ({ ...p, total_ports: value === "__none__" ? "" : value }))}
                disabled={!editing}
                triggerClassName="h-8 text-xs"
                options={[
                  { value: "__none__", label: "Pilih total port" },
                  ...splitterPortPresetOptions.map((port) => ({
                    value: String(port),
                    label: `${port} port`,
                  })),
                ]}
                searchPlaceholder="Cari total port..."
              />
            </div>
          ) : (
            <Field label={isOdpDevice ? "Kapasitas ODP" : "Total Ports"} type="number" value={form.total_ports} onChange={(v) => onChange((p) => ({ ...p, total_ports: v }))} disabled={!editing} compact />
          )}
          <Field label={isOdpDevice ? "Port Aktif" : "Used Ports"} type="number" value={form.used_ports} onChange={(v) => onChange((p) => ({ ...p, used_ports: v }))} disabled={!editing} compact />
          <div className="space-y-1">
            <Label>{isOdpDevice ? "Kapasitas Splitter" : "Splitter Ratio"}</Label>
            <Combobox
              value={form.splitter_ratio || "__none__"}
              onValueChange={(value) => {
                const ratioValue = value === "__none__" ? "" : value;
                const profile = splitterProfiles.find((item) => item.ratio_label === ratioValue) || null;
                const output = Number(profile?.output_port_count || 0);
                const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
                onChange((p) => ({
                  ...p,
                  splitter_ratio: ratioValue,
                  total_ports: autoTotal ? String(autoTotal) : p.total_ports,
                }));
              }}
              disabled={!editing}
              triggerClassName="h-8 text-xs"
              options={[
                { value: "__none__", label: "Pilih splitter ratio" },
                ...splitterProfiles.map((item) => ({
                  value: item.ratio_label,
                  label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
                })),
              ]}
              searchPlaceholder="Cari splitter ratio..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">Lokasi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field className="md:col-span-2 xl:col-span-3" label="Address" value={form.address} onChange={(v) => onChange((p) => ({ ...p, address: v }))} disabled={!editing} compact />
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
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label>{label}</Label>
      <Input value={value} disabled className={compact ? "h-8 text-xs" : undefined} />
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
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`Info ${label}`}>
                <CircleHelp className="size-3.5" />
              </button>
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

function buildEditableForm(item: GenericItem, resource: string): EditableForm {
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
    };
  }

  return {};
}

function buildUpdatePayload(form: EditableForm, resource: string): Record<string, unknown> {
  const normalizedValidation = normalizeValidationPayload(form.validation_status, form.validation_date);

  if (resource === "pops") {
    const normalizedPopCode = nullIfEmpty(form.pop_code)?.toUpperCase() || null;
    if (normalizedPopCode && !/^[A-Z]{3}$/.test(normalizedPopCode)) {
      throw new Error("POP Code harus tepat 3 huruf A-Z (contoh: CBO).");
    }

    return {
      pop_name: nullIfEmpty(form.pop_name),
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
    return {
      device_name: nullIfEmpty(form.device_name),
      status: nullIfEmpty(form.status),
      installation_date: nullIfEmpty(form.installation_date),
      validation_status: normalizedValidation.validation_status,
      validation_date: normalizedValidation.validation_date,
      region_id: nullIfEmpty(form.region_id),
      pop_id: nullIfEmpty(form.pop_id),
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
      address: nullIfEmpty(form.address),
      longitude: numberOrNull(form.longitude),
      latitude: numberOrNull(form.latitude),
      tags: csvToArray(form.tags),
    };
  }

  return {};
}

function valueOf(value: unknown, fallback = "") {
  if (value == null) return fallback;
  const text = String(value);
  return text === "null" || text === "undefined" ? fallback : text;
}

function stringifyValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
