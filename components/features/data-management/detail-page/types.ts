export type GenericItem = Record<string, unknown> & {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
};
export type RelationRecord = Record<string, unknown> & { id?: string | null };

export type EditableForm = Record<string, string>;
export type AttachmentRef = {
  id: string;
  name?: string;
  timestamp?: string;
};
export type UploadResult = {
  id: string;
  attachment_id: string;
  original_name: string;
  mime_type: string;
  file_category: string;
  size_bytes: number;
};
export type DevicePort = {
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
  customer_code?: string | null;
  ont_device_id?: string | null;
  occupied_at?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
};
export type DevicePortConnection = {
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
export type DeviceTopologySummary = {
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
  odc_relations?: {
    upstream?: Array<{
      id?: string | null;
      peer_device?: { id?: string | null; name?: string | null } | null;
      peer_port?: { id?: string | null; name?: string | null } | null;
      cable_device?: { id?: string | null; name?: string | null } | null;
      core_start?: number | string | null;
      core_end?: number | string | null;
      fiber_count?: number | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
};
export type OdpCustomerOption = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  status?: string | null;
  region_id?: string | null;
};
export type OdpOntOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  status?: string | null;
  region_id?: string | null;
  customer_id?: string | null;
};
export type ValidatorOption = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  user_code?: string | null;
  default_region_id?: string | null;
};
export type OdpCableOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  region_id?: string | null;
};
export type PopLookupOption = {
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
export type ProjectLookupOption = {
  id: string;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
};
export type ProjectAssetItem = GenericItem & {
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
export type ProjectRouteItem = GenericItem & {
  route_id?: string | null;
  route_code?: string | null;
  route_name?: string | null;
  route_type?: string | null;
  status?: string | null;
  region_id?: string | null;
  pop_id?: string | null;
  project_id?: string | null;
};
export type ProjectAsBuiltDocumentItem = GenericItem & {
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
export type ProjectCoreRelationItem = GenericItem & {
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
export type SplitterProfileOption = {
  id: string;
  ratio_label: string;
  output_port_count?: number | null;
  allowed_device_type_keys?: string[] | null;
  is_active?: boolean | null;
};
export type TopologyRelationRuleOption = {
  id: string;
  source_device_type_key: string;
  direction: 'front' | 'rear';
  allowed_peer_device_type_key: string;
  requires_same_pop?: boolean | null;
  requires_same_project?: boolean | null;
  is_active?: boolean | null;
};
export type DeviceTypeMasterOption = {
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
export type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
export type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
export type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
export type OdpCoreChainSummary = {
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
export type OdpValidationDraft = {
  physical_ok: boolean;
  splitter_ok: boolean;
  port_mapping_ok: boolean;
  qr_label_ok: boolean;
  label_ok: boolean;
  status: "valid" | "warning" | "invalid";
  findings: string;
  evidenceFile: File | null;
};
export type OdpValidationChecklistKey = "physical_ok" | "splitter_ok" | "port_mapping_ok" | "qr_label_ok" | "label_ok";
export type OdpFieldInspectionPayload = {
  initial_photos?: Record<string, { label?: string; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
  condition_checks?: Record<string, { label?: string; condition?: string | null; note?: string | null; attachment?: { id?: string | null; attachment_id?: string | null; name?: string | null } }>;
};
export type OdpEvidenceAttachment = {
  id?: string | null;
  attachment_id?: string | null;
  name?: string | null;
  original_name?: string | null;
};
export type OdpFieldValidationPayload = {
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
export type OdpValidationPortSnapshot = {
  id?: string | null;
  port_index?: number | null;
  port_label?: string | null;
  status?: string | null;
  attenuation_db?: number | null;
  notes?: string | null;
};
export type OdpValidationRecord = {
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
export type ValidationRequestRecord = {
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
export type ServicePortRelation = DevicePort & {
  odpDevice?: {
    id: string;
    device_id?: string | null;
    device_name?: string | null;
    device_type_key?: string | null;
    status?: string | null;
  } | null;
};
export type RelationLabels = {
  region?: string;
  regionCode?: string;
  pop?: string;
  project?: string;
  serviceType?: string;
  customer?: string;
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
