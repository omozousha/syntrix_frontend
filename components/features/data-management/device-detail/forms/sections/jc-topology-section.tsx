import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import {
  Field,
  ComboboxField,
} from "../../sections/device-technical-helpers";

export function JcTopologySection(props: TopologySectionProps) {
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title="Relasi Joint Closure">
      <ComboboxField
        label="From Cable"
        value={props.form.from_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari cable segmen A..."
        options={toDeviceOptions(lookup.devices || [], "Pilih from cable")}
      />
      <ComboboxField
        label="To Cable"
        value={props.form.to_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder="Cari cable segmen B..."
        options={toDeviceOptions(lookup.devices || [], "Pilih to cable")}
      />
      <Field
        label="Core Start"
        type="number"
        value={props.form.core_start}
        onChange={(value) => props.onChange((prev) => ({ ...prev, core_start: value }))}
        disabled={!props.editing}
        compact
      />
      <Field
        label="Core End"
        type="number"
        value={props.form.core_end}
        onChange={(value) => props.onChange((prev) => ({ ...prev, core_end: value }))}
        disabled={!props.editing}
        compact
      />
      <Field
        label="Splice Tray Count"
        type="number"
        value={props.form.splice_tray_count}
        onChange={(value) => props.onChange((prev) => ({ ...prev, splice_tray_count: value }))}
        disabled={!props.editing}
        compact
      />
    </TopologyCard>
  );
}
