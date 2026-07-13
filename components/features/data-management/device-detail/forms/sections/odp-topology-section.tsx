import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
  toCustomerOptions,
} from "../../sections/device-topology-helpers";
import {
  Field,
  ComboboxField,
} from "../../sections/device-technical-helpers";

export function OdpTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};
  const allDevices = lookup.devices || [];

  // Find selected ODC to derive its region_id for feeder cable filtering
  const selectedOdc = allDevices.find(
    (d) => d.id === props.form.source_odc_id && d.device_type_key === "ODC",
  );
  const selectedOdcRegion = selectedOdc?.region_id || null;

  const odcOptions = toDeviceOptions(
    allDevices.filter((d) => d.device_type_key === "ODC"),
    "Pilih ODC sumber",
  );

  const distributionCableOptions = toDeviceOptions(
    allDevices.filter(
      (d) =>
        d.device_type_key === "CABLE" &&
        (!d.route_type || d.route_type === "DISTRIBUTION") &&
        (selectedOdcRegion === null || d.region_id === selectedOdcRegion),
    ),
    "Pilih cable distribusi",
  );

  return (
    <TopologyCard title="Relasi Topologi ODP">
      <ComboboxField
        label="Source ODC"
        value={props.form.source_odc_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odc_id: value === "__none__" ? "" : value, source_odc_port_id: "" }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari ODC sumber..."
        options={odcOptions}
      />
      <ComboboxField
        label="ODC Port"
        value={props.form.source_odc_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odc_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari port ODC..."
        options={[
          { value: "__none__", label: "Pilih port ODC" },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="Cable Distribusi"
        value={props.form.feeder_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, feeder_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari cable distribusi..."
        options={distributionCableOptions}
      />
      <Field
        label="Distribution Core Start"
        type="number"
        value={props.form.feeder_core_start}
        onChange={(value) => props.onChange((prev) => ({ ...prev, feeder_core_start: value }))}
        disabled={!props.editing}
        compact
      />
      <Field
        label="Distribution Core End"
        type="number"
        value={props.form.feeder_core_end}
        onChange={(value) => props.onChange((prev) => ({ ...prev, feeder_core_end: value }))}
        disabled={!props.editing}
        compact
      />
      <ComboboxField
        label="Customer"
        value={props.form.odp_customer_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, odp_customer_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari customer..."
        options={toCustomerOptions(lookup.customers || [], "Pilih customer")}
      />
    </TopologyCard>
  );
}
