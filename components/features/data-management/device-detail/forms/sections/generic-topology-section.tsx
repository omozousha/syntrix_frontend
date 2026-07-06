import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";

export function GenericTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Topologi">
      <ComboboxField
        label="Uplink Device"
        value={props.form.uplink_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari uplink device..."
        options={toDeviceOptions(lookup.devices || [], "Pilih uplink device")}
      />
      <ComboboxField
        label="From Cable"
        value={props.form.from_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari cable masuk..."
        options={toDeviceOptions(lookup.devices || [], "Pilih from cable")}
      />
      <ComboboxField
        label="To Cable"
        value={props.form.to_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari cable keluar..."
        options={toDeviceOptions(lookup.devices || [], "Pilih to cable")}
      />
    </TopologyCard>
  );
}
