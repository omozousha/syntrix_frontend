import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";

export function OltTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Topologi OLT">
      <ComboboxField
        label="Uplink Switch"
        value={props.form.uplink_switch_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_switch_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari switch uplink..."
        options={toDeviceOptions(lookup.devices || [], "Pilih uplink switch")}
      />
      <ComboboxField
        label="Uplink Router"
        value={props.form.uplink_router_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_router_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari router uplink..."
        options={toDeviceOptions(lookup.devices || [], "Pilih uplink router")}
      />
    </TopologyCard>
  );
}
