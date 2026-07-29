export type FieldType = "text" | "number" | "combobox" | "checkbox-group" | "color" | "readonly";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  isKeyField?: boolean;
  options?: { value: string; label: string }[];
  lookupType?: "manufacturers" | "brands" | "provinces" | "assetTypes";
  validate?: (value: string, form: Record<string, string>) => string | null;
  transform?: (value: string) => string;
}

export interface ResourceFormConfig {
  resource: string;
  label: string;
  keyField?: string;
  fields: FieldDef[];
}

export const MASTER_DATA_FORM_CONFIG: Record<string, ResourceFormConfig> = {
  regions: {
    resource: "regions",
    label: "Region",
    keyField: "region_name",
    fields: [
      {
        key: "region_name",
        label: "Region Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Jawa Barat",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Region Name wajib diisi" : null),
      },
      {
        key: "inventory_region_code",
        label: "Inventory Region Code",
        type: "readonly",
        placeholder: "Otomatis",
        helpText: "Diisi otomatis dari nomor regional berikutnya yang belum dipakai.",
      },
      {
        key: "region_color",
        label: "Region Color",
        type: "color",
        placeholder: "Contoh: #0EA5E9",
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi region",
      },
    ],
  },
  deviceTypes: {
    resource: "deviceTypes",
    label: "Device Type",
    keyField: "device_type_key",
    fields: [
      {
        key: "device_type_key",
        label: "Device Type Key",
        type: "text",
        required: true,
        placeholder: "Contoh: OLT",
        isKeyField: true,
        transform: (v) => v.toUpperCase(),
        validate: (v) =>
          !v.trim()
            ? "Device Type Key wajib diisi"
            : !/^[A-Z][A-Z0-9_]*$/.test(v.trim())
            ? "Hanya huruf besar, angka, dan underscore. Harus diawali huruf."
            : null,
      },
      {
        key: "device_type_name",
        label: "Device Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Optical Line Terminal",
        validate: (v) => (!v.trim() ? "Device Type Name wajib diisi" : null),
      },
      {
        key: "asset_group",
        label: "Asset Group",
        type: "combobox",
        required: true,
        options: [
          { value: "active", label: "active" },
          { value: "passive", label: "passive" },
        ],
      },
      {
        key: "topology_role",
        label: "Topology Role",
        type: "combobox",
        options: [
          { value: "source_active", label: "source_active" },
          { value: "termination_panel", label: "termination_panel" },
          { value: "distribution_point", label: "distribution_point" },
          { value: "access_point", label: "access_point" },
          { value: "splice_point", label: "splice_point" },
          { value: "physical_cable", label: "physical_cable" },
          { value: "customer_endpoint", label: "customer_endpoint" },
          { value: "network_active", label: "network_active" },
          { value: "civil_structure", label: "civil_structure" },
        ],
      },
      {
        key: "layout_type",
        label: "Layout Type",
        type: "combobox",
        options: [
          { value: "tray", label: "tray" },
          { value: "tube", label: "tube" },
          { value: "core_grid", label: "core_grid" },
          { value: "odp_operations", label: "odp_operations" },
          { value: "olt_slot", label: "olt_slot" },
          { value: "switch_grid", label: "switch_grid" },
          { value: "summary_only", label: "summary_only" },
        ],
      },
      {
        key: "inventory_type_code",
        label: "Inventory Type Code",
        type: "text",
        placeholder: "Otomatis / 3-digit (001-999)",
        helpText: "Kosongkan untuk auto-assign, atau isi 3 digit angka (contoh: 001).",
        validate: (v) =>
          v.trim() && !/^\d{3}$/.test(v.trim())
            ? "Harus 3 digit angka (contoh: 001)"
            : null,
      },
      {
        key: "icon_name",
        label: "Icon",
        type: "combobox",
        options: [
          { value: "HardDrive", label: "Generic Device" },
          { value: "Server", label: "OLT / Server" },
          { value: "Network", label: "Switch / Network" },
          { value: "Router", label: "Router" },
          { value: "Monitor", label: "ONT / Terminal" },
          { value: "Box", label: "Box / OTB" },
          { value: "Split", label: "Joint Closure" },
          { value: "Boxes", label: "Cabinet / ODC" },
          { value: "RadioTower", label: "ODP / Field Node" },
          { value: "Cable", label: "Cable" },
          { value: "CircleDot", label: "Node" },
        ],
      },
      {
        key: "default_front_label",
        label: "Default Front Label",
        type: "text",
        placeholder: "Contoh: Hulu",
      },
      {
        key: "default_rear_label",
        label: "Default Rear Label",
        type: "text",
        placeholder: "Contoh: Hilir",
      },
      {
        key: "supports_ports",
        label: "Supports Ports",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "supports_splitter",
        label: "Supports Splitter",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "supports_core_management",
        label: "Supports Core Management",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "supports_joint_closure",
        label: "Supports Joint Closure",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "is_assignable",
        label: "Is Assignable",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi tipe perangkat",
      },
    ],
  },
  topologyRelationRules: {
    resource: "topologyRelationRules",
    label: "Topology Relation Rule",
    fields: [
      {
        key: "source_device_type_key",
        label: "Source Device Type Key",
        type: "text",
        required: true,
        placeholder: "Contoh: ODC",
        transform: (v) => v.toUpperCase(),
        validate: (v) => (!v.trim() ? "Source Device Type Key wajib diisi" : null),
      },
      {
        key: "direction",
        label: "Direction",
        type: "combobox",
        required: true,
        options: [
          { value: "front", label: "front" },
          { value: "rear", label: "rear" },
        ],
      },
      {
        key: "allowed_peer_device_type_key",
        label: "Allowed Peer Device Type Key",
        type: "text",
        required: true,
        placeholder: "Contoh: ODP",
        transform: (v) => v.toUpperCase(),
        validate: (v) => (!v.trim() ? "Allowed Peer Device Type Key wajib diisi" : null),
      },
      {
        key: "connection_role",
        label: "Connection Role",
        type: "combobox",
        options: [
          { value: "uplink", label: "uplink" },
          { value: "feeder", label: "feeder" },
          { value: "distribution", label: "distribution" },
          { value: "branch", label: "branch" },
          { value: "drop", label: "drop" },
          { value: "physical_fiber", label: "physical_fiber" },
        ],
      },
      {
        key: "route_type",
        label: "Route Type",
        type: "text",
        placeholder: "Contoh: distribution",
      },
      {
        key: "requires_same_pop",
        label: "Requires Same POP",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "requires_same_project",
        label: "Requires Same Project",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "is_required_on_create",
        label: "Required on Create",
        type: "combobox",
        options: [
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ],
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi aturan topology",
      },
    ],
  },
  linkBudgetParameters: {
    resource: "linkBudgetParameters",
    label: "Link Budget Parameter",
    keyField: "parameter_key",
    fields: [
      {
        key: "parameter_key",
        label: "Parameter Key",
        type: "text",
        required: true,
        placeholder: "Contoh: engineering_margin",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Parameter Key wajib diisi" : null),
      },
      {
        key: "parameter_label",
        label: "Parameter Label",
        type: "text",
        required: true,
        placeholder: "Contoh: Default engineering margin",
        validate: (v) => (!v.trim() ? "Parameter Label wajib diisi" : null),
      },
      {
        key: "parameter_value",
        label: "Parameter Value",
        type: "number",
        required: true,
        placeholder: "Contoh: 3.0",
        validate: (v) =>
          !v.trim()
            ? "Parameter Value wajib diisi"
            : isNaN(Number(v))
            ? "Harus berupa angka valid"
            : null,
      },
      {
        key: "unit",
        label: "Unit",
        type: "text",
        placeholder: "dB",
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi parameter",
      },
    ],
  },
  popTypes: {
    resource: "popTypes",
    label: "POP Type",
    keyField: "pop_type_name",
    fields: [
      {
        key: "pop_type_name",
        label: "POP Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Main POP",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "POP Type Name wajib diisi" : null),
      },
      {
        key: "pop_type_code",
        label: "POP Type Code",
        type: "text",
        placeholder: "Contoh: MAIN_POP",
        transform: (v) => v.toUpperCase(),
      },
    ],
  },
  routeTypes: {
    resource: "routeTypes",
    label: "Route Type",
    keyField: "route_type_name",
    fields: [
      {
        key: "route_type_name",
        label: "Route Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Backbone",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Route Type Name wajib diisi" : null),
      },
      {
        key: "route_type_code",
        label: "Route Type Code",
        type: "text",
        placeholder: "Contoh: BB",
        transform: (v) => v.toUpperCase(),
      },
    ],
  },
  cableTypes: {
    resource: "cableTypes",
    label: "Cable Type",
    keyField: "cable_type_name",
    fields: [
      {
        key: "cable_type_name",
        label: "Cable Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Single-mode (SM)",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Cable Type Name wajib diisi" : null),
      },
      {
        key: "cable_type_code",
        label: "Cable Type Code",
        type: "text",
        placeholder: "Contoh: SM",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "cable_role",
        label: "Cable Role",
        type: "combobox",
        options: [
          { value: "feeder", label: "feeder" },
          { value: "distribution", label: "distribution" },
          { value: "branch", label: "branch" },
          { value: "drop", label: "drop" },
        ],
      },
      {
        key: "core_count",
        label: "Core Count",
        type: "number",
        placeholder: "Contoh: 24",
        validate: (v) => (v.trim() && (isNaN(Number(v)) || Number(v) <= 0) ? "Harus integer > 0" : null),
      },
      {
        key: "attenuation_1310_db_per_km",
        label: "Attenuation 1310 (dB/km)",
        type: "number",
        placeholder: "0.35",
        validate: (v) => (v.trim() && (isNaN(Number(v)) || Number(v) < 0) ? "Harus angka >= 0" : null),
      },
      {
        key: "attenuation_1490_db_per_km",
        label: "Attenuation 1490 (dB/km)",
        type: "number",
        placeholder: "0.25",
        validate: (v) => (v.trim() && (isNaN(Number(v)) || Number(v) < 0) ? "Harus angka >= 0" : null),
      },
      {
        key: "attenuation_1550_db_per_km",
        label: "Attenuation 1550 (dB/km)",
        type: "number",
        placeholder: "0.25",
        validate: (v) => (v.trim() && (isNaN(Number(v)) || Number(v) < 0) ? "Harus angka >= 0" : null),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi tipe kabel",
      },
      {
        key: "sort_order",
        label: "Sort Order",
        type: "number",
        placeholder: "0",
        validate: (v) => (v.trim() && isNaN(Number(v)) ? "Harus berupa angka" : null),
      },
    ],
  },
  coreCapacities: {
    resource: "coreCapacities",
    label: "Core Capacity Cable",
    keyField: "label",
    fields: [
      {
        key: "core_capacity_value",
        label: "Core Capacity Value",
        type: "number",
        required: true,
        placeholder: "Contoh: 96",
        validate: (v) =>
          !v.trim()
            ? "Core Capacity Value wajib diisi"
            : isNaN(Number(v)) || Number(v) <= 0
            ? "Harus integer > 0"
            : null,
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        required: true,
        placeholder: "Contoh: 96 Cores",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Label wajib diisi" : null),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi kapasitas core",
      },
      {
        key: "allowed_route_type_keys",
        label: "Route Types",
        type: "checkbox-group",
        options: [
          { value: "BACKBONE", label: "BACKBONE" },
          { value: "FEEDER", label: "FEEDER" },
          { value: "DISTRIBUTION", label: "DISTRIBUTION" },
          { value: "ACCESS", label: "ACCESS" },
          { value: "DROP", label: "DROP" },
        ],
        helpText: "Centang semua = ALL. Kosongkan semua = NONE.",
      },
      {
        key: "sort_order",
        label: "Sort Order",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  deviceCoreCapacities: {
    resource: "deviceCoreCapacities",
    label: "Core Capacity Passive Device",
    keyField: "label",
    fields: [
      {
        key: "core_capacity_value",
        label: "Core Capacity Value",
        type: "number",
        required: true,
        placeholder: "Contoh: 48",
        validate: (v) =>
          !v.trim()
            ? "Core Capacity Value wajib diisi"
            : isNaN(Number(v)) || Number(v) <= 0
            ? "Harus integer > 0"
            : null,
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        required: true,
        placeholder: "Contoh: 48 Cores",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Label wajib diisi" : null),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi kapasitas core",
      },
      {
        key: "allowed_device_type_keys",
        label: "Device Types",
        type: "checkbox-group",
        options: [
          { value: "OTB", label: "OTB" },
          { value: "ODC", label: "ODC" },
          { value: "JC", label: "JC" },
        ],
        helpText: "Kosongkan = berlaku untuk semua.",
      },
      {
        key: "sort_order",
        label: "Sort Order",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  odpTypes: {
    resource: "odpTypes",
    label: "ODP Type",
    keyField: "odp_type_name",
    fields: [
      {
        key: "odp_type_name",
        label: "ODP Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: ODP PB",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "ODP Type Name wajib diisi" : null),
      },
      {
        key: "odp_type_code",
        label: "ODP Type Code",
        type: "text",
        placeholder: "Contoh: ODP_PB",
        transform: (v) => v.toUpperCase(),
      },
    ],
  },
  installationTypes: {
    resource: "installationTypes",
    label: "Installation Type",
    keyField: "installation_type_name",
    fields: [
      {
        key: "installation_type_name",
        label: "Installation Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Aerial",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Installation Type Name wajib diisi" : null),
      },
      {
        key: "installation_type_code",
        label: "Installation Type Code",
        type: "text",
        placeholder: "Contoh: AERIAL",
        transform: (v) => v.toUpperCase(),
      },
    ],
  },
  serviceTypes: {
    resource: "serviceTypes",
    label: "Service Type",
    keyField: "service_type_name",
    fields: [
      {
        key: "service_type_name",
        label: "Service Type Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Internet",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Service Type Name wajib diisi" : null),
      },
      {
        key: "service_type_code",
        label: "Service Type Code",
        type: "text",
        placeholder: "Contoh: INTERNET",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi jenis layanan",
      },
      {
        key: "sort_order",
        label: "Sort Order",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  tenants: {
    resource: "tenants",
    label: "Tenant",
    keyField: "tenant_name",
    fields: [
      {
        key: "tenant_name",
        label: "Tenant Name",
        type: "text",
        required: true,
        placeholder: "Contoh: FiberPro",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Tenant Name wajib diisi" : null),
      },
      {
        key: "tenant_code",
        label: "Tenant Code",
        type: "text",
        placeholder: "Contoh: FIBERPRO",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Deskripsi tenant",
      },
      {
        key: "sort_order",
        label: "Sort Order",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  manufacturers: {
    resource: "manufacturers",
    label: "Manufacturer",
    keyField: "manufacturer_name",
    fields: [
      {
        key: "manufacturer_name",
        label: "Manufacturer Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Huawei",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Manufacturer Name wajib diisi" : null),
      },
      {
        key: "manufacturer_code",
        label: "Manufacturer Code",
        type: "text",
        placeholder: "Contoh: HUAWEI",
        transform: (v) => v.toUpperCase(),
      },
    ],
  },
  brands: {
    resource: "brands",
    label: "Brand",
    keyField: "brand_name",
    fields: [
      {
        key: "brand_name",
        label: "Brand Name",
        type: "text",
        required: true,
        placeholder: "Contoh: MA5800",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Brand Name wajib diisi" : null),
      },
      {
        key: "brand_code",
        label: "Brand Code",
        type: "text",
        placeholder: "Contoh: MA5800",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "manufacturer_id",
        label: "Manufacturer",
        type: "combobox",
        lookupType: "manufacturers",
      },
    ],
  },
  assetModels: {
    resource: "assetModels",
    label: "Model",
    keyField: "model_name",
    fields: [
      {
        key: "model_name",
        label: "Model Name",
        type: "text",
        required: true,
        placeholder: "Contoh: MA5800-X17",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Model Name wajib diisi" : null),
      },
      {
        key: "model_code",
        label: "Model Code",
        type: "text",
        placeholder: "Contoh: MA5800X17",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "brand_id",
        label: "Brand",
        type: "combobox",
        lookupType: "brands",
      },
      {
        key: "manufacturer_id",
        label: "Manufacturer",
        type: "combobox",
        lookupType: "manufacturers",
      },
      {
        key: "asset_type_id",
        label: "Asset Type",
        type: "combobox",
        lookupType: "assetTypes",
      },
    ],
  },
  splitterProfiles: {
    resource: "splitterProfiles",
    label: "Splitter Profile",
    keyField: "ratio_label",
    fields: [
      {
        key: "ratio_label",
        label: "Ratio Label",
        type: "text",
        required: true,
        placeholder: "Contoh: 1:8",
        isKeyField: true,
        validate: (v) =>
          !v.trim()
            ? "Ratio Label wajib diisi (contoh: 1:8)"
            : !/^\d+:\d+$/.test(v.trim())
            ? "Format ratio harus N:M (contoh: 1:8, 2:32)"
            : null,
      },
      {
        key: "input_port_count",
        label: "Input Port Count",
        type: "number",
        required: true,
        placeholder: "Contoh: 1",
        validate: (v) =>
          !v.trim()
            ? "Input Port Count wajib diisi"
            : isNaN(Number(v)) || Number(v) < 1
            ? "Harus integer >= 1"
            : null,
      },
      {
        key: "output_port_count",
        label: "Output Port Count",
        type: "number",
        required: true,
        placeholder: "Contoh: 8",
        validate: (v) =>
          !v.trim()
            ? "Output Port Count wajib diisi"
            : isNaN(Number(v)) || Number(v) < 2
            ? "Harus integer >= 2"
            : null,
      },
      {
        key: "expected_loss_db",
        label: "Expected Loss (dB)",
        type: "number",
        placeholder: "Contoh: 10.5",
        validate: (v) => (v.trim() && isNaN(Number(v)) ? "Harus berupa angka valid" : null),
      },
      {
        key: "allowed_device_type_keys",
        label: "Device Types",
        type: "checkbox-group",
        options: [{ value: "ODC", label: "ODC" }],
        helpText: "Pilih tipe perangkat yang diizinkan menggunakan splitter ratio ini.",
      },
      {
        key: "notes",
        label: "Notes",
        type: "text",
        placeholder: "Catatan splitter profile",
      },
    ],
  },
  provinces: {
    resource: "provinces",
    label: "Province",
    keyField: "province_name",
    fields: [
      {
        key: "province_name",
        label: "Province Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Banten",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "Province Name wajib diisi" : null),
      },
    ],
  },
  cities: {
    resource: "cities",
    label: "City",
    keyField: "city_name",
    fields: [
      {
        key: "city_name",
        label: "City Name",
        type: "text",
        required: true,
        placeholder: "Contoh: Kota Serang",
        isKeyField: true,
        validate: (v) => (!v.trim() ? "City Name wajib diisi" : null),
      },
      {
        key: "city_code",
        label: "City Code",
        type: "text",
        placeholder: "Contoh: SERANG",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "province_id",
        label: "Province",
        type: "combobox",
        lookupType: "provinces",
      },
    ],
  },
};
