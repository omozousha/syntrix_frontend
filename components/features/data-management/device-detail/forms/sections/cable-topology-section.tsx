import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
  toRouteOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";

export function CableTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Kabel">
      <ComboboxField
        label="From Device"
        value={props.form.from_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari device asal..."
        options={toDeviceOptions(lookup.devices || [], "Pilih device asal")}
      />
      <ComboboxField
        label="From Port"
        value={props.form.from_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari port asal..."
        options={[
          { value: "__none__", label: "Pilih port asal" },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="To Device"
        value={props.form.to_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari device tujuan..."
        options={toDeviceOptions(lookup.devices || [], "Pilih device tujuan")}
      />
      <ComboboxField
        label="To Port"
        value={props.form.to_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari port tujuan..."
        options={[
          { value: "__none__", label: "Pilih port tujuan" },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="Route"
        value={props.form.route_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, route_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari route..."
        options={toRouteOptions(lookup.routes || [], "Pilih route")}
      />
    </TopologyCard>
  );
}
