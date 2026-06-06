import { valueText } from "@/lib/domain-formatters";
import { getPopLabel } from "@/lib/relation-labels";

type OdpFieldValidationPayload = {
  validation_date?: string | null;
  inventory_id?: string | null;
  old_device_name?: string | null;
  new_device_name?: string | null;
  pop_name?: string | null;
  longitude?: string | number | null;
  latitude?: string | number | null;
  odp_type?: string | null;
  installation_type?: string | null;
  splitter_ratio?: string | null;
  total_ports?: number | null;
};

export function buildOdpValidationIdentityFields(
  validation: OdpFieldValidationPayload | null | undefined,
  formatDate: (value: string) => string,
) {
  const row = validation || {};
  return [
    { label: "Tanggal", value: formatDate(valueText(row.validation_date, "")) },
    { label: "Inventory", value: valueText(row.inventory_id) },
    { label: "Nama Lama", value: valueText(row.old_device_name) },
    { label: "Nama Baru", value: valueText(row.new_device_name) },
    { label: "POP", value: getPopLabel({ fallback: row.pop_name, optional: true }) },
    { label: "Tipe ODP", value: valueText(row.odp_type) },
    { label: "Instalasi", value: valueText(row.installation_type) },
    { label: "Splitter", value: valueText(row.splitter_ratio) },
    { label: "Kapasitas", value: valueText(row.total_ports) },
    { label: "Longitude", value: valueText(row.longitude) },
    { label: "Latitude", value: valueText(row.latitude) },
  ];
}
