import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";

export function OntTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Topologi ONT">
      <ComboboxField
        label="Source ODP"
        value={props.form.source_odp_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odp_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari source ODP..."
        options={toDeviceOptions(lookup.devices || [], "Pilih source ODP")}
      />
      <ComboboxField
        label="ODP Port"
        value={props.form.source_odp_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odp_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari port ODP..."
        options={[
          { value: "__none__", label: "Pilih port ODP" },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="Source OLT"
        value={props.form.source_olt_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_olt_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari source OLT..."
        options={toDeviceOptions(lookup.devices || [], "Pilih source OLT")}
      />
    </TopologyCard>
  );
}
