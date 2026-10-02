import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import {
  Field,
  ComboboxField,
} from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function JcTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleJc")}>
      <ComboboxField
        label="From Cable"
        value={props.form.from_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchCableSegA")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectFromCable"), t)}
      />
      <ComboboxField
        label="To Cable"
        value={props.form.to_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchCableSegB")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectToCable"), t)}
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
