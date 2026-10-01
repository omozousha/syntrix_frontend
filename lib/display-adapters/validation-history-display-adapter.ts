import { valueText } from "@/lib/domain-formatters";
import { getPopLabel } from "@/lib/relation-labels";
import type { TFn } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

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
  t?: TFn,
) {
  const row = validation || {};
  const T: TFn = t ?? ((key: MessageKey) => key);
  return [
    { label: T("odpIdentity.date"), value: formatDate(valueText(row.validation_date, "")) },
    { label: T("odpIdentity.inventory"), value: valueText(row.inventory_id) },
    { label: T("odpIdentity.oldName"), value: valueText(row.old_device_name) },
    { label: T("odpIdentity.newName"), value: valueText(row.new_device_name) },
    { label: T("odpIdentity.pop"), value: getPopLabel({ fallback: row.pop_name, optional: true }) },
    { label: T("odpIdentity.odpType"), value: valueText(row.odp_type) },
    { label: T("odpIdentity.installation"), value: valueText(row.installation_type) },
    { label: T("odpIdentity.splitter"), value: valueText(row.splitter_ratio) },
    { label: T("odpIdentity.capacity"), value: valueText(row.total_ports) },
    { label: T("odpIdentity.longitude"), value: valueText(row.longitude) },
    { label: T("odpIdentity.latitude"), value: valueText(row.latitude) },
  ];
}
