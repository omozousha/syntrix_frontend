"use client";

import { DeviceCreateForm } from "@/components/features/data-management/device-form/device-create-form";
import { DeviceHardwareFields } from "@/components/features/data-management/device-form/device-hardware-fields";
import { FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PopOption = { id: string; pop_name: string; pop_code: string; region_id: string };
type ProjectOption = { id: string; project_name: string; project_code?: string | null; region_id?: string | null; pop_id?: string | null };
type OdpTypeOption = { id: string; odp_type_name: string; odp_type_code?: string | null };
type InstallationTypeOption = { id: string; installation_type_name: string; installation_type_code?: string | null };
type ManufacturerOption = { id: string; manufacturer_name: string; manufacturer_code?: string | null };
type BrandOption = { id: string; brand_name: string; brand_code?: string | null; manufacturer_id?: string | null };
type AssetModelOption = { id: string; model_name: string; model_code?: string | null; brand_id?: string | null; manufacturer_id?: string | null };
type TenantOption = { id: string; tenant_name: string; tenant_code?: string | null };
type RouteTypeOption = { id: string; route_type_name: string; route_type_code?: string | null };
type CableTypeOption = { id: string; cable_type_code: string; cable_type_name: string };
type TopologyDeviceOption = { id: string; device_name: string; device_type_key: string };
type TopologyPortOption = { id: string; port_label?: string | null; port_index: number; status: string };
type CableConnectionDraft = { route_type: string; cable_type: string; cable_length_m: string; route_name: string };

export type OdcCreateFormValues = {
  device_type_key: string;
  device_name: string;
  odp_type: string;
  installation_type: string;
  pop_id: string;
  region_id: string;
  tenant_id: string;
  project_id: string;
  manufacturer_id: string;
  brand_id: string;
  model_id: string;
  serial_number: string;
  front_device_id: string;
  front_port_id: string;
  rear_device_id: string;
  rear_port_id: string;
};

export function OdcDeviceCreate({
  values,
  pops,
  odpTypes,
  installationTypes,
  tenants,
  projects,
  routeTypes,
  cableTypes = [],
  manufacturers,
  brands,
  assetModels,
  topologyFrontDevices = [],
  topologyRearDevices = [],
  frontDevicePorts = [],
  rearDevicePorts = [],
  loadingTopology = false,
  cableConnections = [],
  onCableConnectionsChange,
  onChange,
  onPopChange,
}: {
  values: OdcCreateFormValues;
  pops: PopOption[];
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  tenants: TenantOption[];
  projects: ProjectOption[];
  routeTypes: RouteTypeOption[];
  cableTypes?: CableTypeOption[];
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  topologyFrontDevices?: TopologyDeviceOption[];
  topologyRearDevices?: TopologyDeviceOption[];
  frontDevicePorts?: TopologyPortOption[];
  rearDevicePorts?: TopologyPortOption[];
  loadingTopology?: boolean;
  cableConnections?: CableConnectionDraft[];
  onCableConnectionsChange?: (next: CableConnectionDraft[]) => void;
  onChange: (patch: Record<string, string>) => void;
  onPopChange: (popId: string) => void;
}) {
  return (
    <>
      <DeviceCreateForm
        values={values}
        pops={pops}
        odpTypes={odpTypes}
        installationTypes={installationTypes}
        tenants={tenants}
        projects={projects}
        onChange={onChange}
        onPopChange={onPopChange}
      />

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Relasi Topologi
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Front Port (OTB)" tooltip="Pilih perangkat OTB di POP yang sama sebagai sumber koneksi hulu (feeder)." />
        <Combobox
          value={values.front_device_id || "__none__"}
          onValueChange={(v) => {
            const deviceId = v === "__none__" ? "" : v;
            onChange({ front_device_id: deviceId, front_port_id: "" });
          }}
          options={[
            { value: "__none__", label: values.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu" },
            ...topologyFrontDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
          ]}
          placeholder={values.pop_id ? "Pilih OTB hulu" : "Pilih POP terlebih dahulu"}
          searchPlaceholder="Cari OTB hulu..."
          disabled={loadingTopology || values.pop_id === ""}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Port OTB" tooltip="Pilih port idle dari OTB yang terpilih." />
        <Combobox
          value={values.front_port_id || "__none__"}
          onValueChange={(v) => onChange({ front_port_id: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: values.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu" },
            ...frontDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
          ]}
          placeholder={values.front_device_id ? "Pilih port OTB" : "Pilih OTB terlebih dahulu"}
          searchPlaceholder="Cari port OTB..."
          disabled={!values.front_device_id}
        />
      </div>

      <div className="col-span-full space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
          <span>Kabel Distribusi</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCableConnectionsChange?.([...(cableConnections || []), { route_type: "", cable_type: "", cable_length_m: "", route_name: "" }])}
          >
            + Tambah Kabel
          </Button>
        </div>
        {(cableConnections || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada kabel distribusi. Klik "Tambah Kabel" untuk menambahkan.</p>
        ) : (
          <div className="space-y-2">
            {(cableConnections || []).map((conn, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 rounded-md border bg-muted/20 p-2 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Route Type</label>
                  <Combobox
                    value={conn.route_type || "__none__"}
                    onValueChange={(v) => onCableConnectionsChange?.((cableConnections || []).map((item, i) => i === idx ? { ...item, route_type: v === "__none__" ? "" : v } : item))}
                    options={[
                      { value: "__none__", label: "Pilih route type" },
                      ...routeTypes.map((rt) => ({ value: rt.route_type_name, label: rt.route_type_name })),
                    ]}
                    placeholder="Pilih route type"
                    searchPlaceholder="Cari route type..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Cable Type</label>
                  <Combobox
                    value={conn.cable_type || "__none__"}
                    onValueChange={(v) => onCableConnectionsChange?.((cableConnections || []).map((item, i) => i === idx ? { ...item, cable_type: v === "__none__" ? "" : v } : item))}
                    options={[
                      { value: "__none__", label: "Pilih cable type" },
                      ...cableTypes.map((ct) => ({ value: ct.cable_type_name, label: ct.cable_type_name })),
                    ]}
                    placeholder="Pilih cable type"
                    searchPlaceholder="Cari cable type..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Panjang (m)</label>
                  <Input
                    type="number"
                    value={conn.cable_length_m}
                    onChange={(e) => onCableConnectionsChange?.((cableConnections || []).map((item, i) => i === idx ? { ...item, cable_length_m: e.target.value } : item))}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Nama Rute</label>
                  <div className="flex gap-1">
                    <Input
                      value={conn.route_name}
                      onChange={(e) => onCableConnectionsChange?.((cableConnections || []).map((item, i) => i === idx ? { ...item, route_name: e.target.value } : item))}
                      placeholder="Nama rute"
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => onCableConnectionsChange?.((cableConnections || []).filter((_, i) => i !== idx))}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Rear Port (ODP, opsional)" tooltip="Pilih perangkat ODP di POP yang sama sebagai tujuan koneksi hilir. Detail relasi bisa diatur di detail device ODC." />
        <Combobox
          value={values.rear_device_id || "__none__"}
          onValueChange={(v) => {
            const deviceId = v === "__none__" ? "" : v;
            onChange({ rear_device_id: deviceId, rear_port_id: "" });
          }}
          options={[
            { value: "__none__", label: values.pop_id ? "Pilih ODP hilir (opsional)" : "Pilih POP terlebih dahulu" },
            ...topologyRearDevices.map((d) => ({ value: d.id, label: `${d.device_name} (${d.device_type_key})` })),
          ]}
          placeholder={values.pop_id ? "Pilih ODP hilir" : "Pilih POP terlebih dahulu"}
          searchPlaceholder="Cari ODP hilir..."
          disabled={loadingTopology || values.pop_id === ""}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel label="Port ODP (opsional)" tooltip="Pilih port idle dari ODP yang terpilih." />
        <Combobox
          value={values.rear_port_id || "__none__"}
          onValueChange={(v) => onChange({ rear_port_id: v === "__none__" ? "" : v })}
          options={[
            { value: "__none__", label: values.rear_device_id ? "Pilih port ODP (opsional)" : "Pilih ODP terlebih dahulu" },
            ...rearDevicePorts.map((port) => ({ value: port.id, label: port.port_label || `Port #${port.port_index}` })),
          ]}
          placeholder={values.rear_device_id ? "Pilih port ODP" : "Pilih ODP terlebih dahulu"}
          searchPlaceholder="Cari port ODP..."
          disabled={!values.rear_device_id}
        />
      </div>

      <div className="col-span-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground rounded-md border bg-muted/40 px-3 py-1.5">
        Identitas Perangkat
      </div>

      <DeviceHardwareFields
        values={{
          manufacturer_id: values.manufacturer_id,
          brand_id: values.brand_id,
          model_id: values.model_id,
          serial_number: values.serial_number,
        }}
        manufacturers={manufacturers}
        brands={brands}
        assetModels={assetModels}
        onChange={onChange}
      />
    </>
  );
}
