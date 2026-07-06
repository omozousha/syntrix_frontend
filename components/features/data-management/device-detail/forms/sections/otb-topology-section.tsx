import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import {
  ComboboxField,
  SelectField,
} from "../../sections/device-technical-helpers";

export function OtbTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Topologi OTB">
      <ComboboxField
        label="From Device"
        value={props.form.from_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari device upstream..."
        options={toDeviceOptions(lookup.devices || [], "Pilih from device")}
      />
      <ComboboxField
        label="To Device"
        value={props.form.to_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari device downstream..."
        options={toDeviceOptions(lookup.devices || [], "Pilih to device")}
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
      <SelectField
        label="Koneksi Backbone"
        value={props.form.is_backbone_connection || "false"}
        options={["false", "true"]}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, is_backbone_connection: value }))
        }
        disabled={!props.editing}
        compact
      />
    </TopologyCard>
  );
}
